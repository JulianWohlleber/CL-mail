import { useState } from 'react'

const SPLITS = [
  { id: 'all', label: 'All' },
  { id: 'important', label: 'Important' },
  { id: 'newsletters', label: 'Newsletters' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'other', label: 'Other' }
]

export function SplitInbox() {
  const [activeTab, setActiveTab] = useState('all')

  return (
    <div
      className="flex items-center px-3 gap-0"
      style={{ borderBottom: '1px solid var(--border)' }}
    >
      {SPLITS.map((split) => (
        <button
          key={split.id}
          onClick={() => setActiveTab(split.id)}
          className="px-2 py-1.5 text-xs transition-colors relative"
          style={{
            color: activeTab === split.id ? 'var(--accent)' : 'var(--ink-tertiary)',
            fontWeight: activeTab === split.id ? 600 : 400
          }}
        >
          {split.label}
          {activeTab === split.id && (
            <div
              className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full"
              style={{ backgroundColor: 'var(--accent)' }}
            />
          )}
        </button>
      ))}
    </div>
  )
}
