import { useEffect, useRef, useState } from 'react'
import { Calendar, Add, Checkmark, ChevronDown } from '@carbon/icons-react'
import type { Attachment } from '@shared/types/mail'
import type { ExtractedEvent } from '../../lib/event-extractor'
import { eventToIcs } from '../../lib/event-to-ics'

interface CalendarOption {
  id: string
  displayName: string
  color: string | null
  accountName: string
  provider: string
}

interface Props {
  attachment?: Attachment
  event?: ExtractedEvent
}

/**
 * "Accept invite" chip shown below an email body when an .ics attachment or a
 * Calendly-style event is detected. If the user has connected CalDAV calendars
 * (iCloud / Nextcloud / generic), they can pick which calendar to drop the
 * event into. With no CalDAV configured, the chip falls back to opening the
 * macOS Calendar.app like before.
 */
export function CalendarInviteChip({ attachment, event }: Props) {
  const [calendars, setCalendars] = useState<CalendarOption[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)
  const [picked, setPicked] = useState<CalendarOption | null>(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<{ calendarName?: string; viaSystem?: boolean } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  const label = attachment?.filename || event?.title || 'Calendar event'

  // Load calendar list once.
  useEffect(() => {
    ;(window.api as any).listCalendars().then((rows: CalendarOption[]) => {
      setCalendars(rows || [])
      if (rows && rows.length > 0) setPicked(rows[0])
    }).catch(() => {})
  }, [])

  // Close picker on outside click.
  useEffect(() => {
    if (!pickerOpen) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setPickerOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [pickerOpen])

  const acceptInto = async (calendar: CalendarOption) => {
    setBusy(true); setError(null); setPickerOpen(false)
    try {
      let res: any
      if (attachment) {
        res = await (window.api as any).addCalendarEvent({ calendarId: calendar.id, attachmentId: attachment.id })
      } else if (event) {
        const ics = eventToIcs(event)
        res = await (window.api as any).addCalendarEvent({ calendarId: calendar.id, ics })
      } else {
        res = { success: false, error: 'No event or attachment' }
      }
      if (res.success) {
        setDone({ calendarName: calendar.displayName })
        setPicked(calendar)
      } else {
        setError(res.error || 'Failed to add event')
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  // Fallback: no CalDAV configured — open in macOS Calendar.app
  // (the pre-existing IPC also generates the ICS for Calendly-style events).
  const openInSystemCalendar = async () => {
    setBusy(true); setError(null)
    try {
      const res = attachment
        ? await window.api.importCalendar(attachment.id)
        : await (window.api as any).importCalendarEvent(event!)
      if (res.success) setDone({ viaSystem: true })
      else setError(res.error || 'Could not open Calendar.app')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  // --- Rendering ----------------------------------------------------------

  if (done) {
    return (
      <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--ink-tertiary)' }}>
        <Calendar size={16} style={{ flexShrink: 0 }} />
        <span className="truncate">{label}</span>
        <Checkmark size={14} style={{ color: 'var(--accent)' }} />
        <span className="text-xs" style={{ color: 'var(--accent)' }}>
          {done.viaSystem ? 'Opened in Calendar.app' : `Added to ${done.calendarName}`}
        </span>
      </div>
    )
  }

  // No CalDAV configured → single button that opens Calendar.app.
  if (calendars.length === 0) {
    return (
      <div ref={ref}>
        <button
          onClick={openInSystemCalendar}
          disabled={busy}
          className="flex items-center gap-2 text-sm"
          style={{
            background: 'none', border: 'none', padding: 0, font: 'inherit',
            color: 'var(--ink-secondary)', cursor: busy ? 'wait' : 'pointer'
          }}
        >
          <Calendar size={16} style={{ color: 'var(--ink-tertiary)', flexShrink: 0 }} />
          <span className="truncate">{label}</span>
          <span className="flex items-center gap-1" style={{ color: 'var(--ink-tertiary)', fontSize: 13 }}>
            <Add size={14} />
            {busy ? 'Opening…' : 'Add to Calendar'}
          </span>
        </button>
        <div className="text-2xs mt-0.5" style={{ color: 'var(--ink-faint)' }}>
          Tip: connect a CalDAV calendar in Settings → Calendar to add invites directly.
        </div>
        {error && <div className="text-2xs mt-0.5" style={{ color: '#c0392b' }}>{error}</div>}
      </div>
    )
  }

  // CalDAV configured → split button: accept-into-picked + dropdown picker.
  return (
    <div ref={ref} className="relative inline-flex flex-col gap-0.5">
      <div className="flex items-center gap-2 text-sm">
        <Calendar size={16} style={{ color: 'var(--ink-tertiary)', flexShrink: 0 }} />
        <span className="truncate" style={{ color: 'var(--ink-secondary)' }}>{label}</span>
        <button
          onClick={() => picked && acceptInto(picked)}
          disabled={busy || !picked}
          className="flex items-center gap-1 px-2 py-0.5 rounded font-mono"
          style={{
            fontSize: 11,
            backgroundColor: 'var(--accent-subtle)',
            color: 'var(--accent)',
            border: '1px solid var(--accent)',
            cursor: (busy || !picked) ? 'wait' : 'pointer'
          }}
        >
          <Add size={12} />
          {busy ? 'Adding…' : `Accept into ${picked?.displayName}`}
        </button>
        <button
          onClick={() => setPickerOpen((v) => !v)}
          className="flex items-center px-1 py-0.5 rounded"
          style={{
            backgroundColor: 'var(--paper-raised)',
            border: '1px solid var(--border)',
            color: 'var(--ink-tertiary)'
          }}
          title="Choose a different calendar"
        >
          <ChevronDown size={12} />
        </button>
      </div>

      {pickerOpen && (
        <div
          className="absolute left-0 top-full mt-1 rounded shadow-overlay py-1 z-30"
          style={{
            backgroundColor: 'var(--paper-overlay)',
            border: '1px solid var(--border)',
            minWidth: 260
          }}
        >
          {calendars.map((c) => (
            <button
              key={c.id}
              onClick={() => acceptInto(c)}
              className="flex items-center gap-2 w-full text-left px-3 py-1.5 text-xs"
              style={{ color: 'var(--ink)' }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--paper-raised)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <span
                className="w-[8px] h-[8px] rounded-full flex-shrink-0"
                style={{ backgroundColor: c.color || 'var(--ink-tertiary)' }}
              />
              <span className="flex-1 truncate">{c.displayName}</span>
              <span className="text-2xs" style={{ color: 'var(--ink-tertiary)' }}>{c.accountName}</span>
            </button>
          ))}
          <div style={{ borderTop: '1px solid var(--border)' }}>
            <button
              onClick={openInSystemCalendar}
              className="block w-full text-left px-3 py-1.5 text-2xs"
              style={{ color: 'var(--ink-tertiary)' }}
            >
              Or open in Calendar.app instead
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="text-2xs mt-0.5" style={{ color: '#c0392b' }}>{error}</div>
      )}
    </div>
  )
}

/** Check if an attachment is a calendar invite. */
export function isCalendarInvite(att: Attachment): boolean {
  const ct = att.contentType?.toLowerCase() || ''
  const fn = att.filename?.toLowerCase() || ''
  return (
    ct.includes('calendar') ||
    ct.includes('text/calendar') ||
    ct === 'application/ics' ||
    fn.endsWith('.ics') ||
    fn.endsWith('.ical') ||
    fn.endsWith('.ifb') ||
    fn.endsWith('.icalendar')
  )
}
