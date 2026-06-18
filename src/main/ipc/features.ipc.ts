import { ipcMain } from 'electron'
import Database from 'better-sqlite3'
import { IPC } from '@shared/ipc-channels'
import { randomUUID } from 'crypto'

export function registerFeatureHandlers(db: Database.Database): void {
  // === Scheduled Send ===
  ipcMain.handle(IPC.MAIL_SEND_SCHEDULED, (_event, msg: any) => {
    const id = randomUUID()
    db.prepare(`
      INSERT INTO scheduled_sends (id, account_id, send_at, from_address, to_list, cc_list, bcc_list, subject, body_html, body_text, in_reply_to, refs)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, msg.accountId, msg.sendAt,
      msg.from || '', JSON.stringify(msg.to || []), JSON.stringify(msg.cc || []), JSON.stringify(msg.bcc || []),
      msg.subject || '', msg.html || '', msg.text || '',
      msg.inReplyTo || null, JSON.stringify(msg.references || [])
    )
    return { success: true, id }
  })

  ipcMain.handle(IPC.MAIL_SEND_SCHEDULED_CANCEL, (_event, id: string) => {
    db.prepare('DELETE FROM scheduled_sends WHERE id = ?').run(id)
    return { success: true }
  })

  ipcMain.handle(IPC.MAIL_SEND_SCHEDULED_LIST, () => {
    return db.prepare('SELECT * FROM scheduled_sends ORDER BY send_at ASC').all()
  })

  // === Reminders (follow-up if no reply) ===
  ipcMain.handle(IPC.REMINDER_SET, (_event, threadId: string, remindAt: number, reason?: string) => {
    const id = randomUUID()
    db.prepare(`
      INSERT OR REPLACE INTO reminders (id, thread_id, remind_at, reason)
      VALUES (?, ?, ?, ?)
    `).run(id, threadId, remindAt, reason || 'no_reply')
    return { success: true, id }
  })

  ipcMain.handle(IPC.REMINDER_CANCEL, (_event, threadId: string) => {
    db.prepare('DELETE FROM reminders WHERE thread_id = ?').run(threadId)
    return { success: true }
  })

  ipcMain.handle(IPC.REMINDER_LIST, () => {
    return db.prepare('SELECT * FROM reminders ORDER BY remind_at ASC').all()
  })

  // === Templates ===
  ipcMain.handle(IPC.TEMPLATE_LIST, () => {
    return db.prepare('SELECT * FROM templates ORDER BY name ASC').all()
  })

  ipcMain.handle(IPC.TEMPLATE_SAVE, (_event, template: any) => {
    const id = template.id || randomUUID()
    db.prepare(`
      INSERT INTO templates (id, name, subject, body_html, body_text, shortcut, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, unixepoch())
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        subject = excluded.subject,
        body_html = excluded.body_html,
        body_text = excluded.body_text,
        shortcut = excluded.shortcut,
        updated_at = unixepoch()
    `).run(id, template.name, template.subject || '', template.bodyHtml || '', template.bodyText || '', template.shortcut || null)
    return { success: true, id }
  })

  ipcMain.handle(IPC.TEMPLATE_DELETE, (_event, id: string) => {
    db.prepare('DELETE FROM templates WHERE id = ?').run(id)
    return { success: true }
  })
}
