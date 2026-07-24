import { ipcMain, dialog } from 'electron'
import Database from 'better-sqlite3'
import { IPC } from '@shared/ipc-channels'
import { VaultSync } from '../services/vault/vault-sync'
import { storeVaultBookmark } from '../services/vault/vault-access'

export function registerVaultHandlers(db: Database.Database): void {
  const vaultSync = new VaultSync(db)

  // Pick a vault folder using the native folder dialog. In the MAS build we
  // also request a security-scoped bookmark so we can write to the folder on
  // later launches (the sandbox otherwise revokes access after the panel closes).
  ipcMain.handle(IPC.VAULT_PICK_FOLDER, async () => {
    const result = await dialog.showOpenDialog({
      title: 'Select Vault Folder',
      message: 'Choose the root folder of your Obsidian vault or notes folder',
      properties: ['openDirectory', 'createDirectory'],
      securityScopedBookmarks: __MAS_BUILD__
    })

    if (result.canceled || !result.filePaths[0]) return null
    const path = result.filePaths[0]
    if (__MAS_BUILD__ && result.bookmarks?.[0]) {
      storeVaultBookmark(db, path, result.bookmarks[0])
    }
    return path
  })

  // Full vault sync for all accounts
  ipcMain.handle(IPC.VAULT_SYNC, () => {
    try {
      vaultSync.syncAll()
      return { success: true }
    } catch (err) {
      console.error('[Vault] Sync failed:', (err as Error).message)
      return { success: false, error: (err as Error).message }
    }
  })

  // Sync a single thread to vault
  ipcMain.handle(IPC.VAULT_SYNC_THREAD, (_event, threadId: string) => {
    try {
      vaultSync.syncThread(threadId)
      return { success: true }
    } catch (err) {
      console.error('[Vault] Thread sync failed:', (err as Error).message)
      return { success: false, error: (err as Error).message }
    }
  })
}
