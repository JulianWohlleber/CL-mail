import { useState, useEffect, useCallback } from 'react'
import { ThreePaneLayout } from './components/layout/ThreePaneLayout'
import { AddCalendarModal } from './components/calendar/AddCalendarModal'
import { CommandPalette } from './components/command-palette/CommandPalette'
import { ComposeWindow } from './components/compose/ComposeWindow'
import { SettingsPanel } from './components/settings/SettingsPanel'
import { ShortcutsHelp } from './components/shared/ShortcutsHelp'
import { MoveToFolderModal } from './components/mail/MoveToFolderModal'
import { UndoToast } from './components/shared/UndoToast'
import { WelcomeScreen } from './components/shared/WelcomeScreen'
import { Tutorial } from './components/shared/Tutorial'
import { useKeyboard } from './hooks/useKeyboard'
import { useTheme } from './hooks/useTheme'
import { useMailStore } from './stores/mail.store'
import { useUIStore } from './stores/ui.store'
import { useAccountsStore } from './stores/accounts.store'
import { useCommandStore } from './stores/command.store'
import { useSearchStore } from './stores/search.store'
import type { ActionName } from './keymaps/keymap-types'
import { ALL_INBOXES_ID } from '@shared/constants'

// Type declaration for window.api
declare global {
  interface Window {
    api: import('../../../preload/index').DeskMailAPI
  }
}

