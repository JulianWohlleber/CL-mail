export type ActionName =
  // Navigation
  | 'navigate.down'
  | 'navigate.up'
  | 'navigate.open'
  | 'navigate.back'
  | 'navigate.inbox'
  | 'navigate.sent'
  | 'navigate.drafts'
  | 'navigate.archive'
  | 'navigate.starred'
  | 'navigate.trash'
  | 'navigate.next-account'
  | 'navigate.prev-account'
  // Thread actions
  | 'thread.archive'
  | 'thread.delete'
  | 'thread.trash'
  | 'thread.star'
  | 'thread.mark-read'
  | 'thread.mark-unread'
  | 'thread.snooze'
  | 'thread.spam'
  | 'thread.move'
  | 'thread.label'
  | 'thread.select'
  | 'thread.select-all'
  | 'thread.extend-selection-down'
  | 'thread.extend-selection-up'
  | 'thread.clear-selection'
  // Compose
  | 'compose.new'
  | 'compose.reply'
  | 'compose.reply-all'
  | 'compose.forward'
  | 'compose.send'
  | 'compose.discard'
  // UI
  | 'ui.command-palette'
  | 'ui.search'
  | 'ui.focus-mode'
  | 'ui.toggle-sidebar'
  | 'ui.settings'
  | 'ui.shortcuts-help'
  | 'ui.theme-toggle'
  | 'ui.undo'
  | 'ui.escape'

export interface KeyBinding {
  key: string // e.g., 'j', 'k', 'Cmd+K', 'Shift+#', 'g i'
  action: ActionName
}

export type Keymap = KeyBinding[]
