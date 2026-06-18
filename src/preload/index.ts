import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '@shared/ipc-channels'

const api = {
  // Accounts
  listAccounts: () => ipcRenderer.invoke(IPC.ACCOUNTS_LIST),
  addAccount: (account: any) => ipcRenderer.invoke(IPC.ACCOUNTS_ADD, account),
  removeAccount: (id: string) => ipcRenderer.invoke(IPC.ACCOUNTS_REMOVE, id),
  updateAccount: (id: string, updates: any) => ipcRenderer.invoke(IPC.ACCOUNTS_UPDATE, id, updates),
  testAccount: (config: any) => ipcRenderer.invoke(IPC.ACCOUNTS_TEST, config),
  discoverAppleMailAccounts: () => ipcRenderer.invoke(IPC.ACCOUNTS_DISCOVER_APPLE_MAIL),
  setAccountPassword: (id: string, password: string) => ipcRenderer.invoke(IPC.ACCOUNTS_SET_PASSWORD, id, password),

  // Folders
  listFolders: (accountId?: string) => ipcRenderer.invoke(IPC.FOLDERS_LIST, accountId),
  getFolderCounts: () => ipcRenderer.invoke(IPC.FOLDERS_COUNTS),
  createFolder: (accountId: string, name: string) => ipcRenderer.invoke(IPC.FOLDERS_CREATE, accountId, name),

  // Mail
  listMail: (options?: any) => ipcRenderer.invoke(IPC.MAIL_LIST, options),
  getMail: (id: string) => ipcRenderer.invoke(IPC.MAIL_GET, id),
  getThread: (id: string) => ipcRenderer.invoke(IPC.MAIL_GET_THREAD, id),
  markRead: (threadId: string) => ipcRenderer.invoke(IPC.MAIL_MARK_READ, threadId),
  markUnread: (threadId: string) => ipcRenderer.invoke(IPC.MAIL_MARK_UNREAD, threadId),
  star: (threadId: string) => ipcRenderer.invoke(IPC.MAIL_STAR, threadId),
  unstar: (threadId: string) => ipcRenderer.invoke(IPC.MAIL_UNSTAR, threadId),
  archive: (threadId: string) => ipcRenderer.invoke(IPC.MAIL_ARCHIVE, threadId),
  trash: (threadId: string) => ipcRenderer.invoke(IPC.MAIL_TRASH, threadId),
  deleteMail: (threadId: string) => ipcRenderer.invoke(IPC.MAIL_DELETE, threadId),
  moveMail: (threadId: string, folderId: string) => ipcRenderer.invoke(IPC.MAIL_MOVE, threadId, folderId),

  // Send
  sendMail: (msg: any) => ipcRenderer.invoke(IPC.MAIL_SEND, msg),
  cancelSend: (id: string) => ipcRenderer.invoke(IPC.MAIL_SEND_CANCEL, id),

  // Compose autosave (sprint #5)
  saveDraft: (d: any) => ipcRenderer.invoke(IPC.COMPOSE_DRAFT_SAVE, d),
  loadDraft: (key: any) => ipcRenderer.invoke(IPC.COMPOSE_DRAFT_LOAD, key),
  deleteDraft: (id: string) => ipcRenderer.invoke(IPC.COMPOSE_DRAFT_DELETE, id),

  // Contacts
  suggestContacts: (query: string) => ipcRenderer.invoke(IPC.CONTACTS_SUGGEST, query),

  // AI
  draftReply: (req: any) => ipcRenderer.invoke(IPC.AI_DRAFT_REPLY, req),

  // Search
  search: (query: any) => ipcRenderer.invoke(IPC.SEARCH_QUERY, query),
  searchSuggest: (partial: string) => ipcRenderer.invoke(IPC.SEARCH_SUGGEST, partial),

  // Snooze
  snooze: (threadId: string, wakeAt: number) => ipcRenderer.invoke(IPC.SNOOZE_SET, threadId, wakeAt),
  cancelSnooze: (threadId: string) => ipcRenderer.invoke(IPC.SNOOZE_CANCEL, threadId),
  listSnoozed: () => ipcRenderer.invoke(IPC.SNOOZE_LIST),

  // Scheduled Send
  scheduleSend: (msg: any) => ipcRenderer.invoke(IPC.MAIL_SEND_SCHEDULED, msg),
  cancelScheduledSend: (id: string) => ipcRenderer.invoke(IPC.MAIL_SEND_SCHEDULED_CANCEL, id),
  listScheduledSends: () => ipcRenderer.invoke(IPC.MAIL_SEND_SCHEDULED_LIST),

  // Reminders
  setReminder: (threadId: string, remindAt: number, reason?: string) => ipcRenderer.invoke(IPC.REMINDER_SET, threadId, remindAt, reason),
  cancelReminder: (threadId: string) => ipcRenderer.invoke(IPC.REMINDER_CANCEL, threadId),
  listReminders: () => ipcRenderer.invoke(IPC.REMINDER_LIST),

  // Templates
  listTemplates: () => ipcRenderer.invoke(IPC.TEMPLATE_LIST),
  saveTemplate: (template: any) => ipcRenderer.invoke(IPC.TEMPLATE_SAVE, template),
  deleteTemplate: (id: string) => ipcRenderer.invoke(IPC.TEMPLATE_DELETE, id),

  // Vault
  pickVaultFolder: () => ipcRenderer.invoke(IPC.VAULT_PICK_FOLDER),
  syncVault: () => ipcRenderer.invoke(IPC.VAULT_SYNC),
  syncVaultThread: (threadId: string) => ipcRenderer.invoke(IPC.VAULT_SYNC_THREAD, threadId),

  // Attachments
  openAttachment: (id: string) => ipcRenderer.invoke(IPC.ATTACHMENT_OPEN, id),
  saveAttachment: (id: string) => ipcRenderer.invoke(IPC.ATTACHMENT_SAVE, id),
  importCalendar: (id: string) => ipcRenderer.invoke(IPC.ATTACHMENT_IMPORT_CALENDAR, id),
  importCalendarEvent: (event: any) => ipcRenderer.invoke(IPC.CALENDAR_IMPORT_EVENT, event),

  // Sync
  triggerSync: (accountId?: string) => ipcRenderer.invoke(IPC.SYNC_START, accountId),

  // Calendar — for "accept invite into …" only, NOT for displaying events.
  listCalendarAccounts: () => ipcRenderer.invoke(IPC.CALENDAR_ACCOUNTS_LIST),
  listCalendars: () => ipcRenderer.invoke(IPC.CALENDAR_CALENDARS_LIST),
  testCalendarAccount: (cfg: any) => ipcRenderer.invoke(IPC.CALENDAR_ACCOUNT_TEST, cfg),
  addCalendarAccount: (cfg: any) => ipcRenderer.invoke(IPC.CALENDAR_ACCOUNT_ADD, cfg),
  removeCalendarAccount: (id: string) => ipcRenderer.invoke(IPC.CALENDAR_ACCOUNT_REMOVE, id),
  syncCalendarAccount: (id: string) => ipcRenderer.invoke(IPC.CALENDAR_ACCOUNT_SYNC, id),
  addCalendarEvent: (args: { calendarId: string; ics?: string; attachmentId?: string }) => ipcRenderer.invoke(IPC.CALENDAR_ADD_EVENT, args),
  connectGoogleCalendar: () => ipcRenderer.invoke(IPC.CALENDAR_CONNECT_GOOGLE),

  // Cloud storage
  listCloudAccounts: () => ipcRenderer.invoke(IPC.CLOUD_ACCOUNTS_LIST),
  addCloudAccount: (cfg: any) => ipcRenderer.invoke(IPC.CLOUD_ACCOUNT_ADD, cfg),
  removeCloudAccount: (id: string) => ipcRenderer.invoke(IPC.CLOUD_ACCOUNT_REMOVE, id),
  uploadAttachmentToCloud: (args: any) => ipcRenderer.invoke(IPC.CLOUD_UPLOAD_ATTACHMENT, args),

  // Settings
  getSettings: (key?: string) => ipcRenderer.invoke(IPC.SETTINGS_GET, key),
  setSetting: (key: string, value: any) => ipcRenderer.invoke(IPC.SETTINGS_SET, key, value),
  openSystemPane: (pane: string) => ipcRenderer.invoke(IPC.SETTINGS_OPEN_SYSTEM_PANE, pane),

  // Events (main -> renderer)
  onNewMail: (cb: (data: any) => void) => {
    const handler = (_: any, data: any) => cb(data)
    ipcRenderer.on(IPC.EVENT_NEW_MAIL, handler)
    return () => ipcRenderer.removeListener(IPC.EVENT_NEW_MAIL, handler)
  },
  onSyncProgress: (cb: (data: any) => void) => {
    const handler = (_: any, data: any) => cb(data)
    ipcRenderer.on(IPC.EVENT_SYNC_PROGRESS, handler)
    return () => ipcRenderer.removeListener(IPC.EVENT_SYNC_PROGRESS, handler)
  },
  onSyncError: (cb: (data: any) => void) => {
    const handler = (_: any, data: any) => cb(data)
    ipcRenderer.on(IPC.EVENT_SYNC_ERROR, handler)
    return () => ipcRenderer.removeListener(IPC.EVENT_SYNC_ERROR, handler)
  },
  onSnoozeWake: (cb: (data: any) => void) => {
    const handler = (_: any, data: any) => cb(data)
    ipcRenderer.on(IPC.EVENT_SNOOZE_WAKE, handler)
    return () => ipcRenderer.removeListener(IPC.EVENT_SNOOZE_WAKE, handler)
  },
  onNavigate: (cb: (route: string) => void) => {
    const handler = (_: any, route: string) => cb(route)
    ipcRenderer.on('navigate', handler)
    return () => ipcRenderer.removeListener('navigate', handler)
  },
  onComposeNew: (cb: () => void) => {
    const handler = () => cb()
    ipcRenderer.on('compose:new', handler)
    return () => ipcRenderer.removeListener('compose:new', handler)
  },
  onSearchFocus: (cb: () => void) => {
    const handler = () => cb()
    ipcRenderer.on('search:focus', handler)
    return () => ipcRenderer.removeListener('search:focus', handler)
  },
  onToggleFocusMode: (cb: () => void) => {
    const handler = () => cb()
    ipcRenderer.on('toggle:focus-mode', handler)
    return () => ipcRenderer.removeListener('toggle:focus-mode', handler)
  },
  onNavigateFolder: (cb: (role: string) => void) => {
    const handler = (_: any, role: string) => cb(role)
    ipcRenderer.on('navigate:folder', handler)
    return () => ipcRenderer.removeListener('navigate:folder', handler)
  }
}

export type DeskMailAPI = typeof api

contextBridge.exposeInMainWorld('api', api)
