import { create } from 'zustand'
import type { Thread, Message, Folder } from '@shared/types/mail'
import { ALL_INBOXES_ID, SEARCH_RESULTS_ID } from '@shared/constants'

interface MailState {
  threads: Thread[]
  selectedThreadId: string | null
  selectedThread: (Thread & { messages?: Message[] }) | null
  /** Multi-selection: a set of thread ids the user has bulk-selected. Bulk
   *  actions (archive, trash, …) operate on this set when non-empty;
   *  otherwise they fall back to selectedThreadId. */
  selectedIds: string[]
  folders: Folder[]
  currentFolderId: string | null
  currentFolderRole: string
  /** When the user has applied a search, the list is filtered to this FTS query.
   *  null = no active search. */
  searchQuery: string | null
  /** Folder id we were on before entering search mode, so we can return to it. */
  preSearchFolderId: string | null
  preSearchFolderRole: string
  loading: boolean
  error: string | null

  // Actions
  loadFolders: (accountId?: string) => Promise<void>
  loadThreads: (folderId?: string) => Promise<void>
  /** Append the next page of threads for the current folder. No-op if the
   *  list has already reached the end. Sprint #4 — pages of 100. */
  loadMoreThreads: () => Promise<void>
  /** True once the most recent fetch returned fewer rows than the page size. */
  endReached: boolean
  selectThread: (threadId: string | null) => Promise<void>
  navigateThread: (direction: 'up' | 'down') => void
  archive: (threadId?: string) => Promise<void>
  trash: (threadId?: string) => Promise<void>
  moveTo: (folderId: string, threadId?: string) => Promise<void>
  toggleStar: (threadId?: string) => Promise<void>
  toggleRead: (threadId?: string) => Promise<void>
  setCurrentFolder: (folderId: string, role?: string) => void
  // Multi-selection
  toggleSelect: (threadId?: string) => void
  selectAllThreads: () => void
  clearSelection: () => void
  extendSelection: (direction: 'up' | 'down') => void
  // Search: apply an FTS query to filter the thread list across all folders.
  applySearch: (query: string) => void
  exitSearch: () => void
}

