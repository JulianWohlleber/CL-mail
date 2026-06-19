import type { Thread } from '@shared/types/mail'
import { relativeTime } from '../../lib/date-utils'

interface Props {
  thread: Thread
  isSelected: boolean
  isChecked?: boolean
  onClick: (e: React.MouseEvent) => void
  onContextMenu?: (e: React.MouseEvent) => void
}

export function ThreadItem({ thread, isSelected, isChecked, onClick, onContextMenu }: Props) {
  const sender = thread.participants?.[0]
  const rawName = sender?.name || sender?.address || 'Unknown'
  const senderName = rawName.includes('@') ? rawName.split('@')[0] : rawName
  const answered = !!thread.answeredByMe

  // Selected-via-checkbox takes precedence over answered for the left stripe,
  // so multi-select reads as the dominant signal.
  const leftStripe = isChecked
    ? '3px 0 0 0 var(--accent)'
    : (answered ? '3px 0 0 0 var(--accent)' : undefined)

  return (
    <div
      data-thread-id={thread.id}
      onClick={onClick}
      onContextMenu={onContextMenu}
      className={`thread-row ${isSelected ? 'selected' : ''} ${thread.unread ? 'unread' : ''} ${answered ? 'answered' : ''} ${isChecked ? 'checked' : ''}`}
      style={{
        boxShadow: leftStripe ? `inset ${leftStripe}` : undefined,
        backgroundColor: isChecked ? 'var(--accent-subtle)' : undefined
      }}
    >
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          {answered && (
            <span
              title="You replied to this thread"
              className="font-mono flex-shrink-0"
              style={{
                fontSize: '11px',
                color: 'var(--accent)',
                fontWeight: 700,
                letterSpacing: '0.02em'
              }}
            >
              ↩
            </span>
          )}
          <span
            className="truncate flex-1"
            style={{
              fontSize: '15px',
              color: thread.unread ? 'var(--ink)' : 'var(--ink-secondary)',
              fontWeight: thread.unread ? 600 : 400
            }}
          >
            {senderName}
          </span>
          {answered && (
            <span
              className="font-mono flex-shrink-0 px-1 rounded"
              style={{
                fontSize: '10px',
                color: 'var(--accent)',
                border: '1px solid var(--accent)',
                opacity: 0.85,
                lineHeight: 1.4,
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}
            >
              Replied
            </span>
          )}
          <span className="text-xs font-mono flex-shrink-0" style={{ color: 'var(--ink-tertiary)' }}>
            {relativeTime(thread.lastMessageDate)}
          </span>
        </div>
        <div
          className="truncate"
          style={{
            fontSize: '14px',
            color: thread.unread ? 'var(--ink)' : 'var(--ink-secondary)',
            fontWeight: thread.unread ? 500 : 400
          }}
        >
          {thread.subject}
        </div>
        <div className="truncate" style={{ fontSize: '13px', color: 'var(--ink-tertiary)', lineHeight: '1.4' }}>
          {thread.snippet}
        </div>
      </div>

      {/* Indicators */}
      <div className="flex flex-col items-center gap-0.5 ml-2 flex-shrink-0">
        {!!thread.starred && (
          <span style={{ fontSize: '14px', color: 'var(--star)' }}>★</span>
        )}
        {!!thread.hasAttachments && (
          <span style={{ fontSize: '13px', color: 'var(--ink-tertiary)' }}>📎</span>
        )}
        {!!thread.unread && (
          <span
            className="w-[7px] h-[7px] rounded-full"
            style={{ backgroundColor: 'var(--accent)' }}
          />
        )}
        {Number(thread.messageCount) > 1 && (
          <span className="font-mono" style={{ fontSize: '12px', color: 'var(--ink-tertiary)' }}>
            {thread.messageCount}
          </span>
        )}
      </div>
    </div>
  )
}