export default function App() {
  const { toggleTheme } = useTheme()
  const accounts = useAccountsStore((s) => s.accounts)
  const loadAccounts = useAccountsStore((s) => s.loadAccounts)
  const loadFolders = useMailStore((s) => s.loadFolders)
  const loadThreads = useMailStore((s) => s.loadThreads)
  const navigateThread = useMailStore((s) => s.navigateThread)
  const selectThread = useMailStore((s) => s.selectThread)
  const selectedThreadId = useMailStore((s) => s.selectedThreadId)
  const archive = useMailStore((s) => s.archive)
  const trash = useMailStore((s) => s.trash)
  const toggleStar = useMailStore((s) => s.toggleStar)
  const toggleRead = useMailStore((s) => s.toggleRead)
  const folders = useMailStore((s) => s.folders)
  const setCurrentFolder = useMailStore((s) => s.setCurrentFolder)
  const toggleSelect = useMailStore((s) => s.toggleSelect)
  const selectAllThreads = useMailStore((s) => s.selectAllThreads)
  const clearSelection = useMailStore((s) => s.clearSelection)
  const extendSelection = useMailStore((s) => s.extendSelection)
  const selectedIds = useMailStore((s) => s.selectedIds)

  const composeOpen = useUIStore((s) => s.composeOpen)
  const openCompose = useUIStore((s) => s.openCompose)
  const closeCompose = useUIStore((s) => s.closeCompose)
  const toggleFocusMode = useUIStore((s) => s.toggleFocusMode)
  const toggleSidebar = useUIStore((s) => s.toggleSidebar)
  const settingsOpen = useUIStore((s) => s.settingsOpen)
  const openSettings = useUIStore((s) => s.openSettings)
  const closeSettings = useUIStore((s) => s.closeSettings)
  const shortcutsHelpOpen = useUIStore((s) => s.shortcutsHelpOpen)
  const toggleShortcutsHelp = useUIStore((s) => s.toggleShortcutsHelp)
  const moveToFolderOpen = useUIStore((s) => s.moveToFolderOpen)
  const openMoveToFolder = useUIStore((s) => s.openMoveToFolder)
  const closeMoveToFolder = useUIStore((s) => s.closeMoveToFolder)

  const commandPaletteOpen = useCommandStore((s) => s.isOpen)
  const openCommandPalette = useCommandStore((s) => s.open)
  const closeCommandPalette = useCommandStore((s) => s.close)

  const openSearch = useSearchStore((s) => s.open)
  const [showTutorial, setShowTutorial] = useState(false)
  // Don't show the welcome screen until we've confirmed there are no accounts.
  // Otherwise it briefly flashes on every cold start before loadAccounts resolves.
  const [initialized, setInitialized] = useState(false)

  // Initialize app
  useEffect(() => {
    loadAccounts()
      .then(() => loadFolders())
      .finally(() => setInitialized(true))

    // Show tutorial on first run
    window.api.getSettings().then((settings: any) => {
      if (!settings.tutorialComplete) {
        setShowTutorial(true)
      }
    })

    // Re-load folders after sync completes (sync runs async on startup).
    // Debounce so a burst of sync events from multiple accounts doesn't cause
    // a cascade of re-renders.
    let syncDebounce: ReturnType<typeof setTimeout> | undefined
    const unsubSync = window.api.onSyncProgress(() => {
      if (syncDebounce) clearTimeout(syncDebounce)
      syncDebounce = setTimeout(() => {
        loadFolders()
        const currentFolder = useMailStore.getState().currentFolderId
        if (currentFolder) {
          useMailStore.getState().loadThreads(currentFolder)
        }
        // Re-fetch the currently-open thread so a new reply that just arrived
        // shows up in the reading pane without the user clicking away and back.
        const openThreadId = useMailStore.getState().selectedThreadId
        if (openThreadId) {
          window.api.getThread(openThreadId).then((thread: any) => {
            if (thread && useMailStore.getState().selectedThreadId === openThreadId) {
              useMailStore.setState({ selectedThread: thread })
            }
          })
        }
      }, 300)
    })

    return () => {
      unsubSync()
      if (syncDebounce) clearTimeout(syncDebounce)
    }
  }, [])

  // When folders load (or active account changes), select the active account's inbox.
  // We must filter by activeAccountId — otherwise the first-in-array inbox might
  // belong to a non-active account, leaving the sidebar / thread list out of sync.
  const activeAccountId = useAccountsStore((s) => s.activeAccountId)
  useEffect(() => {
    if (folders.length === 0) return

    const currentId = useMailStore.getState().currentFolderId
    // Leave the unified "All Inboxes" view alone — it's account-agnostic and
    // the user explicitly chose it.
    if (currentId === ALL_INBOXES_ID) return

    const inbox =
      (activeAccountId && folders.find((f) => f.accountId === activeAccountId && f.role === 'inbox')) ||
      folders.find((f) => f.role === 'inbox')
    if (!inbox) return

    // Pick this inbox if nothing is selected yet OR if the current selection
    // belongs to a different (and now-inactive) account.
    const current = folders.find((f) => f.id === currentId)
    const currentBelongsToActive = current?.accountId === activeAccountId
    if (!currentId || !currentBelongsToActive) {
      setCurrentFolder(inbox.id, inbox.role)
    }
  }, [folders, activeAccountId])

  // Listen for native menu events
  useEffect(() => {
    const unsubs = [
      window.api.onComposeNew(() => openCompose('new')),
      window.api.onSearchFocus(() => openSearch()),
      window.api.onToggleFocusMode(() => toggleFocusMode()),
      window.api.onNavigateFolder((role) => {
        const folder = folders.find((f) => f.role === role)
        if (folder) setCurrentFolder(folder.id, folder.role)
      }),
      window.api.onNavigate((route: string) => {
        if (route === '/settings') openSettings()
      })
    ]
    return () => unsubs.forEach((fn) => fn())
  }, [folders])

  // Navigate to folder by role
  const goToFolder = useCallback(
    (role: string) => {
      const folder = folders.find((f) => f.role === role)
      if (folder) setCurrentFolder(folder.id, folder.role)
    },
    [folders, setCurrentFolder]
  )

  // Keyboard shortcut handlers
  const keyHandlers: Partial<Record<ActionName, () => void>> = {
    'navigate.down': () => navigateThread('down'),
    'navigate.up': () => navigateThread('up'),
    'navigate.open': () => {}, // handled by MailList
    'navigate.back': () => selectThread(null),
    'navigate.inbox': () => goToFolder('inbox'),
    'navigate.sent': () => goToFolder('sent'),
    'navigate.drafts': () => goToFolder('drafts'),
    'navigate.archive': () => goToFolder('archive'),
    'navigate.starred': () => goToFolder('starred'),
    'navigate.trash': () => goToFolder('trash'),

    'thread.archive': () => { console.log('[App] Archive shortcut, selected:', selectedThreadId, 'bulk:', selectedIds.length); archive() },
    'thread.trash': () => { console.log('[App] Trash shortcut, selected:', selectedThreadId, 'bulk:', selectedIds.length); trash() },
    'thread.star': () => toggleStar(),
    'thread.mark-read': () => toggleRead(),
    'thread.mark-unread': () => toggleRead(),
    'thread.move': () => { if (selectedThreadId || selectedIds.length > 0) openMoveToFolder() },
    'thread.select': () => toggleSelect(),
    'thread.select-all': () => selectAllThreads(),
    'thread.extend-selection-down': () => extendSelection('down'),
    'thread.extend-selection-up': () => extendSelection('up'),
    'thread.clear-selection': () => clearSelection(),
    // Stubs for actions that have shortcuts in the keymap but no built-out
    // feature yet. Without these, pressing the key would silently swallow
    // the event (preventDefault + no handler), making it indistinguishable
    // from a broken shortcut. Logging at least gives the user something to
    // see in the console and keeps the regression-test green.
    'thread.snooze': () => console.info('[App] thread.snooze: use the Reading-Pane "Remind me" button (feature shortcut not wired yet)'),
    'thread.spam':   () => console.info('[App] thread.spam: not yet implemented'),
    'thread.label':  () => console.info('[App] thread.label: not yet implemented'),

    'compose.new': () => openCompose('new'),
    'compose.reply': () => selectedThreadId ? openCompose('reply', selectedThreadId) : undefined,
    'compose.reply-all': () => selectedThreadId ? openCompose('reply-all', selectedThreadId) : undefined,
    'compose.forward': () => selectedThreadId ? openCompose('forward', selectedThreadId) : undefined,

    'ui.command-palette': () =>
      commandPaletteOpen ? closeCommandPalette() : openCommandPalette(),
    'ui.search': () => openSearch(),
    'ui.focus-mode': () => toggleFocusMode(),
    'ui.toggle-sidebar': () => toggleSidebar(),
    'ui.settings': () => openSettings(),
    'ui.shortcuts-help': () => toggleShortcutsHelp(),
    'ui.theme-toggle': () => toggleTheme(),
    'ui.escape': () => {
      if (moveToFolderOpen) closeMoveToFolder()
      else if (commandPaletteOpen) closeCommandPalette()
      else if (composeOpen) closeCompose()
      else if (settingsOpen) closeSettings()
      else if (shortcutsHelpOpen) toggleShortcutsHelp()
      else if (selectedIds.length > 0) clearSelection()
      else if (useMailStore.getState().searchQuery) useMailStore.getState().exitSearch()
      else selectThread(null)
    }
  }

  useKeyboard(keyHandlers, 'superhuman')

  const hasAccounts = accounts.length > 0

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden" style={{ backgroundColor: 'var(--paper)' }}>
      {/* Drag region for frameless window */}
      <div
        className="drag-region h-[52px] flex-shrink-0 flex items-end px-[80px]"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div className="no-drag flex-1" />
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-hidden">
        {!initialized ? (
          <div />
        ) : hasAccounts ? (
          <ThreePaneLayout />
        ) : (
          <WelcomeScreen onComplete={() => {
            loadAccounts().then(() => loadFolders())
          }} />
        )}
      </div>

      {/* Overlays */}
      {commandPaletteOpen && <CommandPalette />}
      {composeOpen && <ComposeWindow />}
      {settingsOpen && <SettingsPanel />}
      {shortcutsHelpOpen && <ShortcutsHelp />}
      {moveToFolderOpen && <MoveToFolderModal />}
      {showTutorial && <Tutorial onComplete={() => setShowTutorial(false)} />}
      <UndoToast />
    </div>
  )
}

