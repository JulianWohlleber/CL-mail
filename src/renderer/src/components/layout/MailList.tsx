import { useRef, useEffect, useState } from 'react'
import { useMailStore } from '../../stores/mail.store'
import { ThreadItem } from '../mail/ThreadItem'
import { ThreadContextMenu } from '../mail/ThreadContextMenu'
import { SearchBar } from '../search/SearchBar'
import type { Thread } from '@shared/types/mail'

export function MailList() {
  const threads = useMailStore((s) => s.threads)
  const selectedThreadId = useMailStore((s) => s.selectedThreadId)
  const selectThread = useMailStore((s) => s.selectThread)
  const loading = useMailStore((s) => s.loading)
  const currentFolderRole = useMailStore((s) => s.currentFolderRole)
  const selectedIds = useMailStore((s) => s.selectedIds)
  const toggleSelect = useMailStore((s) => s.toggleSelect)
  const selectAllThreads = useMailStore((s) => s.selectAllThreads)
  const clearSelection = useMailStore((s) => s.clearSelection)
  const archive = useMailStore((s) => s.archive)
  const trash = useMailStore((s) => s.trash)
  const searchQuery = useMailStore((s) => s.searchQuery)
  const exitSearch = useMailStore((s) => s.exitSearch)
  const listRef = useRef<HTMLDivElement>(null)
  const [ctxMenu, setCtxMenu] = useState<{ thread: Thread; x: number; y: number } | null>(null)
  const selectedSet = new Set(selectedIds)

  // Scroll selected thread into view
  useEffect(() => {
    if (!selectedThreadId || !listRef.current) return
    const el = listRef.current.querySelector(`[data-thread-id="${selectedThreadId}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [selectedThreadId])

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: 'var(--paper)' }}>
      {/* Search bar */}
      <div className="flex-shrink-0 px-3 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
        <SearchBar />
      </div>

      {/* Search-mode banner — visible whenever the list is filtered by a query */}
      {searchQuery && (
        <div
          className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5"
          style={{ backgroundColor: 'var(--accent-subtle)', borderBottom: '1px solid var(--border)' }}
        >
          <span className="text-xs" style={{ color: 'var(--accent)' }}>
            <b>Search:</b> "{searchQuery}"
          </span>
          <span className="text-xs" style={{ color: 'var(--ink-tertiary)' }}>
            · {threads.length} thread{threads.length === 1 ? '' : 's'}
          </span>
          <div className="flex-1" />
          <button
            onClick={() => exitSearch()}
            className="text-xs"
            style={{ color: 'var(--ink-tertiary)', textDecoration: 'underline' }}
            title="Return to the previous folder (Esc)"
          >
            Exit search
          </button>
        </div>
      )}

      {/* Selection action bar — appears when bulk-selection is active */}
      {selectedIds.length > 0 && (
        <div
          className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5"
          style={{ backgroundColor: 'var(--accent-subtle)', borderBottom: '1px solid var(--border)' }}
        >
          <span className="text-xs font-bold" style={{ color: 'var(--accent)' }}>
            {selectedIds.length} selected
          </span>
          <button
            onClick={() => archive()}
            className="text-xs px-2 py-0.5 rounded"
            style={{ border: '1px solid var(--border)', color: 'var(--ink-secondary)' }}
            title="Archive selected (E)"
          >
            Archive
          </button>
          <button
            onClick={() => trash()}
            className="text-xs px-2 py-0.5 rounded"
            style={{ border: '1px solid var(--border)', color: 'var(--ink-secondary)' }}
            title="Move to trash (#)"
          >
            Trash
          </button>
          <div className="flex-1" />
          <button
            onClick={() => selectAllThreads()}
            className="text-xs"
            style={{ color: 'var(--ink-tertiary)', textDecoration: 'underline' }}
          >
            All
          </button>
          <button
            onClick={() => clearSelection()}
            className="text-xs"
            style={{ color: 'var(--ink-tertiary)', textDecoration: 'underline' }}
          >
            Clear
          </button>
        </div>
      )}

      {/* Thread list */}
      <div ref={listRef} className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-sm" style={{ color: 'var(--ink-tertiary)' }}>
              Loading…
            </span>
          </div>
        ) : threads.length === 0 ? (
          <EmptyState role={currentFolderRole} />
        ) : (
          threads.map((thread) => (
            <ThreadItem
              key={thread.id}
              thread={thread}
              isSelected={thread.id === selectedThreadId}
              isChecked={selectedSet.has(thread.id)}
              onClick={(e) => {
                // Cmd/Ctrl-click toggles checkbox; Shift-click extends the range
                // from the focus thread to this one; plain click opens.
                if (e.metaKey || e.ctrlKey) {
                  e.preventDefault()
                  toggleSelect(thread.id)
                  return
                }
                if (e.shiftKey && selectedThreadId && selectedThreadId !== thread.id) {
                  e.preventDefault()
                  const anchor = threads.findIndex((t) => t.id === selectedThreadId)
                  const target = threads.findIndex((t) => t.id === thread.id)
                  if (anchor >= 0 && target >= 0) {
                    const [lo, hi] = anchor < target ? [anchor, target] : [target, anchor]
                    const range = threads.slice(lo, hi + 1).map((t) => t.id)
                    const next = new Set([...selectedIds, ...range])
                    useMailStore.setState({ selectedIds: Array.from(next) })
                  }
                  return
                }
                ;(document.activeElement as HTMLElement)?.blur()
                selectThread(thread.id)
              }}
              onContextMenu={(e) => {
                e.preventDefault()
                setCtxMenu({ thread, x: e.clientX, y: e.clientY })
              }}
            />
          ))
        )}
      </div>

      {ctxMenu && (
        <ThreadContextMenu
          thread={ctxMenu.thread}
          x={ctxMenu.x}
          y={ctxMenu.y}
          onClose={() => setCtxMenu(null)}
        />
      )}
    </div>
  )
}

function EmptyState({ role }: { role: string }) {
  const messages: Record<string, { title: string; sub: string }> = {
    inbox: { title: 'Inbox Zero', sub: 'You\'re all caught up.' },
    sent: { title: 'No sent messages', sub: 'Messages you send will appear here.' },
    drafts: { title: 'No drafts', sub: 'Press C to start composing.' },
    trash: { title: 'Trash is empty', sub: 'Deleted messages will appear here.' },
    archive: { title: 'Archive is empty', sub: 'Archived messages will appear here.' },
    spam: { title: 'No spam', sub: 'Looking good.' }
  }

  const msg = messages[role] || { title: 'No messages', sub: '' }

  return (
    <div className="flex flex-col items-center justify-center h-full px-4 text-center">
      <div className="text-xl font-bold mb-1" style={{ color: 'var(--ink)' }}>
        {msg.title}
      </div>
      <div className="text-sm" style={{ color: 'var(--ink-tertiary)' }}>
        {msg.sub}
      </div>
      {role === 'inbox' && (
        <div className="mt-4 text-[80px] leading-none opacity-10">
          ✓
        </div>
      )}
    </div>
  )
}
