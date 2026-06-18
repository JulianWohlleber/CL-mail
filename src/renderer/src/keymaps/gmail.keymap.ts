import type { Keymap } from './keymap-types'

export const gmailKeymap: Keymap = [
  // Navigation
  { key: 'j', action: 'navigate.down' },
  { key: 'k', action: 'navigate.up' },
  { key: 'o', action: 'navigate.open' },
  { key: 'Enter', action: 'navigate.open' },
  { key: 'u', action: 'navigate.back' },
  { key: 'Escape', action: 'ui.escape' },
  { key: 'g i', action: 'navigate.inbox' },
  { key: 'g s', action: 'navigate.starred' },
  { key: 'g t', action: 'navigate.sent' },
  { key: 'g d', action: 'navigate.drafts' },
  { key: 'g a', action: 'navigate.archive' },

  // Thread actions
  { key: 'e', action: 'thread.archive' },
  { key: '#', action: 'thread.trash' },
  { key: 's', action: 'thread.star' },
  { key: 'Shift+I', action: 'thread.mark-read' },
  { key: 'Shift+U', action: 'thread.mark-unread' },
  { key: '!', action: 'thread.spam' },
  { key: 'm', action: 'thread.move' },
  { key: 'l', action: 'thread.label' },
  { key: 'x', action: 'thread.select' },
  { key: 'Cmd+a', action: 'thread.select-all' },

  // Compose
  { key: 'c', action: 'compose.new' },
  { key: 'r', action: 'compose.reply' },
  { key: 'a', action: 'compose.reply-all' },
  { key: 'f', action: 'compose.forward' },
  { key: 'Cmd+Enter', action: 'compose.send' },

  // UI
  { key: '/', action: 'ui.search' },
  { key: '?', action: 'ui.shortcuts-help' },
  { key: 'Cmd+z', action: 'ui.undo' },
  { key: 'Cmd+k', action: 'ui.command-palette' }
]
