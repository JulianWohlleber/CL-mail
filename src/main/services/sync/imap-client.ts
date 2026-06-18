import { ImapFlow } from 'imapflow'
import { simpleParser } from 'mailparser'
import Database from 'better-sqlite3'
import { randomUUID } from 'crypto'
import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { app } from 'electron'
import { MAX_BODY_PREVIEW_LENGTH } from '@shared/constants'

interface ImapConfig {
  host: string
  port: number
  secure: boolean
  auth: { user: string; pass: string }
}

export class ImapClient {
  private db: Database.Database
  private accountId: string
  private config: ImapConfig
  private client: ImapFlow | null = null
  private connected = false

  constructor(db: Database.Database, accountId: string, config: ImapConfig) {
    this.db = db
    this.accountId = accountId
    this.config = config
  }

  async connect(): Promise<void> {
    if (this.connected && this.client) return

    // Clean up any stale client
    this.forceDisconnect()

    this.client = new ImapFlow({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.port === 993,
      auth: this.config.auth,
      logger: {
        debug: () => {},
        info: () => {},
        warn: (msg: any) => console.warn('[IMAP]', msg?.msg || msg),
        error: (msg: any) => console.error('[IMAP]', msg?.msg || msg)
      },
      tls: {
        rejectUnauthorized: true,
        minVersion: 'TLSv1.2'
      },
      connectionTimeout: 15000,
      greetingTimeout: 15000
    } as any)

    // Listen for connection close to update state
    this.client.on('close', () => {
      this.connected = false
    })
    this.client.on('error', (err: Error) => {
      console.warn('[IMAP] Connection error:', err.message)
      this.connected = false
    })

    await this.client.connect()
    this.connected = true
  }

  forceDisconnect(): void {
    if (this.client) {
      try {
        this.client.close()
      } catch {
        // ignore — socket may already be dead
      }
      this.client = null
    }
    this.connected = false
  }

  async disconnect(): Promise<void> {
    if (this.client && this.connected) {
      try {
        await this.client.logout()
      } catch {
        // ignore
      }
    }
    this.client = null
    this.connected = false
  }

  /**
   * Create a new IMAP mailbox/folder and insert a corresponding row into the local DB.
   * Returns the locally-stored folder id (`${accountId}:${path}`).
   */
  async createFolder(name: string): Promise<{ id: string; path: string; name: string }> {
    if (!this.client || !this.connected) {
      await this.connect()
    }
    if (!this.client) throw new Error('Not connected')

    const trimmed = name.trim()
    if (!trimmed) throw new Error('Folder name cannot be empty')

    // Try to create — server returns an error if it already exists
    try {
      await this.client.mailboxCreate(trimmed)
    } catch (err) {
      const msg = (err as Error).message || ''
      // "ALREADYEXISTS" is fine — fall through and reuse the existing folder
      if (!/already.?exists/i.test(msg)) {
        throw err
      }
    }

    const folderId = `${this.accountId}:${trimmed}`
    this.db.prepare(`
      INSERT INTO folders (id, account_id, name, role, imap_path)
      VALUES (?, ?, ?, 'custom', ?)
      ON CONFLICT(id) DO UPDATE SET name = excluded.name
    `).run(folderId, this.accountId, trimmed, trimmed)

    return { id: folderId, path: trimmed, name: trimmed }
  }

  /**
   * Move a message on the IMAP server from one mailbox to another by UID.
   * The server is the source of truth — once this succeeds we don't need to
   * worry about the next sync re-pulling the message into the old folder.
   */
  async moveMessage(uid: number, fromPath: string, toPath: string): Promise<void> {
    if (!this.client || !this.connected) {
      await this.connect()
    }
    if (!this.client) throw new Error('IMAP not connected')
    if (fromPath === toPath) return

    let lock
    try {
      lock = await this.client.getMailboxLock(fromPath)
    } catch (err) {
      throw new Error(`Could not lock source mailbox "${fromPath}": ${(err as Error).message}`)
    }

    try {
      // imapflow accepts a UID range string or sequence; we use UID mode.
      await this.client.messageMove(String(uid), toPath, { uid: true })
    } finally {
      lock.release()
    }
  }

