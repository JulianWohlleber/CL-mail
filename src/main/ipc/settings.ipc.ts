import { ipcMain, shell } from 'electron'
import Database from 'better-sqlite3'
import { IPC } from '@shared/ipc-channels'
import { DEFAULT_SETTINGS } from '@shared/types/settings'

/**
 * macOS Privacy & Security pane URLs. These deep-link into System Settings
 * so the user can grant/revoke the permission without hunting through menus.
 */
const SYSTEM_PANES: Record<string, string> = {
  contacts: 'x-apple.systempreferences:com.apple.preference.security?Privacy_Contacts',
  calendars: 'x-apple.systempreferences:com.apple.preference.security?Privacy_Calendars',
  automation: 'x-apple.systempreferences:com.apple.preference.security?Privacy_Automation',
  full_disk: 'x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles',
  files: 'x-apple.systempreferences:com.apple.preference.security?Privacy_DocumentsFolder',
  notifications: 'x-apple.systempreferences:com.apple.preference.notifications',
  privacy: 'x-apple.systempreferences:com.apple.preference.security?Privacy'
}

export function registerSettingsHandlers(db: Database.Database): void {
  ipcMain.handle(IPC.SETTINGS_GET, (_event, key?: string) => {
    if (key) {
      const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined
      if (!row) return (DEFAULT_SETTINGS as any)[key] ?? null
      try {
        return JSON.parse(row.value)
      } catch {
        return row.value
      }
    }

    // Return all settings merged with defaults
    const rows = db.prepare("SELECT key, value FROM settings WHERE key NOT LIKE 'account_password_%'").all() as Array<{ key: string; value: string }>
    const stored: Record<string, any> = {}
    for (const row of rows) {
      try {
        stored[row.key] = JSON.parse(row.value)
      } catch {
        stored[row.key] = row.value
      }
    }
    return { ...DEFAULT_SETTINGS, ...stored }
  })

  ipcMain.handle(IPC.SETTINGS_SET, (_event, key: string, value: any) => {
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(
      key,
      typeof value === 'string' ? value : JSON.stringify(value)
    )
    return { success: true }
  })

  ipcMain.handle(IPC.SETTINGS_OPEN_SYSTEM_PANE, async (_event, pane: string) => {
    const url = SYSTEM_PANES[pane] || SYSTEM_PANES.privacy
    try {
      await shell.openExternal(url)
      return { success: true }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })
}
