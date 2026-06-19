import { useRef, useEffect, useMemo, useState } from 'react'
import { useMailStore } from '../../stores/mail.store'
import { useUIStore } from '../../stores/ui.store'
import { FOLDER_ICONS } from '@shared/constants'
import type { Folder } from '@shared/types/mail'

const FOLDER_ORDER: Record<string, number> = {
  inbox: 0,
  starred: 1,
  sent: 2,
  drafts: 3,
  archive: 4,
  spam: 5,
  trash: 6,
  custom: 7
}

export function MoveToFolderModal() {
  const close = useUIStore((s) => s.closeMoveToFolder)
  const folders = useMailStore((s) => s.folders)
  const selectedThread = useMailStore((s) => s.selectedThread)
  const selectedThreadId = useMailStore((s) => s.selectedThreadId)
  const currentFolderId = useMailStore((s) => s.currentFolderId)
  const moveTo = useMailStore((s) => s.moveTo)
  const loadFolders = useMailStore((s) => s.loadFolders)

  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Folders of the active account, excluding the thread's current folder
  const availableFolders = useMemo(() => {
    const accountId = selectedThread?.accountId
    const excludeId = selectedThread?.folderId || currentFolderId
    const pool = accountId ? folders.filter((f) => f.accountId === accountId) : folders
    return pool
      .filter((f) => f.id !== excludeId)
      .sort((a, b) => {
        const ra = FOLDER_ORDER[a.role] ?? 99
        const rb = FOLDER_ORDER[b.role] ?? 99
        if (ra !== rb) return ra - rb
        return a.name.localeCompare(b.name)
      })
  }, [folders, selectedThread, currentFolderId])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return availableFolders
    return availableFolders.filter((f) => {
      const name = f.name.toLowerCase()
      const role = f.role.toLowerCase()
      return name.includes(q) || role.includes(q)
    })
  }, [availableFolders, query])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  const handleSelect = async (folder: Folder) => {
    if (!selectedThreadId) {
      close()
      return
    }
    await moveTo(folder.id, selectedThreadId)
    close()
  }

  const canCreate = query.trim().length > 0 && filtered.length === 0
  const accountId =
    selectedThread?.accountId ||
    (currentFolderId ? folders.find((f) => f.id === currentFolderId)?.accountId : undefined)

  const handleCreateAndMove = async () => {
    const name = query.trim()
    if (!name || !accountId || creating) return
    setCreating(true)
    setCreateError(null)
    try {
      const result = await (window.api as any).createFolder(accountId, name)
      if (!result?.success) {
        setCreateError(result?.error || 'Failed to create folder')
        return
      }
      // Refresh folder list so the new folder is visible everywhere
      await loadFolders()
      if (selectedThreadId) {
        await moveTo(result.folder.id, selectedThreadId)
      }
      close()
    } catch (err) {
      setCreateError((err as Error).message)
    } finally {
      setCreating(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex((i) => Math.max(i - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        if (canCreate) {
          handleCreateAndMove()
        } else if (filtered[selectedIndex]) {
          handleSelect(filtered[selectedIndex])
        }
        break
      case 'Escape':
        e.preventDefault()
        close()
        break
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[120px]" onClick={close}>
      <div className="absolute inset-0" style={{ backgroundColor: 'rgba(0,0,0,0.3)' }} />
      <div
        className="relative w-[420px] max-h-[420px] rounded-lg shadow-overlay flex flex-col overflow-hidden"
        style={{ backgroundColor: 'var(--paper-overlay)', border: '1px solid var(--border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <span className="text-2xs font-mono uppercase tracking-wide mr-3" style={{ color: 'var(--ink-tertiary)' }}>
            Move to
          </span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search folders…"
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: 'var(--ink)' }}
          />
        </div>

        {/* Folder list */}
        <div ref={listRef} className="flex-1 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            canCreate ? (
              <div
                onClick={handleCreateAndMove}
                className="flex items-center px-4 py-1.5 cursor-pointer"
                style={{ backgroundColor: 'var(--accent-subtle)' }}
              >
                <span
                  className="w-[16px] text-center flex-shrink-0 text-xs mr-2"
                  style={{ opacity: 0.6, color: 'var(--ink-tertiary)' }}
                >
                  +
                </span>
                <span className="flex-1 text-sm truncate" style={{ color: 'var(--ink)' }}>
                  {creating ? 'Creating…' : <>Create folder &ldquo;{query.trim()}&rdquo;</>}
                </span>
                <span className="text-2xs font-mono" style={{ color: 'var(--ink-tertiary)' }}>
                  ↵
                </span>
              </div>
            ) : (
              <div className="px-4 py-6 text-center text-sm" style={{ color: 'var(--ink-tertiary)' }}>
                No matching folders
              </div>
            )
          ) : (
            filtered.map((folder, i) => {
              const icon = FOLDER_ICONS[folder.role] || FOLDER_ICONS.custom
              const isSelected = i === selectedIndex
              return (
                <div
                  key={folder.id}
                  data-index={i}
                  onClick={() => handleSelect(folder)}
                  onMouseEnter={() => setSelectedIndex(i)}
                  className="flex items-center px-4 py-1.5 cursor-pointer"
                  style={{
                    backgroundColor: isSelected ? 'var(--accent-subtle)' : 'transparent'
                  }}
                >
                  <span
                    className="w-[16px] text-center flex-shrink-0 text-xs mr-2"
                    style={{ opacity: 0.6, color: 'var(--ink-tertiary)' }}
                  >
                    {icon}
                  </span>
                  <span className="flex-1 text-sm truncate" style={{ color: 'var(--ink)' }}>
                    {folder.name.toUpperCase() === 'INBOX' ? 'Inbox' : folder.name}
                  </span>
                  {isSelected && (
                    <span className="text-2xs font-mono" style={{ color: 'var(--ink-tertiary)' }}>
                      ↵
                    </span>
                  )}
                </div>
              )
            })
          )}
        </div>

        {createError && (
          <div
            className="px-4 py-2 text-xs"
            style={{
              borderTop: '1px solid var(--border)',
              color: 'var(--danger)'
            }}
          >
            {createError}
          </div>
        )}
      </div>
    </div>
  )
}
