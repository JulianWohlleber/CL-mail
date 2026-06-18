/**
 * Tiny module-level registry so IPC handlers (registered at app startup,
 * before SyncManager is constructed) can reach into the running SyncManager
 * once it's available. Avoids the alternative of restructuring the whole
 * dependency-injection chain.
 */
import type { SyncManager } from './sync/sync-manager'

let syncManager: SyncManager | null = null

export const services = {
  setSyncManager(sm: SyncManager): void {
    syncManager = sm
  },
  getSyncManager(): SyncManager | null {
    return syncManager
  }
}
