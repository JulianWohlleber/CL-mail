import { useState } from 'react'

interface Props {
  onSchedule: (sendAt: number) => void
  onClose: () => void
}

const PRESETS = [
  { label: 'Tomorrow morning (9:00 AM)', preset: 'tomorrow_morning' },
  { label: 'Tomorrow afternoon (2:00 PM)', preset: 'tomorrow_afternoon' },
  { label: 'Monday morning (9:00 AM)', preset: 'monday_morning' }
]

function getPresetTime(preset: string): number {
  const d = new Date()
  if (preset === 'tomorrow_morning') {
    d.setDate(d.getDate() + 1)
    d.setHours(9, 0, 0, 0)
  } else if (preset === 'tomorrow_afternoon') {
    d.setDate(d.getDate() + 1)
    d.setHours(14, 0, 0, 0)
  } else if (preset === 'monday_morning') {
    const day = d.getDay()
    const daysUntilMonday = day === 0 ? 1 : 8 - day
    d.setDate(d.getDate() + daysUntilMonday)
    d.setHours(9, 0, 0, 0)
  }
  return d.getTime()
}

export function ScheduleSendPopover({ onSchedule, onClose }: Props) {
  const [customDate, setCustomDate] = useState('')
  const [customTime, setCustomTime] = useState('09:00')

  const handleCustomSchedule = () => {
    if (!customDate) return
    const d = new Date(`${customDate}T${customTime}`)
    if (d.getTime() > Date.now()) {
      onSchedule(d.getTime())
    }
  }

  return (
    <div
      className="absolute right-0 bottom-full mb-1 w-[260px] rounded-lg shadow-lg overflow-hidden z-50"
      style={{ backgroundColor: 'var(--paper-overlay)', border: '1px solid var(--border)' }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="px-3 py-2 text-xs font-bold" style={{ color: 'var(--ink-secondary)', borderBottom: '1px solid var(--border)' }}>
        Schedule Send
      </div>
      {PRESETS.map((preset) => (
        <button
          key={preset.preset}
          onClick={() => {
            onSchedule(getPresetTime(preset.preset))
            onClose()
          }}
          className="w-full text-left px-3 py-1.5 text-sm transition-colors hover:bg-[var(--paper-raised)]"
          style={{ color: 'var(--ink)' }}
        >
          {preset.label}
        </button>
      ))}
      <div className="px-3 py-2" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="text-xs font-bold mb-1" style={{ color: 'var(--ink-secondary)' }}>Custom</div>
        <div className="flex gap-1">
          <input
            type="date"
            value={customDate}
            onChange={(e) => setCustomDate(e.target.value)}
            className="flex-1 text-xs px-2 py-1 rounded bg-transparent"
            style={{ border: '1px solid var(--border)', color: 'var(--ink)' }}
          />
          <input
            type="time"
            value={customTime}
            onChange={(e) => setCustomTime(e.target.value)}
            className="w-[80px] text-xs px-2 py-1 rounded bg-transparent"
            style={{ border: '1px solid var(--border)', color: 'var(--ink)' }}
          />
        </div>
        <button
          onClick={handleCustomSchedule}
          disabled={!customDate}
          className="mt-1 w-full text-xs py-1 rounded font-bold text-white disabled:opacity-50"
          style={{ backgroundColor: 'var(--accent)' }}
        >
          Schedule
        </button>
      </div>
    </div>
  )
}
