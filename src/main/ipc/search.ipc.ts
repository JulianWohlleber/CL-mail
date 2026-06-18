import { ipcMain } from 'electron'
import Database from 'better-sqlite3'
import { IPC } from '@shared/ipc-channels'

export function registerSearchHandlers(db: Database.Database): void {
  ipcMain.handle(IPC.SEARCH_QUERY, (_event, query: any) => {
    if (!query.text) return []

    const results = db.prepare(`
      SELECT
        m.id as messageId,
        m.thread_id as threadId,
        m.subject,
        m.snippet,
        m.from_name as fromName,
        m.from_address as fromAddress,
        m.date,
        rank
      FROM messages_fts
      JOIN messages m ON messages_fts.rowid = m.rowid
      WHERE messages_fts MATCH ?
      ORDER BY rank
      LIMIT ?
    `).all(query.text, query.limit || 20)

    return results
  })

  ipcMain.handle(IPC.SEARCH_SUGGEST, (_event, partial: string) => {
    if (!partial || partial.length < 2) return []

    // Suggest contacts
    const contacts = db.prepare(`
      SELECT DISTINCT email, display_name
      FROM contacts
      WHERE email LIKE ? OR display_name LIKE ?
      ORDER BY frequency DESC
      LIMIT 5
    `).all(`%${partial}%`, `%${partial}%`)

    // Suggest folders
    const folders = db.prepare(`
      SELECT name, role FROM folders WHERE name LIKE ? LIMIT 5
    `).all(`%${partial}%`)

    return {
      contacts: contacts.map((c: any) => ({
        type: 'contact',
        value: c.email,
        label: c.display_name || c.email
      })),
      folders: folders.map((f: any) => ({
        type: 'folder',
        value: f.name,
        label: f.name
      }))
    }
  })
}
