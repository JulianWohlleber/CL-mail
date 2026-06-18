import { create } from 'zustand'

export interface Command {
  id: string
  label: string
  shortcut?: string
  category: string
  execute: () => void
}

interface CommandState {
  commands: Command[]
  isOpen: boolean
  query: string
  filteredCommands: Command[]

  register: (command: Command) => void
  registerMany: (commands: Command[]) => void
  unregister: (id: string) => void
  open: () => void
  close: () => void
  setQuery: (q: string) => void
  execute: (id: string) => void
}

function fuzzyMatch(query: string, text: string): boolean {
  const q = query.toLowerCase()
  const t = text.toLowerCase()
  let qi = 0
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) qi++
  }
  return qi === q.length
}

function fuzzyScore(query: string, text: string): number {
  const q = query.toLowerCase()
  const t = text.toLowerCase()
  let score = 0
  let qi = 0
  let lastMatchIndex = -1

  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      score += 1
      if (lastMatchIndex === ti - 1) score += 2 // consecutive bonus
      if (ti === 0 || t[ti - 1] === ' ') score += 3 // word start bonus
      lastMatchIndex = ti
      qi++
    }
  }

  return qi === q.length ? score : -1
}

export const useCommandStore = create<CommandState>((set, get) => ({
  commands: [],
  isOpen: false,
  query: '',
  filteredCommands: [],

  register: (command) => {
    set((state) => ({
      commands: [...state.commands.filter((c) => c.id !== command.id), command]
    }))
  },

  registerMany: (commands) => {
    set((state) => {
      const ids = new Set(commands.map((c) => c.id))
      const existing = state.commands.filter((c) => !ids.has(c.id))
      return { commands: [...existing, ...commands] }
    })
  },

  unregister: (id) => {
    set((state) => ({
      commands: state.commands.filter((c) => c.id !== id)
    }))
  },

  open: () => {
    set({ isOpen: true, query: '', filteredCommands: get().commands })
  },

  close: () => {
    set({ isOpen: false, query: '', filteredCommands: [] })
  },

  setQuery: (q) => {
    const { commands } = get()
    if (!q) {
      set({ query: q, filteredCommands: commands })
      return
    }

    const scored = commands
      .map((cmd) => ({
        cmd,
        score: Math.max(fuzzyScore(q, cmd.label), fuzzyScore(q, cmd.category))
      }))
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)

    set({ query: q, filteredCommands: scored.map((s) => s.cmd) })
  },

  execute: (id) => {
    const cmd = get().commands.find((c) => c.id === id)
    if (cmd) {
      cmd.execute()
      get().close()
    }
  }
}))
