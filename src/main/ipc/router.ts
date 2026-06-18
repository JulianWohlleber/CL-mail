import Database from 'better-sqlite3'
import { registerMailHandlers } from './mail.ipc'
import { registerAccountHandlers } from './accounts.ipc'
import { registerSearchHandlers } from './search.ipc'
import { registerSettingsHandlers } from './settings.ipc'
import { registerSnoozeHandlers } from './snooze.ipc'
import { registerFeatureHandlers } from './features.ipc'
import { registerContactHandlers } from './contacts.ipc'
import { registerAiHandlers } from './ai.ipc'
import { registerVaultHandlers } from './vault.ipc'
import { registerCalendarHandlers } from './calendar.ipc'
import { registerCloudStorageHandlers } from './cloud-storage.ipc'
import { CalendarSync } from '../services/calendar/calendar-sync'

export function registerAllIpcHandlers(db: Database.Database): { calendarSync: CalendarSync } {
  registerAccountHandlers(db)
  registerMailHandlers(db)
  registerSearchHandlers(db)
  registerSettingsHandlers(db)
  registerSnoozeHandlers(db)
  registerFeatureHandlers(db)
  registerContactHandlers(db)
  registerAiHandlers()
  registerVaultHandlers(db)
  const calendarSync = new CalendarSync(db)
  registerCalendarHandlers(db, calendarSync)
  registerCloudStorageHandlers(db)
  return { calendarSync }
}