export const useMailStore = create<MailState>((set, get) => ({
  threads: [],
  endReached: false,
  selectedThreadId: null,
  selectedThread: null,
  selectedIds: [],
  folders: [],
  currentFolderId: null,
  currentFolderRole: 'inbox',
  searchQuery: null,
  preSearchFolderId: null,
  preSearchFolderRole: 'inbox',
  loading: false,
  error: null,

  loadFolders: async (accountId) => {
    try {
      const folders = await window.api.listFolders(accountId)
      // Skip the state update if nothing actually changed — otherwise Zustand
      // hands every subscriber a new array reference and the sidebar re-renders
      // on every sync, contributing to the flicker.
      const prev = get().folders
      const changed =
        prev.length !== folders.length ||
        prev.some((p: any, i: number) => {
          const n = folders[i]
          return !n || p.id !== n.id || p.unreadCount !== n.unreadCount || p.totalCount !== n.totalCount || p.name !== n.name
        })
      if (changed) set({ folders })
    } catch (err) {
      set({ error: (err as Error).message })
    }
  },

  loadThreads: async (folderId) => {
    const id = folderId || get().currentFolderId
    if (!id) return

    // Only show the loading spinner if we don't already have threads for the
    // current folder. Background refreshes (called every minute after sync)
    // would otherwise flash the spinner over the existing list, causing visible
    // flicker of the whole pane.
    const hasExisting = get().threads.length > 0 && get().currentFolderId === id
    if (!hasExisting) set({ loading: true })

    try {
      // Route to the right query shape based on the virtual folder id:
      //   - ALL_INBOXES_ID   → cross-account inbox view
      //   - SEARCH_RESULTS_ID → FTS-filtered list (uses searchQuery from state)
      //   - anything else    → normal folder_id lookup
      const PAGE_SIZE = 100
      let listOptions: any
      if (id === ALL_INBOXES_ID) {
        listOptions = { allInboxes: true, limit: PAGE_SIZE }
      } else if (id === SEARCH_RESULTS_ID) {
        const q = get().searchQuery
        if (!q) { set({ loading: false }); return }
        listOptions = { searchText: q, limit: PAGE_SIZE }
      } else {
        listOptions = { folderId: id, limit: PAGE_SIZE }
      }
      const threads = await window.api.listMail(listOptions)
      // Sprint #4: track whether we've drained the folder so the infinite
      // scroller in MailList knows when to stop asking for more.
      set({ endReached: threads.length < PAGE_SIZE })

      // If the user switched folders while we were awaiting, drop this result.
      if ((folderId || get().currentFolderId) !== get().currentFolderId) {
        return
      }

      // If the previously-selected thread is no longer in the list (moved/archived
      // from another device, or folder switched), clear the stale selection so the
      // UI doesn't show a phantom highlight or stale reading-pane content.
      const prevSelected = get().selectedThreadId
      const stillPresent = prevSelected && threads.some((t) => t.id === prevSelected)
      if (prevSelected && !stillPresent) {
        set({ threads, loading: false, selectedThreadId: null, selectedThread: null })
      } else {
        set({ threads, loading: false })
      }

      // Auto-select first thread if none selected
      if (threads.length > 0 && !get().selectedThreadId) {
        get().selectThread(threads[0].id)
      }
    } catch (err) {
      set({ error: (err as Error).message, loading: false })
    }
  },

  loadMoreThreads: async () => {
    const { currentFolderId, threads, loading, endReached, searchQuery } = get()
    if (!currentFolderId || loading || endReached) return

    const PAGE_SIZE = 100
    const offset = threads.length

    let listOptions: any
    if (currentFolderId === ALL_INBOXES_ID) {
      listOptions = { allInboxes: true, limit: PAGE_SIZE, offset }
    } else if (currentFolderId === SEARCH_RESULTS_ID) {
      if (!searchQuery) return
      listOptions = { searchText: searchQuery, limit: PAGE_SIZE, offset }
    } else {
      listOptions = { folderId: currentFolderId, limit: PAGE_SIZE, offset }
    }
    try {
      const more = await window.api.listMail(listOptions)
      // Drop the result if the user switched folders mid-fetch.
      if (get().currentFolderId !== currentFolderId) return
      set((s) => ({
        threads: [...s.threads, ...more],
        endReached: more.length < PAGE_SIZE
      }))
    } catch (err) {
      console.error('[Store] loadMoreThreads failed:', err)
    }
  },

  selectThread: async (threadId) => {
    if (!threadId) {
      // No explicit id — keep current selection (re-fetching if needed),
      // otherwise fall back to the first thread.
      const { threads, selectedThreadId, selectedThread } = get()
      if (selectedThreadId && threads.some(t => t.id === selectedThreadId)) {
        // We already have the right id; if the data is loaded, nothing to do.
        if (selectedThread?.id === selectedThreadId) return
        threadId = selectedThreadId
      } else if (threads.length > 0) {
        threadId = threads[0].id
      } else {
        set({ selectedThreadId: null, selectedThread: null })
        return
      }
    }

    set({ selectedThreadId: threadId })
    try {
      const thread = await window.api.getThread(threadId)
      if (!thread) {
        // The thread vanished between listing and fetching (race with sync).
        // Don't leave the UI in a half-selected state — pick the next available thread.
        const remaining = get().threads.filter((t) => t.id !== threadId)
        if (remaining.length > 0) {
          set({ selectedThreadId: null, selectedThread: null })
          await get().selectThread(remaining[0].id)
        } else {
          set({ selectedThreadId: null, selectedThread: null })
        }
        return
      }
      // Ignore if the user already moved on to another thread while we awaited.
      if (get().selectedThreadId !== threadId) return
      set({ selectedThread: thread })
      // Mark as read
      await window.api.markRead(threadId)
      set((state) => ({
        threads: state.threads.map((t) =>
          t.id === threadId ? { ...t, unread: false } : t
        )
      }))
    } catch (err) {
      set({ error: (err as Error).message })
    }
  },

  navigateThread: (direction) => {
    const { threads, selectedThreadId } = get()
    if (threads.length === 0) return

    const currentIndex = threads.findIndex((t) => t.id === selectedThreadId)
    let newIndex: number

    if (direction === 'down') {
      newIndex = currentIndex < threads.length - 1 ? currentIndex + 1 : currentIndex
    } else {
      newIndex = currentIndex > 0 ? currentIndex - 1 : 0
    }

    get().selectThread(threads[newIndex].id)
  },

  archive: async (threadId) => {
    // If the user has bulk-selected threads, prefer that set (unless an explicit id was passed).
    const { selectedIds } = get()
    const ids = threadId
      ? [threadId]
      : (selectedIds.length > 0 ? selectedIds : (get().selectedThreadId ? [get().selectedThreadId!] : []))
    if (ids.length === 0) return

    const { threads, selectedThreadId } = get()
    const lastId = ids[ids.length - 1]
    const lastIdx = threads.findIndex((t) => t.id === lastId)
    const idSet = new Set(ids)
    // Pick the next thread that ISN'T in the selection to advance the cursor to.
    let nextThread: Thread | null = null
    for (let i = lastIdx + 1; i < threads.length; i++) {
      if (!idSet.has(threads[i].id)) { nextThread = threads[i]; break }
    }
    if (!nextThread) {
      for (let i = lastIdx - 1; i >= 0; i--) {
        if (!idSet.has(threads[i].id)) { nextThread = threads[i]; break }
      }
    }

    console.log('[Store] archive() firing, ids:', ids)
    try {
      const results = await Promise.all(ids.map((id) => window.api.archive(id)))
      const successCount = results.filter((r: any) => r?.success).length
      const failures = results.filter((r: any) => !r?.success)
      if (failures.length > 0) {
        console.warn('[Store] Archive: some IPC calls did not succeed', failures)
      }
      console.log(`[Store] archive() done — ${successCount}/${ids.length} archived`)

      // Surface a quick toast so the user gets immediate feedback even if the
      // list filter below somehow doesn't re-render.
      if (successCount > 0) {
        try {
          const { useUIStore } = await import('./ui.store')
          useUIStore.getState().showUndoToast(
            successCount === 1 ? 'Archived' : `Archived ${successCount}`,
            ids[0]
          )
        } catch { /* ignore toast errors */ }
      }

      set((state) => ({
        threads: state.threads.filter((t) => !idSet.has(t.id)),
        selectedIds: [],
        selectedThreadId: idSet.has(selectedThreadId || '') ? (nextThread?.id || null) : state.selectedThreadId,
        selectedThread: idSet.has(selectedThreadId || '') ? null : state.selectedThread
      }))

      if (nextThread && idSet.has(selectedThreadId || '')) {
        get().selectThread(nextThread.id)
      }
    } catch (err) {
      console.error('[Store] Archive failed:', err)
    }
  },

  trash: async (threadId) => {
    const { selectedIds } = get()
    const ids = threadId
      ? [threadId]
      : (selectedIds.length > 0 ? selectedIds : (get().selectedThreadId ? [get().selectedThreadId!] : []))
    if (ids.length === 0) return

    const { threads, selectedThreadId } = get()
    const lastId = ids[ids.length - 1]
    const lastIdx = threads.findIndex((t) => t.id === lastId)
    const idSet = new Set(ids)
    let nextThread: Thread | null = null
    for (let i = lastIdx + 1; i < threads.length; i++) {
      if (!idSet.has(threads[i].id)) { nextThread = threads[i]; break }
    }
    if (!nextThread) {
      for (let i = lastIdx - 1; i >= 0; i--) {
        if (!idSet.has(threads[i].id)) { nextThread = threads[i]; break }
      }
    }

    try {
      await Promise.all(ids.map((id) => window.api.trash(id)))

      set((state) => ({
        threads: state.threads.filter((t) => !idSet.has(t.id)),
        selectedIds: [],
        selectedThreadId: idSet.has(selectedThreadId || '') ? (nextThread?.id || null) : state.selectedThreadId,
        selectedThread: idSet.has(selectedThreadId || '') ? null : state.selectedThread
      }))

      if (nextThread && idSet.has(selectedThreadId || '')) {
        get().selectThread(nextThread.id)
      }
    } catch (err) {
      console.error('[Store] Trash failed:', err)
    }
  },

  moveTo: async (folderId, threadId) => {
    const id = threadId || get().selectedThreadId
    if (!id) return

    // If the thread is already in this folder, no-op
    const thread = get().threads.find((t) => t.id === id)
    if (thread?.folderId === folderId) return

    // Find next thread before removing from current list
    const { threads, selectedThreadId, currentFolderId } = get()
    const currentIndex = threads.findIndex((t) => t.id === id)
    const nextThread = threads[currentIndex + 1] || threads[currentIndex - 1] || null

    try {
      await window.api.moveMail(id, folderId)

      // Only remove from current list if we moved it OUT of the current folder
      if (folderId !== currentFolderId) {
        set((state) => ({
          threads: state.threads.filter((t) => t.id !== id),
          selectedThreadId: selectedThreadId === id ? (nextThread?.id || null) : state.selectedThreadId,
          selectedThread: selectedThreadId === id ? null : state.selectedThread
        }))
        if (nextThread && selectedThreadId === id) {
          get().selectThread(nextThread.id)
        }
      }
    } catch (err) {
      console.error('[Store] Move failed:', err)
    }
  },

  toggleStar: async (threadId) => {
    const id = threadId || get().selectedThreadId
    if (!id) return

    const thread = get().threads.find((t) => t.id === id)
    if (!thread) return

    if (thread.starred) {
      await window.api.unstar(id)
    } else {
      await window.api.star(id)
    }

    set((state) => ({
      threads: state.threads.map((t) =>
        t.id === id ? { ...t, starred: !t.starred } : t
      )
    }))
  },

  toggleRead: async (threadId) => {
    const id = threadId || get().selectedThreadId
    if (!id) return

    const thread = get().threads.find((t) => t.id === id)
    if (!thread) return

    if (thread.unread) {
      await window.api.markRead(id)
    } else {
      await window.api.markUnread(id)
    }

    set((state) => ({
      threads: state.threads.map((t) =>
        t.id === id ? { ...t, unread: !t.unread } : t
      )
    }))
  },

  setCurrentFolder: (folderId, role) => {
    set({
      currentFolderId: folderId,
      currentFolderRole: role || 'custom',
      selectedThreadId: null,
      selectedThread: null,
      selectedIds: [] // multi-selection doesn't carry across folders
    })
    get().loadThreads(folderId)
  },

  // ── Multi-selection ────────────────────────────────────────────────────────

  toggleSelect: (threadId) => {
    const id = threadId || get().selectedThreadId
    if (!id) return
    set((state) => {
      const exists = state.selectedIds.includes(id)
      return {
        selectedIds: exists
          ? state.selectedIds.filter((x) => x !== id)
          : [...state.selectedIds, id]
      }
    })
  },

  selectAllThreads: () => {
    const { threads } = get()
    set({ selectedIds: threads.map((t) => t.id) })
  },

  clearSelection: () => {
    set({ selectedIds: [] })
  },

  extendSelection: (direction) => {
    const { threads, selectedThreadId, selectedIds } = get()
    if (threads.length === 0) return

    const anchor = selectedThreadId || threads[0].id
    let cursorIndex = threads.findIndex((t) => t.id === anchor)
    if (cursorIndex < 0) cursorIndex = 0

    const newIndex = direction === 'down'
      ? Math.min(cursorIndex + 1, threads.length - 1)
      : Math.max(cursorIndex - 1, 0)

    const newId = threads[newIndex].id

    // Seed the selection with the anchor on first extension so the user gets
    // a contiguous range that includes where they started.
    const next = new Set(selectedIds)
    next.add(anchor)
    next.add(newId)

    set({ selectedIds: Array.from(next) })
    // Move the visible cursor too so the reading pane follows along.
    get().selectThread(newId)
  },

  // ── Search filter ─────────────────────────────────────────────────────────

  applySearch: (query) => {
    const trimmed = query.trim()
    if (!trimmed) {
      get().exitSearch()
      return
    }
    const state = get()
    // Remember where we were so exitSearch can take us back. Don't overwrite
    // if we're already in search mode (consecutive search refinements).
    const isAlreadySearching = state.currentFolderId === SEARCH_RESULTS_ID
    set({
      searchQuery: trimmed,
      currentFolderId: SEARCH_RESULTS_ID,
      currentFolderRole: 'search',
      selectedThreadId: null,
      selectedThread: null,
      selectedIds: [],
      preSearchFolderId: isAlreadySearching ? state.preSearchFolderId : state.currentFolderId,
      preSearchFolderRole: isAlreadySearching ? state.preSearchFolderRole : state.currentFolderRole
    })
    get().loadThreads(SEARCH_RESULTS_ID)
  },

  exitSearch: () => {
    const state = get()
    if (state.currentFolderId !== SEARCH_RESULTS_ID && state.searchQuery === null) return
    const back = state.preSearchFolderId
    const backRole = state.preSearchFolderRole
    set({
      searchQuery: null,
      preSearchFolderId: null,
      preSearchFolderRole: 'inbox'
    })
    if (back) {
      get().setCurrentFolder(back, backRole)
    }
  }
}))
