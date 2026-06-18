import type { Message } from '@shared/types/mail'
import { formatDate } from '../../lib/date-utils'
import { formatAddress } from '../../lib/contact-utils'

interface Props {
  message: Message
}

export function MessageHeader({ message }: Props) {
  const senderName = message.from.name || message.from.address

  return (
    <div className="mb-3">
      <div className="flex items-center gap-1.5">
        <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--ink)' }}>
          {senderName}
        </span>
        <span style={{ fontSize: '13px', color: 'var(--ink-tertiary)' }}>
          &lt;{message.from.address}&gt;
        </span>
        <span className="font-mono ml-auto flex-shrink-0" style={{ fontSize: '12px', color: 'var(--ink-tertiary)' }}>
          {formatDate(message.date)}
        </span>
      </div>
      <div style={{ fontSize: '13px', color: 'var(--ink-tertiary)' }}>
        to {message.to.map(formatAddress).join(', ')}
        {message.cc.length > 0 && `, cc: ${message.cc.map(formatAddress).join(', ')}`}
      </div>
    </div>
  )
}
