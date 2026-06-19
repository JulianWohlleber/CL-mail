/**
 * Minimal CalDAV client. Implemented with raw fetch so we don't pull in a
 * native-binding dependency (Electron + better-sqlite3 already strain
 * @electron/rebuild). Speaks just enough of RFC 4791 and RFC 6638 to:
 *
 *   - Discover calendars under a principal URL (PROPFIND, depth=1)
 *   - List events in a time window (REPORT calendar-query)
 *   - Fetch a single ICS resource (GET)
 *
 * Authentication: Basic only — fine for iCloud (app-specific password),
 * Nextcloud, FastMail, Posteo, Mailbox.org etc. OAuth providers (Google)
 * use a separate code path (calendar/google-client.ts).
 */

interface BasicAuth { username: string; password: string }

export interface DiscoveredCalendar {
  url: string
  displayName: string
  color?: string
  ctag?: string
}

export class CalDavClient {
  private auth: BasicAuth
  private baseUrl: string

  constructor(baseUrl: string, auth: BasicAuth) {
    this.baseUrl = baseUrl.replace(/\/+$/, '')
    this.auth = auth
  }

  private get authHeader(): string {
    const token = Buffer.from(`${this.auth.username}:${this.auth.password}`).toString('base64')
    return `Basic ${token}`
  }

  private async dav(
    url: string,
    method: string,
    body: string,
    extraHeaders: Record<string, string> = {}
  ): Promise<string> {
    const res = await fetch(url, {
      method,
      headers: {
        'Authorization': this.authHeader,
        'Content-Type': 'application/xml; charset=utf-8',
        'User-Agent': 'mail_/0.1',
        ...extraHeaders
      },
      body
    })
    if (res.status >= 400) {
      const text = await res.text().catch(() => '')
      throw new Error(`CalDAV ${method} ${url} → ${res.status}: ${text.slice(0, 300)}`)
    }
    return res.text()
  }

  /**
   * Discover the calendar-home-set (a folder containing calendars), then list
   * its child collections. Falls back to scanning the base URL itself.
   */
  async discoverCalendars(): Promise<DiscoveredCalendar[]> {
    // Step 1: PROPFIND on the principal URL to find the calendar-home-set.
    const principalBody = `<?xml version="1.0"?>
      <propfind xmlns="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
        <prop>
          <c:calendar-home-set/>
          <current-user-principal/>
        </prop>
      </propfind>`
    let homeUrls: string[] = []
    try {
      const xml = await this.dav(this.baseUrl, 'PROPFIND', principalBody, { Depth: '0' })
      const matches = xml.match(/<(?:[a-z]+:)?href[^>]*>([^<]+)<\/(?:[a-z]+:)?href>/gi) || []
      homeUrls = matches
        .map((m) => m.replace(/<\/?(?:[a-z]+:)?href[^>]*>/gi, '').trim())
        .map((u) => (u.startsWith('http') ? u : new URL(u, this.baseUrl).toString()))
        .filter(Boolean)
    } catch (e) {
      // Some servers (Nextcloud) expect us to PROPFIND the base URL directly.
      console.warn('[CalDAV] principal PROPFIND failed, falling back to base URL:', (e as Error).message)
      homeUrls = [this.baseUrl]
    }
    if (homeUrls.length === 0) homeUrls = [this.baseUrl]

    // Step 2: PROPFIND depth=1 on each candidate home to list calendars.
    const listBody = `<?xml version="1.0"?>
      <propfind xmlns="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav" xmlns:cs="http://calendarserver.org/ns/" xmlns:ic="http://apple.com/ns/ical/">
        <prop>
          <displayname/>
          <resourcetype/>
          <c:supported-calendar-component-set/>
          <cs:getctag/>
          <ic:calendar-color/>
        </prop>
      </propfind>`

    const calendars: DiscoveredCalendar[] = []
    const seen = new Set<string>()
    for (const home of homeUrls) {
      try {
        const xml = await this.dav(home, 'PROPFIND', listBody, { Depth: '1' })
        // crude per-response parsing
        const responses = xml.split(/<(?:[a-z]+:)?response[^>]*>/i).slice(1)
        for (const r of responses) {
          if (!/<(?:[a-z]+:)?calendar\b/i.test(r)) continue
          if (!/VEVENT/i.test(r)) continue
          const hrefMatch = r.match(/<(?:[a-z]+:)?href[^>]*>([^<]+)/i)
          const nameMatch = r.match(/<(?:[a-z]+:)?displayname[^>]*>([^<]+)/i)
          const ctagMatch = r.match(/<(?:cs:|[a-z]+:)?getctag[^>]*>([^<]+)/i)
          const colorMatch = r.match(/calendar-color[^>]*>(#?[A-Fa-f0-9]{3,9})/i)
          if (!hrefMatch) continue
          let url = hrefMatch[1].trim()
          if (!url.startsWith('http')) url = new URL(url, home).toString()
          if (seen.has(url)) continue
          seen.add(url)
          calendars.push({
            url,
            displayName: nameMatch ? decodeXmlEntities(nameMatch[1].trim()) : url.split('/').filter(Boolean).pop() || url,
            ctag: ctagMatch ? ctagMatch[1].trim() : undefined,
            color: colorMatch ? colorMatch[1].trim().slice(0, 7) : undefined
          })
        }
      } catch (e) {
        console.warn(`[CalDAV] list calendars failed at ${home}:`, (e as Error).message)
      }
    }

    return calendars
  }

  /**
   * Create a new event by PUTing an .ics resource to the calendar. Returns the
   * canonical URL of the created resource.
   *
   * The filename is derived from a fresh UUID; some servers ignore the path
   * and assign their own, in which case we still get a 201 with a Location
   * header (RFC 4918 §9.7.1).
   */
  async putEvent(calendarUrl: string, ics: string): Promise<string> {
    const filename = `${randomEventName()}.ics`
    const url = calendarUrl.replace(/\/$/, '') + '/' + filename
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: this.authHeader,
        'Content-Type': 'text/calendar; charset=utf-8',
        'If-None-Match': '*' // refuse to clobber an existing resource
      },
      body: ics
    })
    if (res.status >= 400) {
      const text = await res.text().catch(() => '')
      throw new Error(`CalDAV PUT ${url} → ${res.status}: ${text.slice(0, 300)}`)
    }
    return res.headers.get('Location') || url
  }

}

/**
 * Build a candidate principal URL from a generic provider string.
 * iCloud:    https://caldav.icloud.com/
 * Nextcloud: <server>/remote.php/dav/calendars/<user>/
 * Custom:    whatever the user typed.
 */
export function buildCaldavPrincipalUrl(opts: {
  provider: 'icloud' | 'nextcloud' | 'caldav'
  serverUrl?: string
  username: string
}): string {
  if (opts.provider === 'icloud') {
    return `https://caldav.icloud.com/`
  }
  if (opts.provider === 'nextcloud') {
    const server = (opts.serverUrl || '').replace(/\/+$/, '')
    if (!server) throw new Error('Nextcloud server URL is required')
    return `${server}/remote.php/dav/calendars/${encodeURIComponent(opts.username)}/`
  }
  if (!opts.serverUrl) throw new Error('CalDAV server URL is required')
  return opts.serverUrl
}

function randomEventName(): string {
  // 16 hex chars — short, URL-safe, no UUID dependency.
  const chars = '0123456789abcdef'
  let s = ''
  for (let i = 0; i < 16; i++) s += chars[Math.floor(Math.random() * 16)]
  return s
}

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
}
