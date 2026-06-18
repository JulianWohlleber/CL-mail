import Database from 'better-sqlite3'
import { randomUUID } from 'crypto'
import { CalDavClient } from './caldav-client'
import { KeychainService } from '../credentials/keychain'

interface CalendarAccountRow {
  id: string
  provider: string
  display_name: string
  server_url: string
  username: string
  enabled: number
}

/**
 * Calendar service for mail_'s "accept invite into a calendar" workflow.
 * We do NOT fetch events into our DB — mail_ is not a calendar app.
 * We only:
 *   1. Discover the user's calendars on the CalDAV server (once on connect,
 *      again on demand via refresh).
 *   2. Hold a CalDavClient instance per account ready to PUT an .ics for
 *      "Accept invite into <picked calendar>".
 */
export class CalendarSync {
  private db: Database.Database
  private keychain: KeychainService

  constructor(db: Database.Database) {
    this.db = db
    this.keychain = new KeychainService(db)
  }

  /** Quick one-shot discovery for every enabled account at startup. */
  async refreshAll(): Promise<void> {
    const accounts = this.db
      .prepare('SELECT * FROM calendar_accounts WHERE enabled = 1')
      .all() as CalendarAccountRow[]
    for (const a of accounts) {
      try { await this.refreshAccount(a.id) }
      catch (e) { console.warn(`[Calendar] discover failed for ${a.display_name}:`, (e as Error).message) }
    }
  }

  /** Re-discover calendars under one account. Called on connect and refresh. */
  async refreshAccount(accountId: string): Promise<{ success: boolean; error?: string; calendars?: number }> {
    const acc = this.db
      .prepare('SELECT * FROM calendar_accounts WHERE id = ?')
      .get(accountId) as CalendarAccountRow | undefined
    if (!acc || !acc.enabled) return { success: false, error: 'Account not enabled' }

    const password = this.keychain.retrieve('cal:' + accountId)
    if (!password) {
      this.db.prepare('UPDATE calendar_accounts SET last_error = ? WHERE id = ?')
        .run('No password stored', accountId)
      return { success: false, error: 'No password stored' }
    }

    try {
      const client = new CalDavClient(acc.server_url, { username: acc.username, password })
      const discovered = await client.discoverCalendars()

      const upsertCal = this.db.prepare(`
        INSERT INTO calendars (id, account_id, url, display_name, color, ctag, enabled)
        VALUES (?, ?, ?, ?, ?, ?, 1)
        ON CONFLICT(account_id, url) DO UPDATE SET
          display_name = excluded.display_name,
          color        = excluded.color,
          ctag         = excluded.ctag
      `)
      for (const c of discovered) {
        upsertCal.run(randomUUID(), accountId, c.url, c.displayName, c.color || null, c.ctag || null)
      }
      this.db.prepare('UPDATE calendar_accounts SET last_sync = unixepoch(), last_error = NULL WHERE id = ?')
        .run(accountId)
      return { success: true, calendars: discovered.length }
    } catch (err) {
      const msg = (err as Error).message
      this.db.prepare('UPDATE calendar_accounts SET last_error = ? WHERE id = ?').run(msg, accountId)
      return { success: false, error: msg }
    }
  }

  /**
   * Push a single .ics payload to a chosen calendar on the user's CalDAV server.
   * Returns the canonical URL of the created event resource.
   */
  async addEventToCalendar(calendarId: string, ics: string): Promise<{ success: boolean; error?: string; url?: string }> {
    const cal = this.db.prepare(`
      SELECT c.url AS cal_url, c.account_id, a.server_url, a.username
      FROM calendars c JOIN calendar_accounts a ON a.id = c.account_id
      WHERE c.id = ?
    `).get(calendarId) as { cal_url: string; account_id: string; server_url: string; username: string } | undefined
    if (!cal) return { success: false, error: 'Calendar not found' }

    const password = this.keychain.retrieve('cal:' + cal.account_id)
    if (!password) return { success: false, error: 'No password stored for calendar account' }

    try {
      const client = new CalDavClient(cal.server_url, { username: cal.username, password })
      const url = await client.putEvent(cal.cal_url, ics)
      return { success: true, url }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  }
}
