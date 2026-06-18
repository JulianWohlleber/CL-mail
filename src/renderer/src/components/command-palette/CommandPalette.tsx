import { useRef, useEffect, useState } from 'react'
import { useCommandStore, type Command } from '../../stores/command.store'

export function CommandPalette() {
  const { filteredCommands, query, setQuery, execute, close } = useCommandStore()
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex((i) => Math.min(i + 1, filteredCommands.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex((i) => Math.max(i - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        if (filteredCommands[selectedIndex]) {
          execute(filteredCommands[selectedIndex].id)
        }
        break
      case 'Escape':
        e.preventDefault()
        close()
        break
    }
  }

  // Scroll selected into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  // Group commands by category
  const grouped = groupByCategory(filteredCommands)

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[120px]" onClick={close}>
      <div className="absolute inset-0" style={{ backgroundColor: 'rgba(0,0,0,0.3)' }} />
      <div
        className="relative w-[560px] max-h-[420px] rounded-lg shadow-overlay flex flex-col overflow-hidden"
        style={{ backgroundColor: 'var(--paper-overlay)', border: '1px solid var(--border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <span className="text-sm mr-2" style={{ color: 'var(--ink-tertiary)' }}>⌘</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command…"
            className="flex-1 bg-transparent outline-none text-base"
            style={{ color: 'var(--ink)' }}
          />
        </div>

        {/* Results */}
        <div ref={listRef} className="flex-1 overflow-y-auto py-1">
          {filteredCommands.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm" style={{ color: 'var(--ink-tertiary)' }}>
              No matching commands
            </div>
          ) : (
            Object.entries(grouped).map(([category, commands]) => (
              <div key={category}>
                <div
                  className="px-4 py-1 text-2xs font-mono uppercase tracking-wide"
                  style={{ color: 'var(--ink-tertiary)' }}
                >
                  {category}
                </div>
                {commands.map((cmd) => {
                  const globalIndex = filteredCommands.indexOf(cmd)
                  return (
                    <CommandItem
                      key={cmd.id}
                      command={cmd}
                      isSelected={globalIndex === selectedIndex}
                      index={globalIndex}
                      onClick={() => execute(cmd.id)}
                      onMouseEnter={() => setSelectedIndex(globalIndex)}
                    />
                  )
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function CommandItem({
  command,
  isSelected,
  index,
  onClick,
  onMouseEnter
}: {
  command: Command
  isSelected: boolean
  index: number
  onClick: () => void
  onMouseEnter: () => void
}) {
  return (
    <div
      data-index={index}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      className="flex items-center px-4 py-1.5 cursor-pointer transition-colors"
      style={{
        backgroundColor: isSelected ? 'var(--accent-subtle)' : 'transparent'
      }}
    >
      <span className="flex-1 text-sm" style={{ color: 'var(--ink)' }}>
        {command.label}
      </span>
      {command.shortcut && (
        <span className="text-2xs font-mono" style={{ color: 'var(--ink-tertiary)' }}>
          {command.shortcut}
        </span>
      )}
    </div>
  )
}

function groupByCategory(commands: Command[]): Record<string, Command[]> {
  const groups: Record<string, Command[]> = {}
  for (const cmd of commands) {
    if (!groups[cmd.category]) groups[cmd.category] = []
    groups[cmd.category].push(cmd)
  }
  return groups
}
