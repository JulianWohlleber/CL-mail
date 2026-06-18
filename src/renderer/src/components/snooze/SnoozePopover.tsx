import { useState } from 'react'
import { getSnoozeTime, type SnoozePreset } from '@shared/types/snooze'
import { snoozeLabel } from '../../lib/date-utils'

interface Props {
  threadId: string
  onClose: () => void
}

const PRESETS: SnoozePreset[] = [
  'later_today',
  'tomorrow',
  'this_weekend',
  'next_week',
  'next_month'
]

export function SnoozePopover({ threadId, onClose }: Props) {
  const [customDate, setCustomDate] = useState('')
  const [customTime, setCustomTime] = useState('08:00')

  const handlePreset = async (preset: SnoozePreset) => {
    const wakeAt = getSnoozeTime(preset)
    await window.api.snooze(threadId, wakeAt)
    onClose()
  }

  const handleCustom = async () => {
    if (!customDate) return
    const dt = new Date(`${customDate}T${customTime}`)
    await window.api.snooze(threadId, dt.getTime())
    onClose()
  }

  return (
    <div
      className="w-[240px] rounded-lg shadow-overlay overflow-hidden"
      style={{ backgroundColor: 'var(--paper-overlay)', border: '1px solid var(--border)' }}
    >
      <div className="px-3 py-2 text-xs font-bold" style={{ color: 'var(--ink-secondary)', borderBottom: '1px solid var(--border)' }}>
        Snooze until…
      </div>

      {PRESETS.map((preset) => (
        <button
          key={preset}
          onClick={() => handlePreset(preset)}
          className="w-full px-3 py-1.5 text-left text-sm transition-colors"
          style={{ color: 'var(--ink)' }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--paper-raised)'
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = ''
          }}
        >
          {snoozeLabel(preset)}
        </button>
      ))}

      <div className="px-3 py-2 space-y-1" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="text-2xs font-mono" style={{ color: 'var(--ink-tertiary)' }}>
          Custom date & time
        </div>
        <div className="flex gap-1">
          <input
            type="date"
            value={customDate}
            onChange={(e) => setCustomDate(e.target.value)}
            className="flex-1 bg-transparent text-xs outline-none rounded px-1 py-0.5"
            style={{ border: '1px solid var(--border)', color: 'var(--ink)' }}
          />
          <input
            type="time"
            value={customTime}
            onChange={(e) => setCustomTime(e.target.value)}
            className="w-[80px] bg-transparent text-xs outline-none rounded px-1 py-0.5"
            style={{ border: '1px solid var(--border)', color: 'var(--ink)' }}
          />
        </div>
        <button
          onClick={handleCustom}
          disabled={!customDate}
          className="w-full text-xs py-1 rounded font-bold text-white mt-1"
          style={{
            backgroundColor: customDate ? 'var(--accent)' : 'var(--ink-faint)',
            cursor: customDate ? 'pointer' : 'not-allowed'
          }}
        >
          Set
        </button>
      </div>
    </div>
  )
}