  async syncAllFolders(): Promise<void> {
    if (!this.client || !this.connected) throw new Error('Not connected')

    const mailboxes = await this.client.list()

    // Sort so inbox is synced LAST — its folder_id takes priority in threads
    const folderPriority: Record<string, number> = { inbox: 99, sent: 50, drafts: 10 }
    const sorted = [...mailboxes].sort((a, b) => {
      const pa = folderPriority[this.detectRole(a)] || 0
      const pb = folderPriority[this.detectRole(b)] || 0
      return pa - pb
    })

    for (const mailbox of sorted) {
      if (!this.connected) break // stop if connection dropped mid-sync

      const role = this.detectRole(mailbox)
      const folderId = `${this.accountId}:${mailbox.path}`

      // Upsert folder
      this.db.prepare(`
        INSERT INTO folders (id, account_id, name, role, imap_path)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET name = ?, role = ?
      `).run(folderId, this.accountId, mailbox.name, role, mailbox.path, mailbox.name, role)

      try {
        await this.syncFolder(folderId, mailbox.path)
      } catch (err) {
        const msg = (err as Error).message || ''
        if (msg.includes('EPIPE') || msg.includes('ECONNRESET') || msg.includes('ETIMEDOUT') || msg.includes('closed')) {
          console.warn(`[Sync] Connection lost syncing "${mailbox.path}", stopping cycle`)
          this.connected = false
          return
        }
        console.error(`[Sync] Error syncing "${mailbox.path}":`, msg)
      }
    }
  }

