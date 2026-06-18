import type { Keymap } from './keymap-types'

// Mailspring default shortcuts
// Reference: https://community.getmailspring.com/t/learn-and-customize-keyboard-shortcuts/155

export const mailspringKeymap: Keymap = [
  // Navigation
  { key: 'ArrowDown', action: 'navigate.down' },
  { key: 'ArrowUp', action: 'navigate.up' },
  { key: 'Enter', action: 'navigate.open' },
  { key: 'Escape', action: 'ui.escape' },

  // Thread actions
  { key: 'Backspace', action: 'thread.trash' },
  { key: 'Delete', action: 'thread.trash' },
  { key: 'y', action: 'thread.archive' },
  { key: 'e', action: 'thread.archive' },
  { key: 's', action: 'thread.star' },
  { key: 'u', action: 'thread.mark-unread' },
  { key: 'Shift+U', action: 'thread.mark-unread' },
  { key: 'Shift+R', action: 'thread.mark-read' },
  { key: 'm', action: 'thread.move' },

  // Compose
  { key: 'Cmd+n', action: 'compose.new' },
  { key: 'c', action: 'compose.new' },
  { key: 'r', action: 'compose.reply' },
  { key: 'Shift+R', action: 'compose.reply-all' },
  { key: 'f', action: 'compose.forward' },
  { key: 'Cmd+Enter', action: 'compose.send' },

  // UI
  { key: 'Cmd+k', action: 'ui.command-palette' },
  { key: 'Cmd+f', action: 'ui.search' },
  { key: '/', action: 'ui.search' },
  { key: 'Cmd+,', action: 'ui.settings' },
  { key: '?', action: 'ui.shortcuts-help' },
  { key: 'Cmd+z', action: 'ui.undo' },
  { key: 'Cmd+\\', action: 'ui.toggle-sidebar' },
  { key: 'Cmd+Shift+F', action: 'ui.focus-mode' },

  // Folder navigation
  { key: 'Cmd+1', action: 'navigate.inbox' },
  { key: 'Cmd+2', action: 'navigate.sent' },
  { key: 'Cmd+3', action: 'navigate.drafts' },
  { key: 'Cmd+4', action: 'navigate.archive' }
]
