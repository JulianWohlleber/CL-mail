import { useState } from 'react'

interface Props {
  threadId: string
  onClose: () => void
}

const PRESETS = [
  { label: 'In 1 hour', hours: 1 },
  { label: 'In 2 hours', hours: 2 },
  { label: 'Tomorrow morning', hours: 0, preset: 'tomorrow_morning' },
  { label: 'Tomorrow afternoon', hours: 0, preset: 'tomorrow_afternoon' },
  { label: 'In 2 days', hours: 48 },
  { label: 'In 1 week', hours: 168 },
  { label: 'In 1 month', hours: 720 }
]

function getPresetTime(preset: typeof PRESETS[number]): number {
  if (preset.preset === 'tomorrow_morning') {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    d.setHours(9, 0, 0, 0)
    return d.getTime()
  }
  if (preset.preset === 'tomorrow_afternoon') {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    d.setHours(14, 0, 0, 0)
    return d.getTime()
  }
  return Date.now() + preset.hours * 60 * 60 * 1000
}

export function ReminderPopover({ threadId, onClose }: Props) {
  const [saving, setSaving] = useState(false)

  const setReminder = async (preset: typeof PRESETS[number]) => {
    setSaving(true)
    const remindAt = getPresetTime(preset)
    await window.api.setReminder(threadId, remindAt, 'no_reply')
    onClose()
  }

  return (
    <div
      className="absolute right-0 top-full mt-1 w-[200px] rounded-lg shadow-lg overflow-hidden z-50"
      style={{ backgroundColor: 'var(--paper-overlay)', border: '1px solid var(--border)' }}
    >
      <div className="px-3 py-2 text-xs font-bold" style={{ color: 'var(--ink-secondary)', borderBottom: '1px solid var(--border)' }}>
        Remind me if no reply
      </div>
      {PRESETS.map((preset) => (
        <button
          key={preset.label}
          onClick={() => setReminder(preset)}
          disabled={saving}
          className="w-full text-left px-3 py-1.5 text-sm transition-colors hover:bg-[var(--paper-raised)]"
          style={{ color: 'var(--ink)' }}
        >
          {preset.label}
        </button>
      ))}
    </div>
  )
}
