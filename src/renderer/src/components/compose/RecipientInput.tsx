import { useState, useRef, useEffect, useCallback } from 'react'

interface Contact {
  name: string
  address: string
  source: 'inbox' | 'contacts'
  frequency: number
}

interface Props {
  value: string[]
  onChange: (addresses: string[]) => void
  placeholder?: string
  autoFocus?: boolean
  inputRef?: React.RefObject<HTMLInputElement | null>
}

export function RecipientInput({ value, onChange, placeholder, autoFocus, inputRef }: Props) {
  const [input, setInput] = useState('')
  const [suggestions, setSuggestions] = useState<Contact[]>([])
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const localRef = useRef<HTMLInputElement>(null)
  const ref = inputRef || localRef
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()
  const containerRef = useRef<HTMLDivElement>(null)

  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 1) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }
    try {
      const results = await (window.api as any).suggestContacts(query)
      if (!Array.isArray(results)) {
        console.warn('[RecipientInput] suggestContacts returned non-array:', results)
        setSuggestions([])
        return
      }
      // Filter out addresses already added
      const existing = new Set(value.map(a => a.toLowerCase()))
      const filtered = results.filter((c: Contact) => !existing.has(c.address.toLowerCase()))
      setSuggestions(filtered)
      setSelectedIdx(0)
      setShowSuggestions(filtered.length > 0)
    } catch (err) {
      console.error('[RecipientInput] suggestContacts error:', err)
      setSuggestions([])
    }
  }, [value])

  const handleInputChange = (text: string) => {
    setInput(text)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchSuggestions(text), 150)
  }

  const addAddress = (addr: string) => {
    const trimmed = addr.trim()
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed])
    }
    setInput('')
    setSuggestions([])
    setShowSuggestions(false)
    ref.current?.focus()
  }

  const removeAddress = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIdx(i => Math.min(i + 1, suggestions.length - 1))
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIdx(i => Math.max(i - 1, 0))
        return
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        addAddress(suggestions[selectedIdx].address)
        return
      }
      if (e.key === 'Tab') {
        e.preventDefault()
        addAddress(suggestions[selectedIdx].address)
        return
      }
    }

    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      if (input.trim()) {
        addAddress(input)
      }
      return
    }

    // Space commits address if it looks like a complete email
    if (e.key === ' ' && input.includes('@') && input.includes('.')) {
      e.preventDefault()
      addAddress(input)
      return
    }

    if (e.key === 'Tab') {
      if (input.trim()) {
        e.preventDefault()
        addAddress(input)
      }
      // If input is empty, let Tab propagate naturally to move to next field
      return
    }

    if (e.key === 'Backspace' && !input && value.length > 0) {
      removeAddress(value.length - 1)
      return
    }

    if (e.key === 'Escape') {
      setShowSuggestions(false)
    }
  }

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Also handle pasting comma-separated addresses
  const handlePaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text')
    if (text.includes(',') || text.includes(';')) {
      e.preventDefault()
      const addrs = text.split(/[,;]/).map(s => s.trim()).filter(Boolean)
      onChange([...value, ...addrs.filter(a => !value.includes(a))])
      setInput('')
    }
  }

  return (
    <div ref={containerRef} className="relative flex-1">
      <div className="flex flex-wrap items-center gap-1 min-h-[28px]">
        {value.map((addr, i) => (
          <span
            key={i}
            className="flex items-center gap-1 px-2 py-0.5 rounded"
            style={{
              fontSize: '13px',
              backgroundColor: 'var(--paper-raised)',
              border: '1px solid var(--border)',
              color: 'var(--ink-secondary)'
            }}
          >
            {addr}
            <button
              onClick={() => removeAddress(i)}
              className="ml-0.5 opacity-50 hover:opacity-100"
              style={{ fontSize: '11px', color: 'var(--ink-tertiary)' }}
            >
              ✕
            </button>
          </span>
        ))}
        <input
          ref={ref}
          value={input}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onFocus={() => { if (input.length >= 1) fetchSuggestions(input) }}
          autoFocus={autoFocus}
          className="flex-1 bg-transparent outline-none py-1 min-w-[120px]"
          style={{ fontSize: '14px', color: 'var(--ink)' }}
          placeholder={value.length === 0 ? placeholder : ''}
        />
      </div>

      {/* Autocomplete dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          className="absolute left-0 right-0 top-full mt-1 z-50 rounded-md shadow-lg py-1 max-h-[240px] overflow-y-auto"
          style={{
            backgroundColor: 'var(--paper-overlay)',
            border: '1px solid var(--border)'
          }}
        >
          {suggestions.map((contact, i) => (
            <button
              key={contact.address}
              className="w-full text-left px-3 py-2 flex items-center gap-2 transition-colors"
              style={{
                backgroundColor: i === selectedIdx ? 'var(--paper-raised)' : 'transparent',
                color: 'var(--ink)'
              }}
              onClick={() => addAddress(contact.address)}
              onMouseEnter={() => setSelectedIdx(i)}
            >
              <div className="flex-1 min-w-0">
                <div className="truncate" style={{ fontSize: '13px', fontWeight: 500 }}>
                  {contact.name || contact.address}
                </div>
                {contact.name && contact.name !== contact.address && (
                  <div className="truncate" style={{ fontSize: '12px', color: 'var(--ink-tertiary)' }}>
                    {contact.address}
                  </div>
                )}
              </div>
              <span
                className="shrink-0 font-mono"
                style={{ fontSize: '10px', color: 'var(--ink-faint)' }}
              >
                {contact.source === 'contacts' ? 'contact' : `×${contact.frequency}`}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
