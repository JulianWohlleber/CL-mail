import { ipcMain } from 'electron'
import Database from 'better-sqlite3'
import { IPC } from '@shared/ipc-channels'
import { SnoozeScheduler } from '../services/snooze/snooze-scheduler'

export function registerSnoozeHandlers(db: Database.Database): void {
  const scheduler = new SnoozeScheduler(db)

  ipcMain.handle(IPC.SNOOZE_SET, (_event, threadId: string, wakeAt: number) => {
    const thread = db.prepare('SELECT folder_id FROM threads WHERE id = ?').get(threadId) as any
    if (!thread) return { success: false }

    scheduler.snooze(threadId, wakeAt, thread.folder_id)
    return { success: true }
  })

  ipcMain.handle(IPC.SNOOZE_CANCEL, (_event, threadId: string) => {
    scheduler.cancelSnooze(threadId)
    return { success: true }
  })

  ipcMain.handle(IPC.SNOOZE_LIST, () => {
    return db.prepare('SELECT * FROM snooze_queue ORDER BY wake_at ASC').all()
  })
}
