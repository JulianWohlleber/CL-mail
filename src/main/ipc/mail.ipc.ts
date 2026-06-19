import { ipcMain, shell, dialog } from 'electron'
import Database from 'better-sqlite3'
import { IPC } from '@shared/ipc-channels'
import { SmtpClient, Outbox, type OutgoingMessage } from '../services/send/smtp-client'
import { VaultSync } from '../services/vault/vault-sync'
import { KeychainService } from '../services/credentials/keychain'
import { services } from '../services/registry'
import { parseSearchQuery } from '../services/search/parse-query'
import { randomUUID } from 'crypto'
import { copyFileSync, existsSync, writeFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

// Convert snake_case DB rows to camelCase for the renderer
function toCamel(row: any): any {
  if (!row) return row
  const out: any = {}
  for (const [key, val] of Object.entries(row)) {
    const camel = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
    out[camel] = val
  }
  return out
}

function toCamelArray(rows: any[]): any[] {
  return rows.map(toCamel)
}

export function registerMailHandlers(db: Database.Database): void {
  const outbox = new Outbox(5)
  const smtpClients: Map<string, SmtpClient> = new Map()
  const vaultSync = new VaultSync(db)
  const keychain = new KeychainService(db)

  // Re-export a single thread's markdown after a state change. Quiet-fails so
  // a vault problem can never break a mail action.
  const refreshVault = (threadId: string): void => {
    try { vaultSync.syncThread(threadId) } catch (e) { console.warn('[Vault] refresh failed:', (e as Error).message) }
  }

  /**
   * Move every message in a thread on the IMAP server from its current folder
   * to a target folder. Fires-and-forgets — local DB has already been updated
   * by the caller, so an IMAP error is logged but doesn't fail the action.
   * Without this step the next sync would re-pull the message into INBOX and
   * undo the user's archive/trash/move.
   */
  const imapMoveThread = (accountId: string, msgs: Array<{ uid: number; oldFolder: string }>, toFolder: string): void => {
    const sm = services.getSyncManager()
    if (!sm) {
      console.warn('[Mail] No sync manager available — server move skipped')
      return
    }
    const client = sm.getClient(accountId)
    if (!client) {
      console.warn('[Mail] No IMAP client for account, server move skipped:', accountId)
      return
    }
    // Group UIDs by their old folder path so we move with a single IMAP call per folder.
    const grouped = new Map<string, number[]>()
    for (const m of msgs) {
      if (!m.oldFolder || m.oldFolder === toFolder) continue
      const arr = grouped.get(m.oldFolder) || []
      arr.push(m.uid)
      grouped.set(m.oldFolder, arr)
    }
    ;(async () => {
      for (const [from, uids] of grouped) {
        for (const uid of uids) {
          try {
            await client.moveMessage(uid, from, toFolder)
          } catch (err) {
            console.warn(`[Mail] IMAP move failed (uid=${uid} ${from}→${toFolder}):`, (err as Error).message)
          }
        }
      }
    })()
  }

  /** Resolve folder rows (account_id, name, imap_path) for a thread's messages. */
  const threadMessageLocations = (threadId: string): { accountId: string; messages: Array<{ uid: number; oldFolder: string }> } | null => {
    const rows = db.prepare(`
      SELECT m.uid, m.account_id, f.imap_path AS old_folder
      FROM messages m
      JOIN folders f ON f.id = m.folder_id
      WHERE m.thread_id = ?
    `).all(threadId) as Array<{ uid: number; account_id: string; old_folder: string }>
    if (rows.length === 0) return null
    return {
      accountId: rows[0].account_id,
      messages: rows.map((r) => ({ uid: r.uid, oldFolder: r.old_folder }))
    }
  }

  function getSmtpClient(accountId: string): SmtpClient {
    let client = smtpClients.get(accountId)
    if (!client) {
      const account = db.prepare('SELECT * FROM accounts WHERE id = ?').get(accountId) as any
      if (!account) throw new Error('Account not found')

      // Route through the keychain so the password is DECRYPTED. Reading the
      // settings row directly returns base64 ciphertext on any machine where
      // Electron's safeStorage is available — which broke all outbound mail.
      // (Mirrors SyncManager.getAuth, which always used the keychain.)
      const password = keychain.retrieve(accountId)

      client = new SmtpClient({
        host: account.smtp_host,
        port: account.smtp_port,
        secure: account.smtp_port === 465,
        auth: { user: account.email, pass: password || '' }
      })
      smtpClients.set(accountId, client)
    }
    return client
  }

  // List folders
  ipcMain.handle(IPC.FOLDERS_LIST, (_event, accountId?: string) => {
    if (accountId) {
      return toCamelArray(db.prepare('SELECT * FROM folders WHERE account_id = ? ORDER BY role, name').all(accountId))
    }
    return toCamelArray(db.prepare('SELECT * FROM folders ORDER BY account_id, role, name').all())
  })

  ipcMain.handle(IPC.FOLDERS_COUNTS, () => {
    return db.prepare(`
      SELECT folder_id, COUNT(*) as total, SUM(unread) as unread
      FROM messages GROUP BY folder_id
    `).all()
  })

  // List threads
  ipcMain.handle(IPC.MAIL_LIST, (_event, options: any = {}) => {
    // `answered_by_me` is true if any message in the thread was sent FROM
    // the account's own address — a much clearer signal than just "the
    // thread has > 1 message", which also fires for forwarded chains the
    // user never touched.
    let query = `
      SELECT t.*,
        EXISTS (
          SELECT 1 FROM messages m
          JOIN accounts a ON a.id = t.account_id
          WHERE m.thread_id = t.id
            AND LOWER(m.from_address) = LOWER(a.email)
        ) AS answered_by_me
      FROM threads t
      WHERE 1=1
    `
    const params: any[] = []

    if (options.accountId) {
      query += ' AND t.account_id = ?'
      params.push(options.accountId)
    }
    // Cross-account unified inbox: any thread whose folder_id points at a
    // folder with role='inbox' on any enabled account.
    if (options.allInboxes) {
      query += ` AND t.folder_id IN (
        SELECT f.id FROM folders f
        JOIN accounts a ON a.id = f.account_id
        WHERE f.role = 'inbox' AND a.enabled = 1
      )`
    } else if (options.searchText) {
      // Sprint #6 — parse user-friendly operators (from:, subject:, has:…)
      // into structured filters + an FTS expression. Search is global across
      // accounts; we deliberately don't filter by folderId.
      const parsed = parseSearchQuery(options.searchText)
      if (parsed.fts) {
        query += ` AND t.id IN (
          SELECT DISTINCT m.thread_id
          FROM messages_fts
          JOIN messages m ON messages_fts.rowid = m.rowid
          WHERE messages_fts MATCH ?
        )`
        params.push(parsed.fts)
      }
      if (parsed.hasAttachment) query += ' AND t.has_attachments = 1'
      if (parsed.unread === true) query += ' AND t.unread = 1'
      if (parsed.unread === false) query += ' AND t.unread = 0'
      if (parsed.starred) query += ' AND t.starred = 1'
    } else if (options.folderId) {
      query += ' AND t.folder_id = ?'
      params.push(options.folderId)
    }
    if (options.unreadOnly) {
      query += ' AND t.unread = 1'
    }
    if (options.starredOnly) {
      query += ' AND t.starred = 1'
    }

    query += ' ORDER BY t.last_message_date DESC'
    query += ` LIMIT ? OFFSET ?`
    params.push(options.limit || 50, options.offset || 0)

    const rows = toCamelArray(db.prepare(query).all(...params))
    // Parse JSON fields
    for (const row of rows) {
      row.participants = JSON.parse(row.participants || '[]')
      row.labels = JSON.parse(row.labels || '[]')
      row.answeredByMe = !!row.answeredByMe
    }
    return rows
  })

  // Get single message
  ipcMain.handle(IPC.MAIL_GET, (_event, messageId: string) => {
    const msg = db.prepare('SELECT * FROM messages WHERE id = ?').get(messageId) as any
    if (!msg) return null
    const camel = toCamel(msg)
    // Parse JSON fields
    camel.to = JSON.parse(msg.to_list || '[]')
    camel.cc = JSON.parse(msg.cc_list || '[]')
    camel.bcc = JSON.parse(msg.bcc_list || '[]')
    camel.from = { name: msg.from_name, address: msg.from_address }
    camel.references = JSON.parse(msg.refs || '[]')
    camel.flags = JSON.parse(msg.flags || '[]')
    return camel
  })

  // Get thread with messages
  ipcMain.handle(IPC.MAIL_GET_THREAD, (_event, threadId: string) => {
    const thread = toCamel(db.prepare('SELECT * FROM threads WHERE id = ?').get(threadId))
    if (!thread) return null

    const rawMessages = db
      .prepare('SELECT * FROM messages WHERE thread_id = ? ORDER BY date ASC')
      .all(threadId) as any[]

    const messages = rawMessages.map((msg) => {
      const camel = toCamel(msg)
      camel.to = JSON.parse(msg.to_list || '[]')
      camel.cc = JSON.parse(msg.cc_list || '[]')
      camel.bcc = JSON.parse(msg.bcc_list || '[]')
      camel.from = { name: msg.from_name, address: msg.from_address }
      camel.references = JSON.parse(msg.refs || '[]')
      camel.flags = JSON.parse(msg.flags || '[]')
      return camel
    })

    const attachments = toCamelArray(db
      .prepare(`
        SELECT a.* FROM attachments a
        JOIN messages m ON a.message_id = m.id
        WHERE m.thread_id = ?
      `)
      .all(threadId))

    // Nest attachments into their respective messages
    for (const msg of messages) {
      msg.attachments = attachments.filter((a: any) => a.messageId === msg.id)
    }

    // Parse thread JSON fields
    thread.participants = JSON.parse(thread.participants || '[]')
    thread.labels = JSON.parse(thread.labels || '[]')

    return { ...thread, messages, attachments }
  })

  // Mark read/unread
  ipcMain.handle(IPC.MAIL_MARK_READ, (_event, threadId: string) => {
    db.prepare('UPDATE messages SET unread = 0 WHERE thread_id = ?').run(threadId)
    db.prepare('UPDATE threads SET unread = 0 WHERE id = ?').run(threadId)
    refreshVault(threadId)
    return { success: true }
  })

  ipcMain.handle(IPC.MAIL_MARK_UNREAD, (_event, threadId: string) => {
    db.prepare('UPDATE messages SET unread = 1 WHERE thread_id = ?').run(threadId)
    db.prepare('UPDATE threads SET unread = 1 WHERE id = ?').run(threadId)
    refreshVault(threadId)
    return { success: true }
  })

  // Star/unstar
  ipcMain.handle(IPC.MAIL_STAR, (_event, threadId: string) => {
    db.prepare('UPDATE threads SET starred = 1 WHERE id = ?').run(threadId)
    refreshVault(threadId)
    return { success: true }
  })

  ipcMain.handle(IPC.MAIL_UNSTAR, (_event, threadId: string) => {
    db.prepare('UPDATE threads SET starred = 0 WHERE id = ?').run(threadId)
    refreshVault(threadId)
    return { success: true }
  })

  // Archive
  ipcMain.handle(IPC.MAIL_ARCHIVE, (_event, threadId: string) => {
    console.log('[Mail] Archive thread:', threadId)
    if (!threadId) {
      console.warn('[Mail] Archive called with empty threadId — shortcut likely fired with no thread selected')
      return { success: false, error: 'No thread selected' }
    }
    const thread = db.prepare('SELECT account_id, folder_id FROM threads WHERE id = ?').get(threadId) as any
    if (!thread) {
      console.warn('[Mail] Archive: thread not found in DB:', threadId)
      return { success: false, error: 'Thread not found' }
    }

    const archiveFolder = db
      .prepare("SELECT id, imap_path FROM folders WHERE account_id = ? AND role = 'archive'")
      .get(thread.account_id) as { id: string; imap_path: string } | undefined

    if (!archiveFolder) {
      console.warn('[Mail] No archive folder for account', thread.account_id)
      return { success: false, error: 'No archive folder configured for this account' }
    }

    // Snapshot message locations BEFORE updating the DB — we need the old
    // imap_path so we can ask the server to move from there.
    const locations = threadMessageLocations(threadId)

    console.log('[Mail] Moving from', thread.folder_id, 'to', archiveFolder.id)
    db.prepare('UPDATE threads SET folder_id = ? WHERE id = ?').run(archiveFolder.id, threadId)
    db.prepare('UPDATE messages SET folder_id = ? WHERE thread_id = ?').run(archiveFolder.id, threadId)
    refreshVault(threadId)

    // Server-side move so the next sync doesn't pull the thread back to inbox.
    if (locations) {
      imapMoveThread(locations.accountId, locations.messages, archiveFolder.imap_path)
    }
    return { success: true }
  })

  // Delete / Trash
  ipcMain.handle(IPC.MAIL_TRASH, (_event, threadId: string) => {
    const thread = db.prepare('SELECT account_id FROM threads WHERE id = ?').get(threadId) as any
    if (!thread) return { success: false, error: 'Thread not found' }

    const trashFolder = db
      .prepare("SELECT id, imap_path FROM folders WHERE account_id = ? AND role = 'trash'")
      .get(thread.account_id) as { id: string; imap_path: string } | undefined

    if (!trashFolder) {
      return { success: false, error: 'No trash folder configured for this account' }
    }

    const locations = threadMessageLocations(threadId)
    db.prepare('UPDATE threads SET folder_id = ? WHERE id = ?').run(trashFolder.id, threadId)
    db.prepare('UPDATE messages SET folder_id = ? WHERE thread_id = ?').run(trashFolder.id, threadId)
    refreshVault(threadId)
    if (locations) {
      imapMoveThread(locations.accountId, locations.messages, trashFolder.imap_path)
    }
    return { success: true }
  })

  ipcMain.handle(IPC.MAIL_DELETE, (_event, threadId: string) => {
    db.prepare('DELETE FROM messages WHERE thread_id = ?').run(threadId)
    db.prepare('DELETE FROM threads WHERE id = ?').run(threadId)
    return { success: true }
  })

  // Move
  ipcMain.handle(IPC.MAIL_MOVE, (_event, threadId: string, folderId: string) => {
    const targetFolder = db
      .prepare('SELECT account_id, imap_path FROM folders WHERE id = ?')
      .get(folderId) as { account_id: string; imap_path: string } | undefined
    if (!targetFolder) return { success: false, error: 'Target folder not found' }

    const locations = threadMessageLocations(threadId)
    db.prepare('UPDATE threads SET folder_id = ? WHERE id = ?').run(folderId, threadId)
    db.prepare('UPDATE messages SET folder_id = ? WHERE thread_id = ?').run(folderId, threadId)
    refreshVault(threadId)
    if (locations) {
      imapMoveThread(locations.accountId, locations.messages, targetFolder.imap_path)
    }
    return { success: true }
  })

  // Send
  ipcMain.handle(IPC.MAIL_SEND, async (_event, msg: any) => {
    const client = getSmtpClient(msg.accountId)
    const outgoing: OutgoingMessage = {
      id: randomUUID(),
      accountId: msg.accountId,
      from: msg.from,
      to: msg.to,
      cc: msg.cc,
      bcc: msg.bcc,
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
      inReplyTo: msg.inReplyTo,
      references: msg.references
    }

    const sent = await outbox.enqueue(outgoing, async (m) => {
      await client.send(m)
    })

    return { success: sent, messageId: outgoing.id }
  })

  ipcMain.handle(IPC.MAIL_SEND_CANCEL, (_event, messageId: string) => {
    return { cancelled: outbox.cancel(messageId) }
  })

  // ── Compose draft autosave (sprint #5) ──────────────────────────────────
  ipcMain.handle(IPC.COMPOSE_DRAFT_SAVE, (_event, d: any) => {
    db.prepare(`
      INSERT INTO local_drafts (id, account_id, mode, reply_to_thread_id,
        to_list, cc_list, bcc_list, subject, body, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, unixepoch())
      ON CONFLICT(id) DO UPDATE SET
        account_id = excluded.account_id,
        mode = excluded.mode,
        reply_to_thread_id = excluded.reply_to_thread_id,
        to_list = excluded.to_list,
        cc_list = excluded.cc_list,
        bcc_list = excluded.bcc_list,
        subject = excluded.subject,
        body = excluded.body,
        updated_at = excluded.updated_at
    `).run(
      d.id, d.accountId || null, d.mode, d.replyToThreadId || null,
      JSON.stringify(d.to || []), JSON.stringify(d.cc || []),
      JSON.stringify(d.bcc || []), d.subject || '', d.body || ''
    )
    return { success: true }
  })

  ipcMain.handle(IPC.COMPOSE_DRAFT_LOAD, (_event, key: { mode: string; replyToThreadId?: string }) => {
    // Restore by (mode, replyToThreadId). For 'new', we restore the most
    // recent draft so the user doesn't lose their open compose on a crash.
    const row = key.replyToThreadId
      ? db.prepare(`SELECT * FROM local_drafts WHERE mode = ? AND reply_to_thread_id = ? ORDER BY updated_at DESC LIMIT 1`).get(key.mode, key.replyToThreadId)
      : db.prepare(`SELECT * FROM local_drafts WHERE mode = ? AND reply_to_thread_id IS NULL ORDER BY updated_at DESC LIMIT 1`).get(key.mode)
    if (!row) return null
    const r: any = row
    return {
      id: r.id,
      accountId: r.account_id,
      mode: r.mode,
      replyToThreadId: r.reply_to_thread_id,
      to: JSON.parse(r.to_list || '[]'),
      cc: JSON.parse(r.cc_list || '[]'),
      bcc: JSON.parse(r.bcc_list || '[]'),
      subject: r.subject,
      body: r.body,
      updatedAt: r.updated_at
    }
  })

  ipcMain.handle(IPC.COMPOSE_DRAFT_DELETE, (_event, id: string) => {
    db.prepare(`DELETE FROM local_drafts WHERE id = ?`).run(id)
    return { success: true }
  })

  // Open attachment with system default app
  ipcMain.handle(IPC.ATTACHMENT_OPEN, (_event, attachmentId: string) => {
    const att = db.prepare('SELECT local_path, filename FROM attachments WHERE id = ?').get(attachmentId) as any
    if (!att?.local_path || !existsSync(att.local_path)) {
      return { success: false, error: 'Attachment file not found' }
    }
    shell.openPath(att.local_path)
    return { success: true }
  })

  // Save attachment to user-chosen location
  ipcMain.handle(IPC.ATTACHMENT_SAVE, async (_event, attachmentId: string) => {
    const att = db.prepare('SELECT local_path, filename FROM attachments WHERE id = ?').get(attachmentId) as any
    if (!att?.local_path || !existsSync(att.local_path)) {
      return { success: false, error: 'Attachment file not found' }
    }

    const result = await dialog.showSaveDialog({
      defaultPath: att.filename,
      title: 'Save Attachment'
    })

    if (result.canceled || !result.filePath) return { success: false }

    try {
      copyFileSync(att.local_path, result.filePath)
      return { success: true }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  // Check if calendar import is enabled; default true.
  const calendarImportEnabled = (): boolean => {
    try {
      const row = db.prepare("SELECT value FROM settings WHERE key = 'calendarImportEnabled'").get() as { value: string } | undefined
      if (!row) return true
      try { return JSON.parse(row.value) !== false } catch { return row.value !== 'false' }
    } catch { return true }
  }

  // Import .ics calendar invite into system Calendar
  ipcMain.handle(IPC.ATTACHMENT_IMPORT_CALENDAR, async (_event, attachmentId: string) => {
    if (!calendarImportEnabled()) return { success: false, error: 'Calendar import disabled in privacy settings' }
    const att = db.prepare('SELECT local_path, filename, content_type FROM attachments WHERE id = ?').get(attachmentId) as any
    if (!att?.local_path || !existsSync(att.local_path)) {
      return { success: false, error: 'Calendar file not found' }
    }

    try {
      // Copy .ics to a temp location with proper extension so macOS opens it with Calendar
      const tmpPath = join(tmpdir(), `calendar-${Date.now()}.ics`)
      copyFileSync(att.local_path, tmpPath)

      // Open with system default handler (Calendar.app on macOS)
      await shell.openPath(tmpPath)
      return { success: true }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  // Import an event extracted from email body (no .ics attachment) — generate ICS on the fly
  ipcMain.handle(IPC.CALENDAR_IMPORT_EVENT, async (_event, ev: {
    title: string
    start: number
    end?: number
    location?: string
    description?: string
    organizerEmail?: string
    organizerName?: string
  }) => {
    if (!calendarImportEnabled()) return { success: false, error: 'Calendar import disabled in privacy settings' }
    return _calendarImportEvent(ev)
  })

  const _calendarImportEvent = async (ev: {
    title: string
    start: number // epoch ms
    end?: number
    location?: string
    description?: string
    organizerEmail?: string
    organizerName?: string
  }) => {
    try {
      const toIcsDate = (ms: number): string => {
        const d = new Date(ms)
        const pad = (n: number) => String(n).padStart(2, '0')
        return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
      }
      const dtStart = toIcsDate(ev.start)
      const dtEnd = toIcsDate(ev.end || ev.start + 30 * 60 * 1000) // default 30 min
      const dtStamp = toIcsDate(Date.now())
      const uid = `${randomUUID()}@mail_`

      const esc = (s: string | undefined): string =>
        (s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')

      const lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//mail_//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:REQUEST',
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${dtStamp}`,
        `DTSTART:${dtStart}`,
        `DTEND:${dtEnd}`,
        `SUMMARY:${esc(ev.title)}`
      ]
      if (ev.location) lines.push(`LOCATION:${esc(ev.location)}`)
      if (ev.description) lines.push(`DESCRIPTION:${esc(ev.description)}`)
      if (ev.organizerEmail) {
        const cn = ev.organizerName ? `CN=${esc(ev.organizerName)}:` : ''
        lines.push(`ORGANIZER;${cn}mailto:${ev.organizerEmail}`)
      }
      lines.push('END:VEVENT', 'END:VCALENDAR')

      const ics = lines.join('\r\n')
      const tmpPath = join(tmpdir(), `event-${Date.now()}.ics`)
      writeFileSync(tmpPath, ics, 'utf-8')
      await shell.openPath(tmpPath)
      return { success: true }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  }
}
