import { ipcMain, dialog } from 'electron'
import Database from 'better-sqlite3'
import { IPC } from '@shared/ipc-channels'
import { VaultSync } from '../services/vault/vault-sync'

export function registerVaultHandlers(db: Database.Database): void {
  const vaultSync = new VaultSync(db)

  // Pick a vault folder using native folder dialog
  ipcMain.handle(IPC.VAULT_PICK_FOLDER, async () => {
    const result = await dialog.showOpenDialog({
      title: 'Select Vault Folder',
      message: 'Choose the root folder of your Obsidian vault or notes folder',
      properties: ['openDirectory', 'createDirectory']
    })

    if (result.canceled || !result.filePaths[0]) return null
    return result.filePaths[0]
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
