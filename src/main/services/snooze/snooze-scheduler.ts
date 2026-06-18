import Database from 'better-sqlite3'
import { BrowserWindow } from 'electron'
import { IPC } from '@shared/ipc-channels'
import { SNOOZE_CHECK_INTERVAL } from '@shared/constants'

export class SnoozeScheduler {
  private db: Database.Database
  private interval: ReturnType<typeof setInterval> | null = null

  constructor(db: Database.Database) {
    this.db = db
  }

  start(): void {
    this.interval = setInterval(() => this.checkSnoozes(), SNOOZE_CHECK_INTERVAL)
    // Check immediately on start
    this.checkSnoozes()
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval)
      this.interval = null
    }
  }

  private checkSnoozes(): void {
    const now = Date.now()
    const due = this.db
      .prepare('SELECT * FROM snooze_queue WHERE wake_at <= ?')
      .all(now) as Array<{
        id: string
        thread_id: string
        snoozed_at: number
        wake_at: number
        original_folder_id: string
      }>

    if (due.length === 0) return

    const deleteSnooze = this.db.prepare('DELETE FROM snooze_queue WHERE id = ?')
    const updateThread = this.db.prepare(`
      UPDATE threads SET snoozed_until = NULL, folder_id = ? WHERE id = ?
    `)
    const moveMessages = this.db.prepare(`
      UPDATE messages SET folder_id = ? WHERE thread_id = ?
    `)

    const transaction = this.db.transaction(() => {
      for (const snooze of due) {
        updateThread.run(snooze.original_folder_id, snooze.thread_id)
        moveMessages.run(snooze.original_folder_id, snooze.thread_id)
        deleteSnooze.run(snooze.id)
      }
    })

    transaction()

    // Notify renderer
    const windows = BrowserWindow.getAllWindows()
    for (const win of windows) {
      win.webContents.send(IPC.EVENT_SNOOZE_WAKE, {
        count: due.length,
        threadIds: due.map((s) => s.thread_id)
      })
    }
  }

  snooze(threadId: string, wakeAt: number, originalFolderId: string): void {
    const id = crypto.randomUUID()
    this.db.prepare(`
      INSERT INTO snooze_queue (id, thread_id, snoozed_at, wake_at, original_folder_id)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, threadId, Date.now(), wakeAt, originalFolderId)

    this.db.prepare(`
      UPDATE threads SET snoozed_until = ? WHERE id = ?
    `).run(wakeAt, threadId)
  }

  cancelSnooze(threadId: string): void {
    const snooze = this.db
      .prepare('SELECT * FROM snooze_queue WHERE thread_id = ?')
      .get(threadId) as { original_folder_id: string } | undefined

    if (snooze) {
      this.db.prepare('DELETE FROM snooze_queue WHERE thread_id = ?').run(threadId)
      this.db.prepare('UPDATE threads SET snoozed_until = NULL WHERE id = ?').run(threadId)
    }
  }
}
