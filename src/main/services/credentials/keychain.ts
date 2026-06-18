import { safeStorage } from 'electron'
import Database from 'better-sqlite3'

export class KeychainService {
  private db: Database.Database

  constructor(db: Database.Database) {
    this.db = db
  }

  store(accountId: string, password: string): void {
    if (!safeStorage.isEncryptionAvailable()) {
      // Fallback: store as plaintext (development only)
      this.db.prepare(`
        INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)
      `).run(`account_password_${accountId}`, password)
      return
    }

    const encrypted = safeStorage.encryptString(password)
    this.db.prepare(`
      INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)
    `).run(`account_password_${accountId}`, encrypted.toString('base64'))
  }

  retrieve(accountId: string): string | null {
    const row = this.db
      .prepare('SELECT value FROM settings WHERE key = ?')
      .get(`account_password_${accountId}`) as { value: string } | undefined

    if (!row) return null

    if (!safeStorage.isEncryptionAvailable()) {
      return row.value
    }

    try {
      const buffer = Buffer.from(row.value, 'base64')
      return safeStorage.decryptString(buffer)
    } catch {
      return row.value // fallback for unencrypted values
    }
  }

  remove(accountId: string): void {
    this.db.prepare('DELETE FROM settings WHERE key = ?').run(`account_password_${accountId}`)
  }
}
