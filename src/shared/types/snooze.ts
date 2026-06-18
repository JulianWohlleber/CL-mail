export interface SnoozeEntry {
  id: string
  threadId: string
  snoozedAt: number
  wakeAt: number
  originalFolderId: string
}

export type SnoozePreset =
  | 'later_today'
  | 'tomorrow'
  | 'this_weekend'
  | 'next_week'
  | 'next_month'
  | 'custom'

export function getSnoozeTime(preset: SnoozePreset): number {
  const now = new Date()
  switch (preset) {
    case 'later_today': {
      const later = new Date(now)
      later.setHours(now.getHours() + 3)
      return later.getTime()
    }
    case 'tomorrow': {
      const tomorrow = new Date(now)
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(8, 0, 0, 0)
      return tomorrow.getTime()
    }
    case 'this_weekend': {
      const day = now.getDay()
      const daysUntilSat = (6 - day + 7) % 7 || 7
      const sat = new Date(now)
      sat.setDate(sat.getDate() + daysUntilSat)
      sat.setHours(9, 0, 0, 0)
      return sat.getTime()
    }
    case 'next_week': {
      const day = now.getDay()
      const daysUntilMon = (1 - day + 7) % 7 || 7
      const mon = new Date(now)
      mon.setDate(mon.getDate() + daysUntilMon)
      mon.setHours(8, 0, 0, 0)
      return mon.getTime()
    }
    case 'next_month': {
      const nextMonth = new Date(now)
      nextMonth.setMonth(nextMonth.getMonth() + 1)
      nextMonth.setDate(1)
      nextMonth.setHours(8, 0, 0, 0)
      return nextMonth.getTime()
    }
    default:
      return now.getTime()
  }
}
