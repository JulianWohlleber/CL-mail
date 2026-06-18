import { ipcMain } from 'electron'
import Database from 'better-sqlite3'
import { randomUUID } from 'crypto'
import { readFileSync } from 'fs'
import { basename } from 'path'
import { IPC } from '@shared/ipc-channels'
import { KeychainService } from '../services/credentials/keychain'

/**
 * Cloud-storage uploads for the "send a link instead of a 25 MB attachment"
 * workflow. Currently implements Nextcloud (WebDAV PUT + share API). Google
 * Drive is stubbed pending OAuth.
 */
export function registerCloudStorageHandlers(db: Database.Database): void {
  const keychain = new KeychainService(db)

  ipcMain.handle(IPC.CLOUD_ACCOUNTS_LIST, () => {
    return db.prepare(`
      SELECT id, provider, display_name AS displayName, server_url AS serverUrl,
             username, upload_path AS uploadPath, enabled
      FROM cloud_storage_accounts
    `).all()
  })

  ipcMain.handle(IPC.CLOUD_ACCOUNT_ADD, async (_event, cfg: any) => {
    if (cfg.provider !== 'nextcloud') {
      return { success: false, error: 'Only Nextcloud is supported in this build (Google Drive needs OAuth).' }
    }
    if (!cfg.serverUrl || !cfg.username || !cfg.password) {
      return { success: false, error: 'serverUrl, username and password are required' }
    }

    // Probe the WebDAV root to validate creds.
    const server = String(cfg.serverUrl).replace(/\/+$/, '')
    const probeUrl = `${server}/remote.php/dav/files/${encodeURIComponent(cfg.username)}/`
    try {
      const res = await fetch(probeUrl, {
        method: 'PROPFIND',
        headers: {
          Authorization: 'Basic ' + Buffer.from(`${cfg.username}:${cfg.password}`).toString('base64'),
          Depth: '0'
        }
      })
      if (res.status !== 207 && res.status !== 200) {
        return { success: false, error: `WebDAV probe failed: HTTP ${res.status}` }
      }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }

    const id = randomUUID()
    db.prepare(`
      INSERT INTO cloud_storage_accounts
        (id, provider, display_name, server_url, username, upload_path, enabled)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `).run(
      id,
      'nextcloud',
      cfg.displayName || cfg.username,
      server,
      cfg.username,
      cfg.uploadPath || '/mail_attachments/'
    )
    keychain.store('cloud:' + id, cfg.password)
    return { success: true, id }
  })

  ipcMain.handle(IPC.CLOUD_ACCOUNT_REMOVE, (_event, id: string) => {
    db.prepare('DELETE FROM cloud_storage_accounts WHERE id = ?').run(id)
    keychain.remove('cloud:' + id)
    return { success: true }
  })

  /**
   * Upload a local file to a Nextcloud account and create a public share.
   * Returns a public URL the compose window can drop into the email body.
   */
  ipcMain.handle(IPC.CLOUD_UPLOAD_ATTACHMENT, async (_event, args: { accountId: string; filePath: string; filename?: string }) => {
    try {
      const acc = db.prepare('SELECT * FROM cloud_storage_accounts WHERE id = ?').get(args.accountId) as any
      if (!acc) return { success: false, error: 'Cloud account not found' }
      if (acc.provider !== 'nextcloud') return { success: false, error: 'Only Nextcloud is implemented' }

      const password = keychain.retrieve('cloud:' + args.accountId)
      if (!password) return { success: false, error: 'No password stored for cloud account' }

      const filename = args.filename || basename(args.filePath)
      const fileBuffer = readFileSync(args.filePath)

      // Ensure upload directory exists (MKCOL is idempotent at HTTP level —
      // 405 means it already exists, which is fine).
      const baseFiles = `${acc.server_url}/remote.php/dav/files/${encodeURIComponent(acc.username)}`
      const folder = String(acc.upload_path || '/mail_attachments/').replace(/^\/+|\/+$/g, '')
      const folderUrl = `${baseFiles}/${folder}/`
      const auth = 'Basic ' + Buffer.from(`${acc.username}:${password}`).toString('base64')
      await fetch(folderUrl, { method: 'MKCOL', headers: { Authorization: auth } }).catch(() => {})

      // Unique name to avoid clobbering.
      const stamped = `${Date.now()}-${filename}`
      const targetUrl = `${folderUrl}${encodeURIComponent(stamped)}`
      const put = await fetch(targetUrl, {
        method: 'PUT',
        headers: { Authorization: auth },
        body: fileBuffer
      })
      if (put.status >= 400) return { success: false, error: `WebDAV PUT failed: ${put.status}` }

      // Create a public share via OCS API.
      const shareApi = `${acc.server_url}/ocs/v2.php/apps/files_sharing/api/v1/shares`
      const shareRes = await fetch(shareApi, {
        method: 'POST',
        headers: {
          Authorization: auth,
          'OCS-APIRequest': 'true',
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: new URLSearchParams({
          path: `/${folder}/${stamped}`,
          shareType: '3' // public link
        }).toString()
      })
      if (shareRes.status >= 400) {
        return { success: false, error: `Share creation failed: ${shareRes.status}` }
      }
      const shareJson: any = await shareRes.json().catch(() => ({}))
      const url = shareJson?.ocs?.data?.url
      if (!url) return { success: false, error: 'Share created but no URL returned' }

      return { success: true, url, filename }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })
}
