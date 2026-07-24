import { ipcMain, app } from 'electron'
import Database from 'better-sqlite3'
import { IPC } from '@shared/ipc-channels'
import { randomUUID } from 'crypto'
import { KeychainService } from '../services/credentials/keychain'
import { ImapFlow } from 'imapflow'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

export function registerAccountHandlers(db: Database.Database): void {
  const keychain = new KeychainService(db)

  ipcMain.handle(IPC.ACCOUNTS_LIST, () => {
    return db
      .prepare(`SELECT id, email, display_name as displayName, color, enabled, last_sync as lastSync, created_at as createdAt, vault_path as vaultPath FROM accounts`)
      .all()
  })

  ipcMain.handle(IPC.ACCOUNTS_ADD, async (_event, account: any) => {
    const id = randomUUID()

    db.prepare(`
      INSERT INTO accounts (id, email, display_name, imap_host, imap_port, smtp_host, smtp_port, auth_type, tls, color, vault_path)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      account.email,
      account.displayName || account.email,
      account.imapHost,
      account.imapPort || 993,
      account.smtpHost,
      account.smtpPort || 587,
      account.authType || 'password',
      account.tls !== false ? 1 : 0,
      account.color || '#3498DB',
      account.vaultPath || null
    )

    if (account.password) {
      keychain.store(id, account.password)
    }

    return { id, email: account.email }
  })

  ipcMain.handle(IPC.ACCOUNTS_REMOVE, (_event, accountId: string) => {
    db.prepare('DELETE FROM accounts WHERE id = ?').run(accountId)
    keychain.remove(accountId)
    return { success: true }
  })

  ipcMain.handle(IPC.ACCOUNTS_UPDATE, (_event, accountId: string, updates: any) => {
    const fields: string[] = []
    const values: any[] = []

    if (updates.displayName !== undefined) {
      fields.push('display_name = ?')
      values.push(updates.displayName)
    }
    if (updates.color !== undefined) {
      fields.push('color = ?')
      values.push(updates.color)
    }
    if (updates.enabled !== undefined) {
      fields.push('enabled = ?')
      values.push(updates.enabled ? 1 : 0)
    }
    if (updates.vaultPath !== undefined) {
      fields.push('vault_path = ?')
      values.push(updates.vaultPath || null)
    }

    if (fields.length > 0) {
      values.push(accountId)
      db.prepare(`UPDATE accounts SET ${fields.join(', ')} WHERE id = ?`).run(...values)
    }

    if (updates.password) {
      keychain.store(accountId, updates.password)
    }

    return { success: true }
  })

  ipcMain.handle(IPC.ACCOUNTS_TEST, async (_event, config: any) => {
    const port = config.imapPort || 993
    // Port 993 = implicit TLS (secure: true)
    // Port 143 = STARTTLS or plain (secure: false)
    const secure = port === 993

    console.log(`[IMAP Test] Connecting to ${config.imapHost}:${port} (secure: ${secure}) as ${config.email}`)

    try {
      const client = new ImapFlow({
        host: config.imapHost,
        port,
        secure,
        auth: { user: config.email, pass: config.password },
        logger: {
          debug: () => {},
          info: (msg: any) => console.log('[IMAP]', msg?.msg || msg),
          warn: (msg: any) => console.warn('[IMAP]', msg?.msg || msg),
          error: (msg: any) => console.error('[IMAP]', msg?.msg || msg)
        },
        tls: {
          rejectUnauthorized: true,
          minVersion: 'TLSv1.2'
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000
      } as any)

      await client.connect()
      console.log('[IMAP Test] Connected successfully')
      await client.logout()
      return { success: true }
    } catch (err: any) {
      const message = err?.responseText || err?.message || String(err)
      console.error('[IMAP Test] Failed:', message)
      return { success: false, error: message }
    }
  })

  // Set or replace an account's password (used after a programmatic import
  // that left the account disabled-without-password). Validates the password
  // by trying an IMAP login first; on success, enables the account.
  ipcMain.handle(IPC.ACCOUNTS_SET_PASSWORD, async (_event, accountId: string, password: string) => {
    const account = db.prepare(`SELECT * FROM accounts WHERE id = ?`).get(accountId) as any
    if (!account) return { success: false, error: 'Account not found' }
    if (!password) return { success: false, error: 'Password is empty' }

    // Validate by attempting an IMAP login (same as the regular test flow).
    const port = account.imap_port || 993
    const secure = port === 993
    try {
      const client = new ImapFlow({
        host: account.imap_host,
        port,
        secure,
        auth: { user: account.email, pass: password },
        logger: { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} },
        tls: { rejectUnauthorized: true, minVersion: 'TLSv1.2' },
        connectionTimeout: 15000,
        greetingTimeout: 15000
      } as any)
      await client.connect()
      await client.logout()
    } catch (err) {
      return { success: false, error: `IMAP login failed: ${(err as Error).message}` }
    }

    keychain.store(accountId, password)
    db.prepare('UPDATE accounts SET enabled = 1 WHERE id = ?').run(accountId)
    return { success: true }
  })

  // Discover Apple Mail accounts from Apple's protected directories.
  // Tries:
  //   1. ~/Library/Mail/V*/MailData/Accounts.plist (mail-specific)
  //   2. ~/Library/Accounts/Accounts4.sqlite       (system-wide internet accounts)
  // Both are gated behind macOS Full Disk Access. If both fail, we return a
  // specific error code so the UI can show a "grant access" guide.
  ipcMain.handle(IPC.ACCOUNTS_DISCOVER_APPLE_MAIL, () => {
    // Reading ~/Library/Mail and spawning `plutil` are both forbidden inside
    // the App Sandbox, so this feature can't exist in the Mac App Store build.
    if (__MAS_BUILD__) {
      return {
        success: false,
        error: 'unavailable-in-app-store',
        message: 'Importing accounts from Apple Mail isn’t available in the App Store version (macOS sandboxing forbids reading another app’s data). Add the account manually instead.'
      }
    }
    const home = app.getPath('home')

    // Skip accounts already in mail_.
    const existing = db.prepare('SELECT LOWER(email) AS e FROM accounts').all() as Array<{ e: string }>
    const existingSet = new Set(existing.map((r) => r.e))

    // Strategy 1: Apple Mail's Accounts.plist
    try {
      const { readdirSync } = require('fs')
      const mailRoot = join(home, 'Library/Mail')
      const versions = readdirSync(mailRoot).filter((d: string) => /^V\d+$/.test(d))
      for (const v of versions.sort().reverse()) {
        const plistPath = join(mailRoot, v, 'MailData/Accounts.plist')
        if (!existsSync(plistPath)) continue
        try {
          const { execSync } = require('child_process')
          const json = execSync(`plutil -convert json -o - "${plistPath}"`, { timeout: 5000 }).toString()
          const parsed = JSON.parse(json)
          const list: any[] = parsed.MailAccounts || parsed.accounts || []
          const accounts = list
            .filter((a) => a.EmailAddresses?.[0] || a.emailAddresses?.[0])
            .map((a) => {
              const email = (a.EmailAddresses?.[0] || a.emailAddresses?.[0]) as string
              const isImap = /imap/i.test(a.AccountType || a.accountType || '')
              const hostnames: string[] = a.Hostnames || a.hostnames || []
              const imapHost = isImap ? (hostnames[0] || '') : ''
              const smtpHost = (a.SMTP || a.smtp || '').toString().replace(/^smtp:\/\//, '')
              return {
                source: 'apple-mail',
                email,
                displayName: a.FullUserName || a.fullUserName || a.AccountName || a.accountName || email,
                imapHost,
                imapPort: parseInt(a.PortNumber, 10) || 993,
                imapUsername: a.Username || a.username || email,
                smtpHost,
                smtpPort: 465,
                smtpUsername: a.Username || a.username || email,
                tls: true
              }
            })
            .filter((a) => !existingSet.has(a.email.toLowerCase()))
          if (accounts.length > 0 || list.length > 0) {
            return { success: true, accounts, alreadyImported: list.length - accounts.length }
          }
        } catch (e) {
          // Try next version dir
        }
      }
    } catch (e) {
      // ~/Library/Mail is protected (no Full Disk Access) — fall through
    }

    // Strategy 2: the system-wide Accounts4.sqlite (also FDA-protected)
    try {
      const dbPath = join(home, 'Library/Accounts/Accounts4.sqlite')
      if (existsSync(dbPath)) {
        const adb = new (require('better-sqlite3'))(dbPath, { readonly: true })
        const rows = adb.prepare(`
          SELECT ZUSERNAME AS username, ZACCOUNTDESCRIPTION AS description,
            (SELECT ZACCOUNTTYPEDESCRIPTION FROM ZACCOUNTTYPE WHERE Z_PK = a.ZACCOUNTTYPE) AS atype
          FROM ZACCOUNT a
          WHERE ZUSERNAME LIKE '%@%'
        `).all() as Array<{ username: string; description: string; atype: string }>
        adb.close()
        const accounts = rows
          .filter((r) => /mail|imap/i.test(r.atype || ''))
          .filter((r) => !existingSet.has(r.username.toLowerCase()))
          .map((r) => ({
            source: 'apple-accounts',
            email: r.username,
            displayName: r.description || r.username,
            imapHost: '',
            imapPort: 993,
            imapUsername: r.username,
            smtpHost: '',
            smtpPort: 465,
            smtpUsername: r.username,
            tls: true
          }))
        if (accounts.length > 0) {
          return {
            success: true,
            accounts,
            alreadyImported: 0,
            needsHostInfo: true // host info isn't in this DB; user has to enter
          }
        }
      }
    } catch (e) {
      // ignore
    }

    return {
      success: false,
      error: 'needs-full-disk-access',
      message: 'mail_ needs Full Disk Access to read Apple Mail accounts. Grant it in System Settings → Privacy & Security → Full Disk Access, then re-launch and try again.'
    }
  })
}
