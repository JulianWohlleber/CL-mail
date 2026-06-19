import { useRef, useCallback } from 'react'
import { useSearchStore } from '../../stores/search.store'
import { useMailStore } from '../../stores/mail.store'

export function SearchBar() {
  const { query, setQuery, search, isOpen, open, close } = useSearchStore()
  const selectThread = useMailStore((s) => s.selectThread)
  const applySearch = useMailStore((s) => s.applySearch)
  const exitSearch = useMailStore((s) => s.exitSearch)
  const results = useSearchStore((s) => s.results)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value
      setQuery(val)
      search(val)
      // If user clears the search bar, also leave search-results mode.
      if (!val.trim()) exitSearch()
    },
    [setQuery, search, exitSearch]
  )

  // Filter the main thread list to results for the current query.
  // Closes the dropdown but keeps the query in the search bar so the user
  // can refine.
  const applyAndClose = (q: string) => {
    applySearch(q)
    close()
    inputRef.current?.blur()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      close()
      inputRef.current?.blur()
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      if (query.trim()) applyAndClose(query)
    }
  }

  // Blur search input when clicking outside so keyboard shortcuts work
  const handleBlur = () => {
    if (!query) close()
  }

  return (
    <div className="relative">
      <div
        className="flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors"
        style={{
          backgroundColor: 'var(--paper-raised)',
          border: `1px solid ${isOpen ? 'var(--accent)' : 'var(--border)'}`
        }}
      >
        <span className="text-xs" style={{ color: 'var(--ink-tertiary)', opacity: 0.6 }}>⌕</span>
        <input
          ref={inputRef}
          value={query}
          onChange={handleChange}
          onFocus={open}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder="Search mail…"
          className="flex-1 bg-transparent outline-none text-sm"
          style={{ color: 'var(--ink)' }}
          /* Opt out of the empty-input shortcut passthrough: while the search
             box is focused, every key (except Escape) types into it. */
          data-disable-shortcuts="true"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); close() }}
            className="text-xs"
            style={{ color: 'var(--ink-tertiary)' }}
          >
            ✕
          </button>
        )}
        <span className="kbd text-2xs">/</span>
      </div>

      {/* Operator hints — visible while the box is focused but empty (sprint #6) */}
      {isOpen && !query && (
        <div
          className="absolute top-full left-0 right-0 mt-1 rounded-md shadow-elevated z-30 px-3 py-2"
          style={{ backgroundColor: 'var(--paper-overlay)', border: '1px solid var(--border)' }}
        >
          <div className="text-2xs mb-1 font-mono uppercase" style={{ color: 'var(--ink-tertiary)' }}>
            Filters
          </div>
          <div className="text-xs space-y-0.5" style={{ color: 'var(--ink-secondary)' }}>
            <div><code>from:hannes</code> — restrict by sender</div>
            <div><code>subject:invoice</code> — restrict by subject</div>
            <div><code>has:attachment</code> · <code>has:unread</code> · <code>has:starred</code></div>
            <div className="opacity-60 mt-1">Combine operators with free text, e.g. <code>from:hannes Q3</code>.</div>
          </div>
        </div>
      )}

      {/* Search results dropdown */}
      {isOpen && results.length > 0 && (
        <div
          className="absolute top-full left-0 right-0 mt-1 rounded-md shadow-elevated overflow-hidden z-30"
          style={{ backgroundColor: 'var(--paper-overlay)', border: '1px solid var(--border)' }}
        >
          {/* Footer-style "show all results" entry pinned at the top */}
          <div
            onClick={() => applyAndClose(query)}
            className="px-3 py-2 cursor-pointer flex items-center justify-between"
            style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--accent-subtle)' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--paper-raised)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--accent-subtle)')}
          >
            <span className="text-sm" style={{ color: 'var(--accent)', fontWeight: 600 }}>
              Filter list to all {results.length} results
            </span>
            <span className="text-2xs font-mono" style={{ color: 'var(--ink-tertiary)' }}>↵</span>
          </div>

          {results.slice(0, 8).map((result) => (
            <div
              key={result.messageId}
              onClick={() => {
                // Filter the main list AND jump to this specific thread.
                applySearch(query)
                selectThread(result.threadId)
                close()
                inputRef.current?.blur()
              }}
              className="px-3 py-2 cursor-pointer transition-colors"
              style={{ borderBottom: '1px solid var(--border)' }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--paper-raised)'
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = ''
              }}
            >
              <div className="flex items-center gap-1">
                <span className="text-sm font-bold truncate" style={{ color: 'var(--ink)' }}>
                  {result.fromName || result.fromAddress}
                </span>
                <span className="text-2xs font-mono" style={{ color: 'var(--ink-tertiary)' }}>
                  {new Date(result.date).toLocaleDateString()}
                </span>
              </div>
              <div className="text-sm truncate" style={{ color: 'var(--ink-secondary)' }}>
                {result.subject}
              </div>
              <div className="text-xs truncate" style={{ color: 'var(--ink-tertiary)' }}>
                {result.snippet}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
