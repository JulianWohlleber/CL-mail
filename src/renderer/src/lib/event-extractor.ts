/**
 * Extract calendar-event details from email bodies when there is no .ics attachment.
 * Currently supports Calendly "New Event" notification emails.
 */

import type { Message } from '@shared/types/mail'

export interface ExtractedEvent {
  title: string
  start: number
  end?: number
  location?: string
  description?: string
  organizerEmail?: string
  organizerName?: string
}

/**
 * Detect a Calendly notification email and extract event details from the body text.
 * Returns null if the message is not a Calendly event or cannot be parsed.
 */
export function extractCalendlyEvent(message: Message): ExtractedEvent | null {
  const fromAddress = message.from?.address?.toLowerCase() || ''
  const subject = message.subject || ''
  const body = message.bodyText || ''

  const isCalendly =
    fromAddress.includes('calendly.com') ||
    /^new event:/i.test(subject) ||
    /A new event has been scheduled/i.test(body)

  if (!isCalendly) return null

  // Title: either from subject ("New Event: X") or from the "Event Type:" field
  let title = ''
  const subjMatch = subject.match(/^new event:\s*(.+)$/i)
  if (subjMatch) title = subjMatch[1].trim()

  const typeMatch = body.match(/Event Type:\s*\n?\s*([^\n]+)/i)
  const eventType = typeMatch ? typeMatch[1].trim() : ''

  const inviteeMatch = body.match(/Invitee:\s*\n?\s*([^\n]+)/i)
  const inviteeName = inviteeMatch ? inviteeMatch[1].trim() : ''

  if (!title && eventType) title = eventType
  if (inviteeName && eventType) title = `${eventType} with ${inviteeName}`

  if (!title) return null

  // Date/time line — tolerant of formats like:
  //   "10:00 - Thursday, 2 April 2026 (Central European Time)"
  //   "10:00 AM - Thursday, April 2, 2026 (Eastern Time)"
  const dateMatch = body.match(/Event Date\/Time:\s*\n?\s*([^\n]+)/i)
  if (!dateMatch) return null
  const dateLine = dateMatch[1].trim()

  const start = parseCalendlyDate(dateLine)
  if (!start) return null

  // Duration from event type (e.g. "25 Minute Meeting")
  let durationMs = 30 * 60 * 1000
  const minMatch = (eventType || title).match(/(\d+)\s*(?:min|minute)/i)
  if (minMatch) durationMs = parseInt(minMatch[1], 10) * 60 * 1000
  const hrMatch = (eventType || title).match(/(\d+)\s*(?:hr|hour)/i)
  if (hrMatch) durationMs = parseInt(hrMatch[1], 10) * 60 * 60 * 1000

  const locMatch = body.match(/Location:\s*\n?\s*([^\n]+)/i)
  const location = locMatch ? locMatch[1].trim() : undefined

  const emailMatch = body.match(/Invitee Email:\s*\n?\s*([^\s\n[]+)/i)
  const organizerEmail = emailMatch ? emailMatch[1].trim() : undefined

  return {
    title,
    start,
    end: start + durationMs,
    location,
    description: `Scheduled via Calendly.\n\n${dateLine}`,
    organizerEmail,
    organizerName: inviteeName || undefined
  }
}

/**
 * Parse a Calendly date/time string into an epoch-ms number.
 * Example: "10:00 - Thursday, 2 April 2026 (Central European Time)"
 * Strategy: extract time + date parts, construct a Date in the assumed local timezone.
 * (We can't fully resolve named timezones without a TZ library; fall back to local.)
 */
function parseCalendlyDate(line: string): number | null {
  // Strip the trailing "(Timezone)"
  const cleaned = line.replace(/\([^)]*\)\s*$/, '').trim()

  // Try ISO-ish patterns first
  const iso = Date.parse(cleaned)
  if (!Number.isNaN(iso)) return iso

  // Pattern: "HH:MM - Weekday, D Month YYYY"
  const m = cleaned.match(
    /(\d{1,2}):(\d{2})(?:\s*(am|pm))?\s*-\s*[a-zA-Z]+,?\s*(\d{1,2})\s+([a-zA-Z]+)\s+(\d{4})/i
  )
  if (m) {
    let hh = parseInt(m[1], 10)
    const mm = parseInt(m[2], 10)
    const ampm = m[3]?.toLowerCase()
    if (ampm === 'pm' && hh < 12) hh += 12
    if (ampm === 'am' && hh === 12) hh = 0
    const day = parseInt(m[4], 10)
    const month = monthIndex(m[5])
    const year = parseInt(m[6], 10)
    if (month < 0) return null
    return new Date(year, month, day, hh, mm).getTime()
  }

  // Pattern: "HH:MM - Weekday, Month D, YYYY" (US-style)
  const m2 = cleaned.match(
    /(\d{1,2}):(\d{2})(?:\s*(am|pm))?\s*-\s*[a-zA-Z]+,?\s*([a-zA-Z]+)\s+(\d{1,2}),?\s+(\d{4})/i
  )
  if (m2) {
    let hh = parseInt(m2[1], 10)
    const mm = parseInt(m2[2], 10)
    const ampm = m2[3]?.toLowerCase()
    if (ampm === 'pm' && hh < 12) hh += 12
    if (ampm === 'am' && hh === 12) hh = 0
    const month = monthIndex(m2[4])
    const day = parseInt(m2[5], 10)
    const year = parseInt(m2[6], 10)
    if (month < 0) return null
    return new Date(year, month, day, hh, mm).getTime()
  }

  return null
}

function monthIndex(name: string): number {
  const months = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december'
  ]
  const idx = months.indexOf(name.toLowerCase())
  if (idx >= 0) return idx
  // short forms
  const shortMonths = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
  return shortMonths.indexOf(name.toLowerCase().slice(0, 3))
}
