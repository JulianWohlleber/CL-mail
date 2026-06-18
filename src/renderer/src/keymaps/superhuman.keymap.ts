import type { Keymap } from './keymap-types'

export const superhumanKeymap: Keymap = [
  // Navigation
  { key: 'j', action: 'navigate.down' },
  { key: 'k', action: 'navigate.up' },
  { key: 'ArrowDown', action: 'navigate.down' },
  { key: 'ArrowUp', action: 'navigate.up' },
  { key: 'Enter', action: 'navigate.open' },
  { key: 'Escape', action: 'ui.escape' },
  { key: 'g i', action: 'navigate.inbox' },
  { key: 'g s', action: 'navigate.sent' },
  { key: 'g d', action: 'navigate.drafts' },
  { key: 'g a', action: 'navigate.archive' },
  { key: 'g t', action: 'navigate.trash' },
  { key: 'g r', action: 'navigate.starred' },

  // Thread actions
  { key: 'e', action: 'thread.archive' },
  { key: '#', action: 'thread.trash' },
  { key: 'Shift+3', action: 'thread.trash' },
  { key: 's', action: 'thread.star' },
  { key: 'Shift+I', action: 'thread.mark-read' },
  { key: 'u', action: 'thread.mark-unread' },
  { key: 'Shift+U', action: 'thread.mark-unread' },
  { key: 'h', action: 'thread.snooze' },
  { key: '!', action: 'thread.spam' },
  { key: 'm', action: 'thread.move' },
  { key: 'l', action: 'thread.label' },
  { key: 'x', action: 'thread.select' },
  { key: 'Cmd+a', action: 'thread.select-all' },
  { key: 'Shift+ArrowDown', action: 'thread.extend-selection-down' },
  { key: 'Shift+ArrowUp', action: 'thread.extend-selection-up' },
  { key: 'Backspace', action: 'thread.trash' },
  { key: 'Delete', action: 'thread.trash' },

  // Compose
  { key: 'c', action: 'compose.new' },
  { key: 'r', action: 'compose.reply' },
  { key: 'Shift+R', action: 'compose.reply-all' },
  { key: 'f', action: 'compose.forward' },
  { key: 'Cmd+Enter', action: 'compose.send' },
  { key: 'Cmd+Shift+,', action: 'compose.discard' },

  // UI
  { key: 'Cmd+k', action: 'ui.command-palette' },
  { key: '/', action: 'ui.search' },
  { key: 'Cmd+Shift+F', action: 'ui.focus-mode' },
  { key: 'Cmd+\\', action: 'ui.toggle-sidebar' },
  { key: 'Cmd+,', action: 'ui.settings' },
  { key: '?', action: 'ui.shortcuts-help' },
  { key: 'Cmd+z', action: 'ui.undo' }
]
