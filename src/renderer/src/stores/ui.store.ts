import { create } from 'zustand'

interface UIState {
  theme: 'light' | 'dark' | 'system'
  sidebarVisible: boolean
  sidebarWidth: number
  listWidth: number
  focusMode: boolean
  composeOpen: boolean
  composeMode: 'new' | 'reply' | 'reply-all' | 'forward' | null
  composeReplyToId: string | null
  settingsOpen: boolean
  shortcutsHelpOpen: boolean
  moveToFolderOpen: boolean
  undoToast: { message: string; undoId: string; timer: number } | null

  // Actions
  setTheme: (theme: 'light' | 'dark' | 'system') => void
  toggleSidebar: () => void
  toggleFocusMode: () => void
  setSidebarWidth: (w: number) => void
  setListWidth: (w: number) => void
  openCompose: (mode?: 'new' | 'reply' | 'reply-all' | 'forward', replyToId?: string) => void
  closeCompose: () => void
  openSettings: () => void
  closeSettings: () => void
  toggleShortcutsHelp: () => void
  openMoveToFolder: () => void
  closeMoveToFolder: () => void
  showUndoToast: (message: string, undoId: string) => void
  hideUndoToast: () => void
}

export const useUIStore = create<UIState>((set, get) => ({
  theme: 'system',
  sidebarVisible: true,
  sidebarWidth: 220,
  listWidth: 380,
  focusMode: false,
  composeOpen: false,
  composeMode: null,
  composeReplyToId: null,
  settingsOpen: false,
  shortcutsHelpOpen: false,
  moveToFolderOpen: false,
  undoToast: null,

  setTheme: (theme) => {
    set({ theme })
    const html = document.documentElement
    html.classList.remove('dark')
    if (theme === 'dark') {
      html.classList.add('dark')
    } else if (theme === 'system') {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        html.classList.add('dark')
      }
    }
    window.api.setSetting('theme', theme)
  },

  toggleSidebar: () => set((s) => ({ sidebarVisible: !s.sidebarVisible })),
  toggleFocusMode: () =>
    set((s) => ({
      focusMode: !s.focusMode,
      sidebarVisible: s.focusMode ? true : false
    })),

  setSidebarWidth: (w) => set({ sidebarWidth: w }),
  setListWidth: (w) => set({ listWidth: w }),

  openCompose: (mode = 'new', replyToId) => {
    set({ composeOpen: true, composeMode: mode, composeReplyToId: replyToId || null })
  },
  closeCompose: () => {
    set({ composeOpen: false, composeMode: null, composeReplyToId: null })
  },

  openSettings: () => set({ settingsOpen: true }),
  closeSettings: () => set({ settingsOpen: false }),
  toggleShortcutsHelp: () => set((s) => ({ shortcutsHelpOpen: !s.shortcutsHelpOpen })),
  openMoveToFolder: () => set({ moveToFolderOpen: true }),
  closeMoveToFolder: () => set({ moveToFolderOpen: false }),

  showUndoToast: (message, undoId) => {
    set({ undoToast: { message, undoId, timer: 5 } })
  },
  hideUndoToast: () => set({ undoToast: null })
}))
