import type { Keymap } from './keymap-types'

/**
 * Apple Mail-flavoured keymap. Targets users coming from macOS Mail.app.
 * Differs from the superhuman preset mostly in archive/trash conventions
 * (Cmd+Backspace = trash, Cmd+E = archive) and reply shortcuts.
 */
export const appleMailKeymap: Keymap = [
  // Navigation
  { key: 'j', action: 'navigate.down' },
  { key: 'k', action: 'navigate.up' },
  { key: 'ArrowDown', action: 'navigate.down' },
  { key: 'ArrowUp', action: 'navigate.up' },
  { key: 'Enter', action: 'navigate.open' },
  { key: 'Escape', action: 'ui.escape' },
  { key: 'Cmd+1', action: 'navigate.inbox' },
  { key: 'Cmd+2', action: 'navigate.sent' },
  { key: 'Cmd+3', action: 'navigate.drafts' },
  { key: 'Cmd+4', action: 'navigate.archive' },

  // Thread actions — Apple Mail flavour
  { key: 'Cmd+e', action: 'thread.archive' },        // Mail.app standard
  { key: 'Cmd+Backspace', action: 'thread.trash' },
  { key: 'Backspace', action: 'thread.trash' },
  { key: 'Delete', action: 'thread.trash' },
  { key: 'Cmd+Shift+J', action: 'thread.spam' },
  { key: 'Shift+U', action: 'thread.mark-unread' },
  { key: 'u', action: 'thread.mark-unread' },
  { key: 'Shift+L', action: 'thread.flag' as any },  // star
  { key: 's', action: 'thread.star' },
  { key: 'm', action: 'thread.move' },

  // Selection
  { key: 'Cmd+a', action: 'thread.select-all' },
  { key: 'Shift+ArrowDown', action: 'thread.extend-selection-down' },
  { key: 'Shift+ArrowUp', action: 'thread.extend-selection-up' },

  // Compose
  { key: 'Cmd+n', action: 'compose.new' },
  { key: 'Cmd+r', action: 'compose.reply' },
  { key: 'Cmd+Shift+R', action: 'compose.reply-all' },
  { key: 'Cmd+Shift+F', action: 'compose.forward' },
  { key: 'Cmd+Enter', action: 'compose.send' },

  // UI
  { key: 'Cmd+f', action: 'ui.search' },
  { key: '/', action: 'ui.search' },
  { key: 'Cmd+k', action: 'ui.command-palette' },
  { key: 'Cmd+,', action: 'ui.settings' },
  { key: '?', action: 'ui.shortcuts-help' },
  { key: 'Cmd+z', action: 'ui.undo' }
]
