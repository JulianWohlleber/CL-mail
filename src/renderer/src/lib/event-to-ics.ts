import type { ExtractedEvent } from './event-extractor'

/**
 * Build an RFC 5545 ICS string from an event we extracted from an email body
 * (Calendly etc.). The result is what we PUT to the user's CalDAV calendar.
 */
export function eventToIcs(ev: ExtractedEvent): string {
  const toIcsDate = (ms: number): string => {
    const d = new Date(ms)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  }
  const esc = (s: string | undefined): string =>
    (s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')

  const dtStart = toIcsDate(ev.start)
  const dtEnd = toIcsDate(ev.end || ev.start + 30 * 60 * 1000)
  const dtStamp = toIcsDate(Date.now())
  // UUID for the UID — crypto.randomUUID is available in modern browsers.
  const uid = (crypto as any).randomUUID
    ? (crypto as any).randomUUID() + '@mail_'
    : Math.random().toString(36).slice(2) + '@mail_'

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//mail_//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${esc(ev.title)}`
  ]
  if (ev.location) lines.push(`LOCATION:${esc(ev.location)}`)
  if (ev.description) lines.push(`DESCRIPTION:${esc(ev.description)}`)
  if (ev.organizerEmail) {
    const cn = ev.organizerName ? `CN=${esc(ev.organizerName)}:` : ''
    lines.push(`ORGANIZER;${cn}mailto:${ev.organizerEmail}`)
  }
  lines.push('END:VEVENT', 'END:VCALENDAR')

  return lines.join('\r\n')
}
