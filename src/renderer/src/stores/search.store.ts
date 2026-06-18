import { create } from 'zustand'
import type { SearchResult } from '@shared/types/search'

interface SearchState {
  query: string
  results: SearchResult[]
  isOpen: boolean
  loading: boolean

  setQuery: (q: string) => void
  search: (q: string) => Promise<void>
  open: () => void
  close: () => void
  clear: () => void
}

export const useSearchStore = create<SearchState>((set) => ({
  query: '',
  results: [],
  isOpen: false,
  loading: false,

  setQuery: (q) => set({ query: q }),

  search: async (q) => {
    if (!q.trim()) {
      set({ results: [], loading: false })
      return
    }
    set({ loading: true })
    try {
      const results = await window.api.search({ text: q })
      set({ results, loading: false })
    } catch {
      set({ results: [], loading: false })
    }
  },

  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false, query: '', results: [] }),
  clear: () => set({ query: '', results: [] })
}))
