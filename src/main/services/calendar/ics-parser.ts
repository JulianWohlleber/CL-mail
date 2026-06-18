/**
 * Tiny iCalendar (RFC 5545) parser. Handles the fields we need to surface in
 * the UI for a single VEVENT. Recurring events: we only return the master
 * event for now; expansion is a TODO (see // RRULE comments).
 */

export interface ParsedEvent {
  uid: string
  summary: string
  description?: string
  location?: string
  organizer?: string
  start: number   // epoch ms
  end: number     // epoch ms
  allDay: boolean
  rrule?: string
}

export function parseIcs(ics: string): ParsedEvent | null {
  // Unfold continuation lines (lines starting with whitespace continue the
  // previous one, per RFC 5545 §3.1).
  const text = ics.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '')
  const lines = text.split(/\r?\n/)

  let inEvent = false
  const fields: Record<string, { value: string; params: Record<string, string> }[]> = {}
  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') { inEvent = true; continue }
    if (line === 'END:VEVENT') { inEvent = false; break }
    if (!inEvent || !line) continue

    const colonIdx = line.indexOf(':')
    if (colonIdx < 0) continue
    const left = line.slice(0, colonIdx)
    const value = line.slice(colonIdx + 1)
    const [name, ...paramParts] = left.split(';')
    const params: Record<string, string> = {}
    for (const p of paramParts) {
      const eq = p.indexOf('=')
      if (eq > 0) params[p.slice(0, eq).toUpperCase()] = p.slice(eq + 1)
    }
    const key = name.toUpperCase()
    ;(fields[key] ||= []).push({ value, params })
  }

  const first = (k: string) => fields[k]?.[0]
  if (!first('UID') || !first('DTSTART')) return null

  const dtStart = first('DTSTART')!
  const dtEnd = first('DTEND')
  const startMs = parseDt(dtStart.value, dtStart.params)
  if (startMs === null) return null
  const endMs = dtEnd ? parseDt(dtEnd.value, dtEnd.params) : startMs + 60 * 60 * 1000
  if (endMs === null) return null

  return {
    uid: first('UID')!.value,
    summary: unescape(first('SUMMARY')?.value || '(no title)'),
    description: first('DESCRIPTION') ? unescape(first('DESCRIPTION')!.value) : undefined,
    location: first('LOCATION') ? unescape(first('LOCATION')!.value) : undefined,
    organizer: first('ORGANIZER')?.value.replace(/^mailto:/i, '') || undefined,
    start: startMs,
    end: endMs,
    allDay: dtStart.params.VALUE === 'DATE',
    // RRULE: stored verbatim; UI shows "repeats" indicator. Full expansion TBD.
    rrule: first('RRULE')?.value
  }
}

function parseDt(raw: string, params: Record<string, string>): number | null {
  // DATE (all-day) — YYYYMMDD
  if (params.VALUE === 'DATE' || /^\d{8}$/.test(raw)) {
    const y = +raw.slice(0, 4), m = +raw.slice(4, 6) - 1, d = +raw.slice(6, 8)
    return Date.UTC(y, m, d)
  }
  // DATETIME — YYYYMMDDTHHMMSS[Z]
  const m = raw.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/)
  if (!m) return null
  const [, y, mo, d, h, mi, s, z] = m
  if (z === 'Z') return Date.UTC(+y, +mo - 1, +d, +h, +mi, +s)
  // No TZID handling — assume floating = local. Good enough for v1; a proper
  // tz database (IANA via Intl) is a follow-up.
  return new Date(+y, +mo - 1, +d, +h, +mi, +s).getTime()
}

function unescape(s: string): string {
  return s
    .replace(/\\n/g, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\')
}
