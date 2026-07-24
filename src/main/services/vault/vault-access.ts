import { app } from 'electron'
import Database from 'better-sqlite3'

/**
 * Under the App Sandbox (Mac App Store build) the app may only write to a folder
 * the user picked in an open panel, and only after re-acquiring access on each
 * launch via that folder's security-scoped bookmark. This wraps a filesystem
 * operation so it works in both builds:
 *   • MAS: resolve the stored bookmark, start accessing, run, stop accessing.
 *   • Developer-ID: run directly (no sandbox).
 */
export function withVaultAccess<T>(db: Database.Database, vaultPath: string, fn: () => T): T {
  if (!__MAS_BUILD__) return fn()

  const row = db
    .prepare('SELECT value FROM settings WHERE key = ?')
    .get('vault_bookmark:' + vaultPath) as { value: string } | undefined

  // No bookmark stored → best-effort (will fail in the sandbox, but never crash).
  if (!row?.value) return fn()

  let stop: (() => void) | undefined
  try {
    // Electron exposes this only on macOS MAS builds.
    stop = (app as unknown as {
      startAccessingSecurityScopedResource(b: string): () => void
    }).startAccessingSecurityScopedResource(row.value)
    return fn()
  } finally {
    if (stop) stop()
  }
}

/** Persist a folder's security-scoped bookmark (base64 from the open panel). */
export function storeVaultBookmark(db: Database.Database, vaultPath: string, bookmark: string): void {
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(
    'vault_bookmark:' + vaultPath,
    bookmark
  )
}
