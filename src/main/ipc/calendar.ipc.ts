import { ipcMain } from 'electron'
import Database from 'better-sqlite3'
import { randomUUID } from 'crypto'
import { IPC } from '@shared/ipc-channels'
import { KeychainService } from '../services/credentials/keychain'
import { CalDavClient, buildCaldavPrincipalUrl } from '../services/calendar/caldav-client'
import { CalendarSync } from '../services/calendar/calendar-sync'

export function registerCalendarHandlers(db: Database.Database, sync: CalendarSync): void {
  const keychain = new KeychainService(db)

  ipcMain.handle(IPC.CALENDAR_ACCOUNTS_LIST, () => {
    return db.prepare(`
      SELECT a.id, a.provider, a.display_name AS displayName, a.server_url AS serverUrl,
             a.username, a.enabled, a.color, a.last_sync AS lastSync, a.last_error AS lastError,
             (SELECT COUNT(*) FROM calendars WHERE account_id = a.id) AS calendarCount
      FROM calendar_accounts a
    `).all()
  })

  // Returns a flat picker-ready list of (calendar_id, displayName, accountName, color)
  // across every enabled account — what we hand to the "Accept invite into …" UI.
  ipcMain.handle(IPC.CALENDAR_CALENDARS_LIST, () => {
    return db.prepare(`
      SELECT c.id, c.display_name AS displayName, c.color,
             a.display_name AS accountName, a.provider
      FROM calendars c
      JOIN calendar_accounts a ON c.account_id = a.id
      WHERE c.enabled = 1 AND a.enabled = 1
      ORDER BY a.display_name, c.display_name
    `).all()
  })

  ipcMain.handle(IPC.CALENDAR_ACCOUNT_TEST, async (_event, cfg: any) => {
    try {
      const url = buildCaldavPrincipalUrl({
        provider: cfg.provider,
        serverUrl: cfg.serverUrl,
        username: cfg.username
      })
      const client = new CalDavClient(url, { username: cfg.username, password: cfg.password })
      const cals = await client.discoverCalendars()
      return { success: true, principalUrl: url, calendars: cals.map((c) => c.displayName) }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle(IPC.CALENDAR_ACCOUNT_ADD, async (_event, cfg: any) => {
    try {
      const principalUrl = buildCaldavPrincipalUrl({
        provider: cfg.provider,
        serverUrl: cfg.serverUrl,
        username: cfg.username
      })
      const client = new CalDavClient(principalUrl, { username: cfg.username, password: cfg.password })
      const cals = await client.discoverCalendars()
      if (cals.length === 0) {
        return { success: false, error: 'No calendars found at the given URL' }
      }

      const id = randomUUID()
      db.prepare(`
        INSERT INTO calendar_accounts (id, provider, display_name, server_url, username, color, enabled)
        VALUES (?, ?, ?, ?, ?, ?, 1)
      `).run(
        id,
        cfg.provider,
        cfg.displayName || cfg.username,
        principalUrl,
        cfg.username,
        cfg.color || '#3498DB'
      )
      keychain.store('cal:' + id, cfg.password)
      await sync.refreshAccount(id)
      return { success: true, id }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle(IPC.CALENDAR_ACCOUNT_REMOVE, (_event, id: string) => {
    db.prepare('DELETE FROM calendar_accounts WHERE id = ?').run(id)
    keychain.remove('cal:' + id)
    return { success: true }
  })

  ipcMain.handle(IPC.CALENDAR_ACCOUNT_SYNC, async (_event, id: string) => sync.refreshAccount(id))

  // Push an .ics blob to a chosen calendar — wires the "Accept invite" button.
  // Accepts EITHER:
  //   - { calendarId, ics }            — inline ICS (used for Calendly events
  //                                       extracted from the email body)
  //   - { calendarId, attachmentId }   — reads the .ics file off disk so the
  //                                       renderer doesn't have to stream it
  ipcMain.handle(IPC.CALENDAR_ADD_EVENT, async (_event, args: { calendarId: string; ics?: string; attachmentId?: string }) => {
    if (!args?.calendarId) return { success: false, error: 'calendarId required' }
    let ics = args.ics
    if (!ics && args.attachmentId) {
      const att = db.prepare('SELECT local_path FROM attachments WHERE id = ?').get(args.attachmentId) as { local_path: string } | undefined
      if (!att?.local_path) return { success: false, error: 'Attachment not found' }
      try {
        const fs = await import('fs')
        ics = fs.readFileSync(att.local_path, 'utf-8')
      } catch (err) {
        return { success: false, error: `Cannot read .ics: ${(err as Error).message}` }
      }
    }
    if (!ics) return { success: false, error: 'Either ics or attachmentId is required' }
    return sync.addEventToCalendar(args.calendarId, ics)
  })

  ipcMain.handle(IPC.CALENDAR_CONNECT_GOOGLE, () => {
    return {
      success: false,
      error: 'oauth-creds-required',
      message: 'Google Calendar needs a Google Cloud Console OAuth client. ' +
        'Create one at console.cloud.google.com → APIs & Services → Credentials, ' +
        'then paste client_id and client_secret in Settings → Calendar → Google.'
    }
  })
}
