import { useState } from 'react'
import { useMailStore } from '../../stores/mail.store'
import { useUIStore } from '../../stores/ui.store'
import { CollapsibleMessage } from '../mail/CollapsibleMessage'
import { FirstRunHint } from '../shared/FirstRunHint'
import { SnoozeBanner } from '../snooze/SnoozeBanner'
import { ReminderPopover } from '../mail/ReminderPopover'

export function ReadingPane() {
  const selectedThread = useMailStore((s) => s.selectedThread)
  const archive = useMailStore((s) => s.archive)
  const trash = useMailStore((s) => s.trash)
  const toggleStar = useMailStore((s) => s.toggleStar)
  const toggleRead = useMailStore((s) => s.toggleRead)
  const openCompose = useUIStore((s) => s.openCompose)
  const openMoveToFolder = useUIStore((s) => s.openMoveToFolder)
  const [showReminder, setShowReminder] = useState(false)

  if (!selectedThread) {
    return (
      <div className="h-full flex items-center justify-center" style={{ backgroundColor: 'var(--paper)' }}>
        <div className="text-center">
          <div style={{ fontSize: '15px', color: 'var(--ink-tertiary)' }}>
            Select a conversation to read
          </div>
          <div className="mt-2 font-mono" style={{ fontSize: '12px', color: 'var(--ink-faint)' }}>
            j/k or arrows to navigate · Enter to open · c to compose
          </div>
        </div>
      </div>
    )
  }

  const messages = selectedThread.messages || []

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: 'var(--paper)' }}>
      {/* Thread header */}
      <div className="flex-shrink-0 px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-start justify-between">
          <h1 className="flex-1" style={{ fontSize: '20px', fontWeight: 700, lineHeight: 1.3, color: 'var(--ink)' }}>
            {selectedThread.subject}
          </h1>
          <div className="flex items-center gap-1 ml-3 flex-shrink-0">
            <ActionButton title="Archive (E)" onClick={() => archive()}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>
            </ActionButton>
            <ActionButton title="Trash (#)" onClick={() => trash()}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
            </ActionButton>
            <ActionButton title="Move to folder (M)" onClick={() => openMoveToFolder()}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/></svg>
            </ActionButton>
            <ActionButton
              title={selectedThread.unread ? 'Mark as read (U)' : 'Mark as unread (U)'}
              onClick={() => toggleRead()}
            >
              {selectedThread.unread ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3" fill="currentColor" stroke="none"/></svg>
              )}
            </ActionButton>
            <ActionButton
              title="Star (S)"
              onClick={() => toggleStar()}
              active={!!selectedThread.starred}
            >
              {selectedThread.starred ? '★' : '☆'}
            </ActionButton>
            <div className="relative">
              <ActionButton title="Remind me" onClick={() => setShowReminder(!showReminder)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              </ActionButton>
              {showReminder && (
                <ReminderPopover threadId={selectedThread.id} onClose={() => setShowReminder(false)} />
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="font-mono" style={{ fontSize: '12px', color: 'var(--ink-tertiary)' }}>
            {messages.length} message{messages.length !== 1 ? 's' : ''}
          </span>
          {selectedThread.snoozedUntil && (
            <SnoozeBanner wakeAt={selectedThread.snoozedUntil} threadId={selectedThread.id} />
          )}
        </div>
      </div>

      {/* Messages — only the newest is expanded by default; older messages
          collapse to a one-line preview the user can click to expand. */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-6 py-5 space-y-2">
          <FirstRunHint />
          {messages.map((message, index) => {
            const isLast = index === messages.length - 1
            return (
              <CollapsibleMessage
                key={message.id}
                message={message}
                defaultExpanded={isLast}
              />
            )
          })}
        </div>
      </div>

      {/* Quick reply bar */}
      <div
        className="flex-shrink-0 px-6 py-3 flex items-center gap-2"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        <button
          onClick={() => openCompose('reply', selectedThread.id)}
          className="px-4 py-2 rounded-md transition-colors"
          style={{
            fontSize: '14px',
            backgroundColor: 'var(--paper-raised)',
            color: 'var(--ink-secondary)',
            border: '1px solid var(--border)'
          }}
        >
          ↩ Reply
        </button>
        <button
          onClick={() => openCompose('reply-all', selectedThread.id)}
          className="px-4 py-2 rounded-md transition-colors"
          style={{
            fontSize: '14px',
            backgroundColor: 'var(--paper-raised)',
            color: 'var(--ink-secondary)',
            border: '1px solid var(--border)'
          }}
        >
          ↩↩ Reply All
        </button>
        <button
          onClick={() => openCompose('forward', selectedThread.id)}
          className="px-4 py-2 rounded-md transition-colors"
          style={{
            fontSize: '14px',
            backgroundColor: 'var(--paper-raised)',
            color: 'var(--ink-secondary)',
            border: '1px solid var(--border)'
          }}
        >
          → Forward
        </button>
      </div>
    </div>
  )
}

function ActionButton({ children, onClick, title, active }: {
  children: React.ReactNode
  onClick: () => void
  title: string
  active?: boolean
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="w-[30px] h-[30px] flex items-center justify-center rounded transition-colors"
      style={{
        fontSize: '15px',
        color: active ? 'var(--star)' : 'var(--ink-tertiary)',
        backgroundColor: 'transparent'
      }}
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--paper-raised)')}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
    >
      {children}
    </button>
  )
}
