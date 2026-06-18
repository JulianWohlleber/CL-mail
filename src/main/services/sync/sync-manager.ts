import Database from 'better-sqlite3'
import { BrowserWindow } from 'electron'
import { ImapClient } from './imap-client'
import { KeychainService } from '../credentials/keychain'
import { VaultSync } from '../vault/vault-sync'
import { IPC } from '@shared/ipc-channels'
import { SYNC_INTERVAL } from '@shared/constants'

interface AccountRow {
  id: string
  email: string
  imap_host: string
  imap_port: number
  auth_type: string
  tls: number
  enabled: number
}

export class SyncManager {
  private db: Database.Database
  private keychain: KeychainService
  private vaultSync: VaultSync
  private clients: Map<string, ImapClient> = new Map()
  private intervals: Map<string, ReturnType<typeof setInterval>> = new Map()
  private syncing: Set<string> = new Set() // prevent overlapping syncs

  constructor(db: Database.Database) {
    this.db = db
    this.keychain = new KeychainService(db)
    this.vaultSync = new VaultSync(db)
  }

  async startAll(): Promise<void> {
    const accounts = this.db
      .prepare('SELECT * FROM accounts WHERE enabled = 1')
      .all() as AccountRow[]

    for (const account of accounts) {
      await this.startAccount(account.id)
    }
  }

  async startAccount(accountId: string): Promise<void> {
    if (this.clients.has(accountId)) {
      await this.stopAccount(accountId)
    }

    const account = this.db
      .prepare('SELECT * FROM accounts WHERE id = ?')
      .get(accountId) as AccountRow | undefined

    if (!account || !account.enabled) return

    try {
      const auth = await this.getAuth(account)
      console.log(`[SyncManager] Starting sync for ${account.email}`)

      const client = new ImapClient(this.db, account.id, {
        host: account.imap_host,
        port: account.imap_port,
        secure: !!account.tls,
        auth
      })

      this.clients.set(accountId, client)

      // Initial sync
      await this.runSync(accountId, client)

      // Periodic sync — skip if previous cycle still running
      const interval = setInterval(async () => {
        await this.runSync(accountId, client)
      }, SYNC_INTERVAL)

      this.intervals.set(accountId, interval)

      // Update last sync time
      this.db
        .prepare('UPDATE accounts SET last_sync = unixepoch() WHERE id = ?')
        .run(accountId)
    } catch (err) {
      console.error(`[SyncManager] Failed to start ${account.email}:`, (err as Error).message)
      this.emitSyncError(accountId, (err as Error).message)
    }
  }

  private async runSync(accountId: string, client: ImapClient): Promise<void> {
    // Prevent overlapping syncs for the same account
    if (this.syncing.has(accountId)) {
      console.log(`[SyncManager] Skipping sync for ${accountId} — previous sync still running`)
      return
    }

    this.syncing.add(accountId)

    // Timeout: abort sync if it takes longer than 2 minutes
    const timeout = setTimeout(() => {
      console.warn(`[SyncManager] Sync timeout for ${accountId}, forcing disconnect`)
      client.forceDisconnect()
      this.syncing.delete(accountId)
    }, 120_000)

    try {
      await client.connect()
      await client.syncAllFolders()
      this.emitSyncStatus(accountId, 'synced')
      // Sync to vault after successful IMAP sync
      try { this.vaultSync.syncAll() } catch (e) { console.warn('[Vault] Sync error:', (e as Error).message) }
    } catch (err) {
      const msg = (err as Error).message || ''
      console.warn(`[SyncManager] Sync error for ${accountId}: ${msg}`)
      // Force disconnect on connection errors so next cycle reconnects fresh
      client.forceDisconnect()
      this.emitSyncError(accountId, msg)
    } finally {
      clearTimeout(timeout)
      this.syncing.delete(accountId)
    }
  }

  /** Get the IMAP client for an account (or null if it isn't running). */
  getClient(accountId: string): ImapClient | null {
    return this.clients.get(accountId) || null
  }

  async stopAccount(accountId: string): Promise<void> {
    const client = this.clients.get(accountId)
    if (client) {
      client.forceDisconnect()
      this.clients.delete(accountId)
    }

    const interval = this.intervals.get(accountId)
    if (interval) {
      clearInterval(interval)
      this.intervals.delete(accountId)
    }

    this.syncing.delete(accountId)
  }

  async stopAll(): Promise<void> {
    for (const accountId of this.clients.keys()) {
      await this.stopAccount(accountId)
    }
  }

  private async getAuth(account: AccountRow) {
    const password = this.keychain.retrieve(account.id)

    return {
      user: account.email,
      pass: password || ''
    }
  }

  private emitSyncStatus(accountId: string, status: string): void {
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) {
        win.webContents.send(IPC.EVENT_SYNC_PROGRESS, { accountId, status })
      }
    }
  }

  private emitSyncError(accountId: string, error: string): void {
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) {
        win.webContents.send(IPC.EVENT_SYNC_ERROR, { accountId, error })
      }
    }
  }

  private emitNewMail(accountId: string, count: number): void {
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) {
        win.webContents.send(IPC.EVENT_NEW_MAIL, { accountId, count })
      }
    }
  }
}
