import { ipcMain, shell, app } from 'electron'
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

  // ── About surface (sprint #7) ───────────────────────────────────────────
  ipcMain.handle(IPC.APP_INFO, () => ({
    version: app.getVersion(),
    name: 'mail_',
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
    platform: process.platform,
    arch: process.arch
  }))

  // ── Local-only opt-in usage counters (sprint #7) ────────────────────────
  // Gated on settings.usageStatsEnabled. Strictly on-device; no network sink.
  const usageEnabled = (): boolean => {
    try {
      const row = db.prepare("SELECT value FROM settings WHERE key = 'usageStatsEnabled'").get() as { value: string } | undefined
      if (!row) return false
      try { return JSON.parse(row.value) === true } catch { return row.value === 'true' }
    } catch { return false }
  }

  ipcMain.handle(IPC.USAGE_RECORD, (_event, action: string) => {
    if (!action || !usageEnabled()) return { recorded: false }
    db.prepare(`
      INSERT INTO usage_counters (action, count, last_used)
      VALUES (?, 1, unixepoch())
      ON CONFLICT(action) DO UPDATE SET
        count = count + 1,
        last_used = unixepoch()
    `).run(action)
    return { recorded: true }
  })

  ipcMain.handle(IPC.USAGE_SUMMARY, () => {
    return db.prepare(`
      SELECT action, count, last_used AS lastUsed
      FROM usage_counters
      ORDER BY count DESC
    `).all()
  })
}
