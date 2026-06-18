// IPC Channel definitions — the typed contract between main and renderer

export const IPC = {
  // Accounts
  ACCOUNTS_LIST: 'accounts:list',
  ACCOUNTS_ADD: 'accounts:add',
  ACCOUNTS_REMOVE: 'accounts:remove',
  ACCOUNTS_UPDATE: 'accounts:update',
  ACCOUNTS_TEST: 'accounts:test',
  ACCOUNTS_DISCOVER_APPLE_MAIL: 'accounts:discover-apple-mail',
  ACCOUNTS_SET_PASSWORD: 'accounts:set-password',

  // Folders
  FOLDERS_LIST: 'folders:list',
  FOLDERS_COUNTS: 'folders:counts',
  FOLDERS_CREATE: 'folders:create',

  // Messages & Threads
  MAIL_LIST: 'mail:list',
  MAIL_GET: 'mail:get',
  MAIL_GET_THREAD: 'mail:get-thread',
  MAIL_MARK_READ: 'mail:mark-read',
  MAIL_MARK_UNREAD: 'mail:mark-unread',
  MAIL_STAR: 'mail:star',
  MAIL_UNSTAR: 'mail:unstar',
  MAIL_ARCHIVE: 'mail:archive',
  MAIL_DELETE: 'mail:delete',
  MAIL_MOVE: 'mail:move',
  MAIL_LABEL: 'mail:label',
  MAIL_UNLABEL: 'mail:unlabel',
  MAIL_TRASH: 'mail:trash',
  MAIL_SPAM: 'mail:spam',

  // Send
  MAIL_SEND: 'mail:send',
  MAIL_SEND_CANCEL: 'mail:send-cancel',
  MAIL_SEND_SCHEDULED: 'mail:send-scheduled',
  MAIL_SEND_SCHEDULED_CANCEL: 'mail:send-scheduled-cancel',
  MAIL_SEND_SCHEDULED_LIST: 'mail:send-scheduled-list',
  MAIL_DRAFT_SAVE: 'mail:draft-save',
  MAIL_DRAFT_DELETE: 'mail:draft-delete',
  // Sprint #5 — compose autosave to the local_drafts table.
  COMPOSE_DRAFT_SAVE: 'compose:draft-save',
  COMPOSE_DRAFT_LOAD: 'compose:draft-load',
  COMPOSE_DRAFT_DELETE: 'compose:draft-delete',

  // Reminders
  REMINDER_SET: 'reminder:set',
  REMINDER_CANCEL: 'reminder:cancel',
  REMINDER_LIST: 'reminder:list',

  // Templates
  TEMPLATE_LIST: 'template:list',
  TEMPLATE_SAVE: 'template:save',
  TEMPLATE_DELETE: 'template:delete',

  // Contacts
  CONTACTS_SUGGEST: 'contacts:suggest',

  // AI
  AI_DRAFT_REPLY: 'ai:draft-reply',

  // Search
  SEARCH_QUERY: 'search:query',
  SEARCH_SUGGEST: 'search:suggest',

  // Snooze
  SNOOZE_SET: 'snooze:set',
  SNOOZE_CANCEL: 'snooze:cancel',
  SNOOZE_LIST: 'snooze:list',

  // Sync
  SYNC_START: 'sync:start',
  SYNC_STOP: 'sync:stop',
  SYNC_STATUS: 'sync:status',

  // Settings
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',
  SETTINGS_OPEN_SYSTEM_PANE: 'settings:open-system-pane',

  // Vault
  VAULT_PICK_FOLDER: 'vault:pick-folder',
  VAULT_SYNC: 'vault:sync',
  VAULT_SYNC_THREAD: 'vault:sync-thread',

  // Attachments
  ATTACHMENT_OPEN: 'attachment:open',
  ATTACHMENT_SAVE: 'attachment:save',
  ATTACHMENT_IMPORT_CALENDAR: 'attachment:import-calendar',
  CALENDAR_IMPORT_EVENT: 'calendar:import-event',

  // Calendar (CalDAV) — used for accepting .ics invites into a chosen calendar.
  CALENDAR_ACCOUNTS_LIST: 'calendar:accounts-list',
  CALENDAR_ACCOUNT_ADD: 'calendar:account-add',
  CALENDAR_ACCOUNT_REMOVE: 'calendar:account-remove',
  CALENDAR_ACCOUNT_TEST: 'calendar:account-test',
  CALENDAR_ACCOUNT_SYNC: 'calendar:account-sync',     // = "re-discover calendars"
  CALENDAR_CALENDARS_LIST: 'calendar:calendars-list', // returns picker-ready list
  CALENDAR_ADD_EVENT: 'calendar:add-event',           // PUT an .ics to a calendar
  CALENDAR_CONNECT_GOOGLE: 'calendar:connect-google',

  // Cloud storage (Nextcloud / Google Drive uploads)
  CLOUD_ACCOUNTS_LIST: 'cloud:accounts-list',
  CLOUD_ACCOUNT_ADD: 'cloud:account-add',
  CLOUD_ACCOUNT_REMOVE: 'cloud:account-remove',
  CLOUD_UPLOAD_ATTACHMENT: 'cloud:upload-attachment',

  // Events (main -> renderer push)
  EVENT_NEW_MAIL: 'event:new-mail',
  EVENT_SYNC_PROGRESS: 'event:sync-progress',
  EVENT_SYNC_ERROR: 'event:sync-error',
  EVENT_SNOOZE_WAKE: 'event:snooze-wake',
  EVENT_SEND_PROGRESS: 'event:send-progress'
} as const

export type IpcChannel = (typeof IPC)[keyof typeof IPC]
