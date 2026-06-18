export const APP_NAME = 'mail_space'
export const APP_ID = 'com.mailspace.app'

export const DB_NAME = 'mail_space.db'

export const SYNC_INTERVAL = 60_000 // 1 minute between full syncs
export const IDLE_RECONNECT_DELAY = 5_000
export const SNOOZE_CHECK_INTERVAL = 30_000

export const MAX_BODY_PREVIEW_LENGTH = 200
export const DEFAULT_PAGE_SIZE = 50

/** Sentinel folder id for the cross-account unified inbox view. */
export const ALL_INBOXES_ID = 'virtual:all-inboxes'

/** Sentinel folder id for the search-results view (threads filtered by FTS query). */
export const SEARCH_RESULTS_ID = 'virtual:search-results'

export const FOLDER_ICONS: Record<string, string> = {
  inbox: '↓',
  sent: '↑',
  drafts: '✎',
  trash: '✕',
  archive: '▣',
  spam: '⚠',
  starred: '★',
  all: '∀',
  custom: '▸'
}

export const LABEL_COLORS = [
  '#E74C3C',
  '#E67E22',
  '#F1C40F',
  '#2ECC71',
  '#1ABC9C',
  '#3498DB',
  '#9B59B6',
  '#95A5A6'
]
