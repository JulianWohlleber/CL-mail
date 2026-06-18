import { useState } from 'react'
import type { Message } from '@shared/types/mail'
import { MessageHeader } from './MessageHeader'
import { MessageBubble } from './MessageBubble'
import { formatDate } from '../../lib/date-utils'

interface Props {
  message: Message
  /** Whether this message should start expanded. Typically only the newest. */
  defaultExpanded?: boolean
}

export function CollapsibleMessage({ message, defaultExpanded = false }: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  if (expanded) {
    return (
      <div>
        <div
          className="cursor-pointer"
          onClick={() => setExpanded(false)}
          title="Click to collapse"
        >
          <MessageHeader message={message} />
        </div>
        <MessageBubble message={message} />
      </div>
    )
  }

  // Collapsed: single-line preview that expands on click.
  const senderName = message.from.name || message.from.address
  const preview = (message.snippet || message.bodyText || '').trim().slice(0, 140)

  return (
    <button
      onClick={() => setExpanded(true)}
      className="w-full text-left transition-colors"
      style={{
        backgroundColor: 'var(--paper-raised)',
        border: '1px solid var(--border)',
        borderRadius: 6,
        padding: '10px 14px',
        cursor: 'pointer'
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--border-strong)')}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span
          className="font-bold flex-shrink-0"
          style={{ fontSize: 13, color: 'var(--ink)' }}
        >
          {senderName}
        </span>
        <span
          className="truncate"
          style={{ fontSize: 13, color: 'var(--ink-tertiary)' }}
        >
          {preview}
        </span>
        <span
          className="font-mono flex-shrink-0 ml-auto"
          style={{ fontSize: 11, color: 'var(--ink-tertiary)' }}
        >
          {formatDate(message.date)}
        </span>
      </div>
    </button>
  )
}