  private async syncFolder(folderId: string, imapPath: string): Promise<void> {
    if (!this.client || !this.connected) return

    let lock
    try {
      lock = await this.client.getMailboxLock(imapPath)
    } catch (err) {
      console.warn(`[Sync] Could not lock "${imapPath}":`, (err as Error).message)
      return
    }

    try {
      const mailboxStatus = this.client.mailbox
      if (!mailboxStatus?.exists || mailboxStatus.exists === 0) {
        return
      }

      const folderRow = this.db
        .prepare('SELECT highestmodseq FROM folders WHERE id = ?')
        .get(folderId) as { highestmodseq: string | null } | undefined

      const lastSyncedUid = folderRow?.highestmodseq ? parseInt(folderRow.highestmodseq, 10) : 0
      const localCount = (this.db.prepare('SELECT COUNT(*) as c FROM messages WHERE folder_id = ?').get(folderId) as any).c
      const searchFrom = (lastSyncedUid && localCount > 0) ? lastSyncedUid + 1 : 1

      const insertMsg = this.db.prepare(`
        INSERT OR IGNORE INTO messages
        (id, account_id, thread_id, folder_id, uid, message_id_header, in_reply_to, refs,
         from_address, from_name, to_list, cc_list, bcc_list,
         subject, snippet, body_html, body_text, date, flags,
         has_attachments, size, unread, starred)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)

      const insertThread = this.db.prepare(`
        INSERT INTO threads (id, account_id, subject, snippet, last_message_date, participants, message_count, unread, starred, has_attachments, folder_id)
        VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          snippet = excluded.snippet,
          last_message_date = MAX(threads.last_message_date, excluded.last_message_date),
          message_count = message_count + 1,
          unread = MAX(threads.unread, excluded.unread),
          starred = MAX(threads.starred, excluded.starred),
          has_attachments = MAX(threads.has_attachments, excluded.has_attachments),
          folder_id = excluded.folder_id
      `)

      const checkExists = this.db.prepare(
        'SELECT 1 FROM messages WHERE folder_id = ? AND uid = ? LIMIT 1'
      )

      let fetchCount = 0
      let highestUid = lastSyncedUid

      try {
        for await (const msg of this.client.fetch(
          { uid: `${searchFrom}:*` },
          {
            uid: true,
            flags: true,
            envelope: true,
            source: true,
            size: true
          }
        )) {
          try {
            if (msg.uid > highestUid) highestUid = msg.uid

            if (checkExists.get(folderId, msg.uid)) continue

            fetchCount++
            const parsed = await simpleParser(msg.source)
            const msgId = randomUUID()
            const threadId = this.resolveThreadId(parsed.messageId, parsed.inReplyTo as string, parsed.references as string[])

            const from = parsed.from?.value?.[0]
            const fromAddress = from?.address || ''
            const fromName = from?.name || fromAddress
            const toList = parsed.to ? (Array.isArray(parsed.to) ? parsed.to.flatMap(t => t.value) : parsed.to.value) : []
            const ccList = parsed.cc ? (Array.isArray(parsed.cc) ? parsed.cc.flatMap(t => t.value) : parsed.cc.value) : []
            const bodyText = parsed.text || ''
            const bodyHtml = parsed.html || ''
            const snippet = bodyText.slice(0, MAX_BODY_PREVIEW_LENGTH).replace(/\s+/g, ' ').trim()
            const flags = Array.from(msg.flags || [])
            const unread = !flags.includes('\\Seen') ? 1 : 0
            const starred = flags.includes('\\Flagged') ? 1 : 0
            // Extract inline calendar parts that mailparser may not include as attachments
            const calendarParts: { content: Buffer; filename: string; contentType: string }[] = []
            if (parsed.icalEvent?.content) {
              calendarParts.push({
                content: Buffer.from(parsed.icalEvent.content, 'utf-8'),
                filename: 'invite.ics',
                contentType: 'text/calendar'
              })
            }

            const hasAttachments = ((parsed.attachments?.length || 0) + calendarParts.length) > 0 ? 1 : 0

            const participants = [{ name: fromName, address: fromAddress }, ...toList]
            insertThread.run(
              threadId, this.accountId,
              parsed.subject || '(No Subject)', snippet,
              parsed.date ? parsed.date.getTime() : Date.now(),
              JSON.stringify(participants), unread, starred, hasAttachments, folderId
            )

            insertMsg.run(
              msgId, this.accountId, threadId, folderId, msg.uid,
              parsed.messageId || '', parsed.inReplyTo || '', JSON.stringify(parsed.references || []),
              fromAddress, fromName,
              JSON.stringify(toList), JSON.stringify(ccList), '[]',
              parsed.subject || '(No Subject)', snippet,
              bodyHtml, bodyText,
              parsed.date ? parsed.date.getTime() : Date.now(),
              JSON.stringify(flags), hasAttachments, msg.size || 0,
              unread, starred
            )

            // Save attachments to disk
            const allAttachments = [
              ...(parsed.attachments || []),
              ...calendarParts
            ]

            if (allAttachments.length) {
              const attachDir = join(app.getPath('userData'), 'attachments', msgId)
              mkdirSync(attachDir, { recursive: true })

              const insertAttach = this.db.prepare(`
                INSERT OR IGNORE INTO attachments (id, message_id, filename, content_type, size, content_id, local_path)
                VALUES (?, ?, ?, ?, ?, ?, ?)
              `)
              for (const att of allAttachments) {
                const attId = randomUUID()
                const safeFilename = (att.filename || 'invite.ics').replace(/[/\\:*?"<>|]/g, '_')
                const localPath = join(attachDir, `${attId}_${safeFilename}`)
                try {
                  writeFileSync(localPath, att.content)
                } catch {
                  // Skip if write fails
                }
                insertAttach.run(
                  attId, msgId,
                  att.filename || 'invite.ics',
                  att.contentType || 'application/octet-stream',
                  (att as any).size || att.content.length || 0,
                  (att as any).contentId || null,
                  localPath
                )
              }
            }
          } catch (msgErr) {
            console.error(`[Sync] Failed to parse UID ${msg.uid}:`, (msgErr as Error).message)
          }
        }
      } catch (fetchErr) {
        const errMsg = (fetchErr as Error).message || String(fetchErr)
        if (!errMsg.includes('Nothing to fetch')) {
          console.warn(`[Sync] Fetch error in "${imapPath}": ${errMsg}`)
        }
      }

      if (highestUid > lastSyncedUid) {
        this.db.prepare('UPDATE folders SET highestmodseq = ? WHERE id = ?').run(String(highestUid), folderId)
      }

      if (fetchCount > 0) {
        console.log(`[Sync] "${imapPath}": synced ${fetchCount} new messages`)
      }

      // Update folder counts
      const counts = this.db.prepare(`
        SELECT COUNT(*) as total, COALESCE(SUM(unread), 0) as unread
        FROM messages WHERE folder_id = ?
      `).get(folderId) as { total: number; unread: number }

      this.db.prepare(`
        UPDATE folders SET total_count = ?, unread_count = ? WHERE id = ?
      `).run(counts.total, counts.unread, folderId)

    } finally {
      lock.release()
    }
  }

  private resolveThreadId(messageId?: string, inReplyTo?: string, references?: string[]): string {
    if (inReplyTo) {
      const existing = this.db
        .prepare('SELECT thread_id FROM messages WHERE message_id_header = ? LIMIT 1')
        .get(inReplyTo) as { thread_id: string } | undefined
      if (existing) return existing.thread_id
    }

    if (references?.length) {
      for (const ref of references) {
        const existing = this.db
          .prepare('SELECT thread_id FROM messages WHERE message_id_header = ? LIMIT 1')
          .get(ref) as { thread_id: string } | undefined
        if (existing) return existing.thread_id
      }
    }

    return randomUUID()
  }

  private detectRole(mailbox: any): string {
    if (mailbox.specialUse) {
      const use = mailbox.specialUse.replace('\\', '').toLowerCase()
      if (use === 'inbox') return 'inbox'
      if (use === 'sent') return 'sent'
      if (use === 'drafts') return 'drafts'
      if (use === 'trash') return 'trash'
      if (use === 'junk' || use === 'spam') return 'spam'
      if (use === 'archive' || use === 'all') return 'archive'
      if (use === 'flagged') return 'starred'
    }

    const name = mailbox.name.toLowerCase()
    if (name === 'inbox') return 'inbox'
    if (name === 'sent' || name === 'sent mail' || name === 'sent items') return 'sent'
    if (name === 'drafts' || name === 'draft') return 'drafts'
    if (name === 'trash' || name === 'deleted' || name === 'deleted items') return 'trash'
    if (name === 'junk' || name === 'spam') return 'spam'
    if (name === 'archive' || name === 'all mail') return 'archive'

    return 'custom'
  }
}
