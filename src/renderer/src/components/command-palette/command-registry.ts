import type { Command } from '../../stores/command.store'
import { useMailStore } from '../../stores/mail.store'
import { useUIStore } from '../../stores/ui.store'
import { useSearchStore } from '../../stores/search.store'

export function buildCommands(): Command[] {
  const mail = useMailStore.getState()
  const ui = useUIStore.getState()
  const search = useSearchStore.getState()

  return [
    // Navigation
    {
      id: 'go.inbox',
      label: 'Go to Inbox',
      shortcut: 'G I',
      category: 'Navigation',
      execute: () => {
        const f = mail.folders.find((f) => f.role === 'inbox')
        if (f) mail.setCurrentFolder(f.id, f.role)
      }
    },
    {
      id: 'go.sent',
      label: 'Go to Sent',
      shortcut: 'G S',
      category: 'Navigation',
      execute: () => {
        const f = mail.folders.find((f) => f.role === 'sent')
        if (f) mail.setCurrentFolder(f.id, f.role)
      }
    },
    {
      id: 'go.drafts',
      label: 'Go to Drafts',
      shortcut: 'G D',
      category: 'Navigation',
      execute: () => {
        const f = mail.folders.find((f) => f.role === 'drafts')
        if (f) mail.setCurrentFolder(f.id, f.role)
      }
    },
    {
      id: 'go.archive',
      label: 'Go to Archive',
      shortcut: 'G A',
      category: 'Navigation',
      execute: () => {
        const f = mail.folders.find((f) => f.role === 'archive')
        if (f) mail.setCurrentFolder(f.id, f.role)
      }
    },
    {
      id: 'go.trash',
      label: 'Go to Trash',
      shortcut: 'G T',
      category: 'Navigation',
      execute: () => {
        const f = mail.folders.find((f) => f.role === 'trash')
        if (f) mail.setCurrentFolder(f.id, f.role)
      }
    },

    // Actions
    {
      id: 'action.archive',
      label: 'Archive conversation',
      shortcut: 'E',
      category: 'Actions',
      execute: () => mail.archive()
    },
    {
      id: 'action.trash',
      label: 'Move to Trash',
      shortcut: '#',
      category: 'Actions',
      execute: () => mail.trash()
    },
    {
      id: 'action.star',
      label: 'Toggle star',
      shortcut: 'S',
      category: 'Actions',
      execute: () => mail.toggleStar()
    },
    {
      id: 'action.read',
      label: 'Toggle read/unread',
      shortcut: 'Shift+U',
      category: 'Actions',
      execute: () => mail.toggleRead()
    },

    // Compose
    {
      id: 'compose.new',
      label: 'New message',
      shortcut: 'C',
      category: 'Compose',
      execute: () => ui.openCompose('new')
    },
    {
      id: 'compose.reply',
      label: 'Reply',
      shortcut: 'R',
      category: 'Compose',
      execute: () => ui.openCompose('reply', mail.selectedThreadId || undefined)
    },
    {
      id: 'compose.reply-all',
      label: 'Reply All',
      shortcut: 'Shift+R',
      category: 'Compose',
      execute: () => ui.openCompose('reply-all', mail.selectedThreadId || undefined)
    },
    {
      id: 'compose.forward',
      label: 'Forward',
      shortcut: 'F',
      category: 'Compose',
      execute: () => ui.openCompose('forward', mail.selectedThreadId || undefined)
    },

    // UI
    {
      id: 'ui.search',
      label: 'Search mail',
      shortcut: '/',
      category: 'View',
      execute: () => search.open()
    },
    {
      id: 'ui.focus-mode',
      label: 'Toggle Focus Mode',
      shortcut: '⌘⇧F',
      category: 'View',
      execute: () => ui.toggleFocusMode()
    },
    {
      id: 'ui.sidebar',
      label: 'Toggle Sidebar',
      shortcut: '⌘\\',
      category: 'View',
      execute: () => ui.toggleSidebar()
    },
    {
      id: 'ui.theme',
      label: 'Toggle Dark Mode',
      category: 'View',
      execute: () => {
        const current = ui.theme
        ui.setTheme(current === 'dark' ? 'light' : 'dark')
      }
    },
    {
      id: 'ui.settings',
      label: 'Open Settings',
      shortcut: '⌘,',
      category: 'View',
      execute: () => ui.openSettings()
    },
    {
      id: 'ui.shortcuts',
      label: 'Keyboard Shortcuts',
      shortcut: '?',
      category: 'View',
      execute: () => ui.toggleShortcutsHelp()
    }
  ]
}
