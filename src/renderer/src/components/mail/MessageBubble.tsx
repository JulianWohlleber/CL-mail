import { useMemo } from 'react'
import type { Message } from '@shared/types/mail'
import { sanitizeHtml } from '../../lib/html-sanitizer'
import { AttachmentChip } from './AttachmentChip'
import { CalendarInviteChip, isCalendarInvite } from './CalendarInviteChip'
import { extractCalendlyEvent } from '../../lib/event-extractor'

interface Props {
  message: Message
}

export function MessageBubble({ message }: Props) {
  const sanitized = useMemo(() => {
    if (message.bodyHtml) {
      return sanitizeHtml(message.bodyHtml)
    }
    return message.bodyText
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br />')
  }, [message.bodyHtml, message.bodyText])

  const calendarAttachments = message.attachments?.filter(isCalendarInvite) || []
  const otherAttachments = message.attachments?.filter((a) => !isCalendarInvite(a)) || []

  // If there's no ICS attachment, try to extract an event from the body (e.g. Calendly)
  const extractedEvent = useMemo(
    () => (calendarAttachments.length === 0 ? extractCalendlyEvent(message) : null),
    [message, calendarAttachments.length]
  )

  return (
    <div>
      <div
        className="email-body-card"
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          padding: '20px 24px',
          border: '1px solid var(--border)'
        }}
      >
        <div
          className="email-body"
          dangerouslySetInnerHTML={{ __html: sanitized }}
        />
      </div>

      {/* Calendar invites (from .ics attachments) */}
      {calendarAttachments.length > 0 && (
        <div className="flex flex-col gap-1.5 mt-3">
          {calendarAttachments.map((att) => (
            <CalendarInviteChip key={att.id} attachment={att} />
          ))}
        </div>
      )}

      {/* Extracted event (e.g. Calendly notification with no .ics) */}
      {extractedEvent && (
        <div className="flex flex-col gap-1.5 mt-3">
          <CalendarInviteChip event={extractedEvent} />
        </div>
      )}

      {/* Other attachments */}
      {otherAttachments.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {otherAttachments.map((att) => (
            <AttachmentChip key={att.id} attachment={att} />
          ))}
        </div>
      )}
    </div>
  )
}
