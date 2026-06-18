const MINUTE = 60_000
const HOUR = 3_600_000
const DAY = 86_400_000

export function relativeTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp

  if (diff < MINUTE) return 'now'
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m`
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h`

  const date = new Date(timestamp)
  const today = new Date()

  if (date.getFullYear() === today.getFullYear()) {
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  }

  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function snoozeLabel(preset: string): string {
  switch (preset) {
    case 'later_today': return 'Later today'
    case 'tomorrow': return 'Tomorrow morning'
    case 'this_weekend': return 'This weekend'
    case 'next_week': return 'Next week'
    case 'next_month': return 'Next month'
    default: return 'Pick date & time'
  }
}
