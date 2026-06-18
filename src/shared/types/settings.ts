export interface AppSettings {
  theme: 'light' | 'dark' | 'system'
  fontSize: number
  lineHeight: number
  sidebarWidth: number
  listWidth: number
  keymapPreset: 'mailspring' | 'gmail' | 'superhuman' | 'custom'
  undoSendDelay: number // seconds
  notificationsEnabled: boolean
  notificationSound: boolean
  defaultAccount?: string
  compactList: boolean
  readingPanePosition: 'right' | 'bottom' | 'hidden'
  focusMode: boolean
  splitInboxEnabled: boolean
  markAsReadDelay: number // ms, 0 = instant
  signature: string
  // Per-account signatures: { [accountId]: { name, html, isDefault } }
  signatures: Record<string, { name: string; html: string; isDefault: boolean }>
  checkSpelling: boolean
  language: string
  /** If false, the app never queries macOS Contacts (so no permission prompt). */
  macContactsEnabled: boolean
  /** If false, the calendar-invite chip won't open .ics in Calendar.app. */
  calendarImportEnabled: boolean
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  fontSize: 15,
  lineHeight: 1.6,
  sidebarWidth: 220,
  listWidth: 380,
  keymapPreset: 'superhuman',
  undoSendDelay: 5,
  notificationsEnabled: true,
  notificationSound: true,
  compactList: false,
  readingPanePosition: 'right',
  focusMode: false,
  splitInboxEnabled: true,
  markAsReadDelay: 1000,
  signature: '',
  signatures: {},
  checkSpelling: true,
  language: 'en',
  // Off by default — never trigger a Contacts permission prompt unless the
  // user explicitly opts in from the Privacy settings.
  macContactsEnabled: false,
  calendarImportEnabled: true
}
