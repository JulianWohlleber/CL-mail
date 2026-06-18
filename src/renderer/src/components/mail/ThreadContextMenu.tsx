import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { Thread } from '@shared/types/mail'
import { useMailStore } from '../../stores/mail.store'
import { useUIStore } from '../../stores/ui.store'

interface Props {
  thread: Thread
  x: number
  y: number
  onClose: () => void
}

export function ThreadContextMenu({ thread, x, y, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const archive = useMailStore((s) => s.archive)
  const trash = useMailStore((s) => s.trash)
  const toggleStar = useMailStore((s) => s.toggleStar)
  const toggleRead = useMailStore((s) => s.toggleRead)
  const selectThread = useMailStore((s) => s.selectThread)
  const openCompose = useUIStore((s) => s.openCompose)
  const openMoveToFolder = useUIStore((s) => s.openMoveToFolder)

  // Close on outside click or Escape
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  // Sync the global selection to the right-clicked thread so actions like
  // "Move to folder…" (which read selectedThreadId from the store) target the
  // right thread, AND so the reading pane shows the same thread the menu acts on.
  useEffect(() => {
    if (useMailStore.getState().selectedThreadId !== thread.id) {
      selectThread(thread.id)
    }
  }, [thread.id, selectThread])

  // Adjust position so the menu stays inside the viewport
  const menuW = 220
  const menuH = 320
  const left = Math.min(x, window.innerWidth - menuW - 8)
  const top = Math.min(y, window.innerHeight - menuH - 8)

  const run = (fn: () => void | Promise<void>) => {
    fn()
    onClose()
  }

  const items: Array<{ label: string; shortcut?: string; onClick: () => void; divider?: boolean }> = [
    { label: 'Open', shortcut: '↵', onClick: () => selectThread(thread.id) },
    { label: thread.unread ? 'Mark as read' : 'Mark as unread', shortcut: 'U', onClick: () => toggleRead(thread.id), divider: true },
    { label: thread.starred ? 'Unstar' : 'Star', shortcut: 'S', onClick: () => toggleStar(thread.id) },
    { label: 'Archive', shortcut: 'E', onClick: () => archive(thread.id) },
    { label: 'Move to folder…', shortcut: 'M', onClick: () => openMoveToFolder(), divider: true },
    { label: 'Reply', shortcut: 'R', onClick: () => openCompose('reply', thread.id) },
    { label: 'Reply all', shortcut: '⇧R', onClick: () => openCompose('reply-all', thread.id) },
    { label: 'Forward', shortcut: 'F', onClick: () => openCompose('forward', thread.id), divider: true },
    { label: 'Move to trash', shortcut: '⌫', onClick: () => trash(thread.id) }
  ]

  const menu = (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        left,
        top,
        width: menuW,
        backgroundColor: 'var(--paper-overlay)',
        border: '1px solid var(--border)',
        borderRadius: 6,
        boxShadow: '0 6px 20px rgba(0,0,0,0.18)',
        padding: '4px 0',
        zIndex: 9999,
        fontSize: 13,
        color: 'var(--ink)'
      }}
    >
      {items.map((item, i) => (
        <div key={i}>
          <div
            onClick={() => run(item.onClick)}
            className="flex items-center justify-between px-3 py-1.5 cursor-pointer"
            style={{ transition: 'background-color 80ms' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--paper-raised)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <span>{item.label}</span>
            {item.shortcut && (
              <span className="font-mono text-2xs" style={{ color: 'var(--ink-tertiary)' }}>
                {item.shortcut}
              </span>
            )}
          </div>
          {item.divider && (
            <div style={{ borderTop: '1px solid var(--border)', margin: '4px 0' }} />
          )}
        </div>
      ))}
    </div>
  )

  return createPortal(menu, document.body)
}
