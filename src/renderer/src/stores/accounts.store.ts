import { create } from 'zustand'
import type { AccountSummary } from '@shared/types/account'

interface AccountsState {
  accounts: AccountSummary[]
  activeAccountId: string | null
  loading: boolean

  loadAccounts: () => Promise<void>
  setActiveAccount: (id: string | null) => void
  addAccount: (config: any) => Promise<{ id: string } | null>
  removeAccount: (id: string) => Promise<void>
}

export const useAccountsStore = create<AccountsState>((set, get) => ({
  accounts: [],
  activeAccountId: null,
  loading: false,

  loadAccounts: async () => {
    set({ loading: true })
    const accounts = await window.api.listAccounts()
    // Preserve the previously-active selection if that account still exists,
    // otherwise default to the first account. This avoids the active account
    // jumping back to #1 every time the list is reloaded (e.g. after adding
    // or removing an account).
    const prev = get().activeAccountId
    const stillExists = prev && accounts.some((a: any) => a.id === prev)
    set({
      accounts,
      loading: false,
      activeAccountId: stillExists ? prev : (accounts.length > 0 ? accounts[0].id : null)
    })
  },

  setActiveAccount: (id) => {
    set({ activeAccountId: id })
    if (id) {
      // Dynamically import to avoid circular deps
      import('./mail.store').then(({ useMailStore }) => {
        const { folders, setCurrentFolder } = useMailStore.getState()
        const inbox = folders.find((f) => f.accountId === id && f.role === 'inbox')
        if (inbox) setCurrentFolder(inbox.id, inbox.role)
      })
    }
  },

  addAccount: async (config) => {
    try {
      const result = await window.api.addAccount(config)
      await get().loadAccounts()
      return result
    } catch {
      return null
    }
  },

  removeAccount: async (id) => {
    await window.api.removeAccount(id)
    await get().loadAccounts()
  }
}))
