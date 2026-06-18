import { useMailStore } from '../../stores/mail.store'
import { useAccountsStore } from '../../stores/accounts.store'
import { useUIStore } from '../../stores/ui.store'
import { FOLDER_ICONS, ALL_INBOXES_ID } from '@shared/constants'
import type { Folder } from '@shared/types/mail'

const FOLDER_ORDER: Record<string, number> = {
  inbox: 0,
  starred: 1,
  sent: 2,
  drafts: 3,
  archive: 4,
  spam: 5,
  trash: 6,
  custom: 7
}

export function Sidebar() {
  const folders = useMailStore((s) => s.folders)
  const currentFolderId = useMailStore((s) => s.currentFolderId)
  const setCurrentFolder = useMailStore((s) => s.setCurrentFolder)
  const accounts = useAccountsStore((s) => s.accounts)
  const activeAccountId = useAccountsStore((s) => s.activeAccountId)
  const setActiveAccount = useAccountsStore((s) => s.setActiveAccount)

  const sortedFolders = [...folders]
    .filter((f) => !activeAccountId || f.accountId === activeAccountId)
    .sort((a, b) => (FOLDER_ORDER[a.role] ?? 99) - (FOLDER_ORDER[b.role] ?? 99))

  // Total unread across all enabled accounts' inboxes, shown next to "All Inboxes".
  const enabledAccountIds = new Set(
    accounts.filter((a: any) => a.enabled !== false).map((a: any) => a.id)
  )
  const totalInboxUnread = folders
    .filter((f) => f.role === 'inbox' && enabledAccountIds.has(f.accountId))
    .reduce((sum, f) => sum + (f.unreadCount || 0), 0)
  const hasMultipleAccounts = accounts.filter((a: any) => a.enabled !== false).length > 1

  return (
    <div className="h-full flex flex-col py-1" style={{ backgroundColor: 'var(--paper-sunken)' }}>
      {/* Unified inbox — only when the user has more than one enabled account */}
      {hasMultipleAccounts && (
        <div className="px-1 pb-1 mb-1" style={{ borderBottom: '1px solid var(--border)' }}>
          <button
            onClick={() => setCurrentFolder(ALL_INBOXES_ID, 'inbox')}
            className={`sidebar-item w-full text-left ${
              currentFolderId === ALL_INBOXES_ID ? 'active' : ''
            }`}
          >
            <span
              className="w-[16px] text-center flex-shrink-0 text-xs"
              style={{ opacity: 0.6 }}
            >
              ∀
            </span>
            <span className="flex-1 truncate font-bold">All Inboxes</span>
            {totalInboxUnread > 0 && (
              <span
                className="text-2xs font-mono"
                style={{ color: 'var(--ink-tertiary)' }}
              >
                {totalInboxUnread}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Account switcher */}
      {accounts.length > 1 && (
        <div className="px-2 pb-2 mb-1" style={{ borderBottom: '1px solid var(--border)' }}>
          {accounts.map((account) => (
            <button
              key={account.id}
              onClick={() => setActiveAccount(account.id)}
              className={`sidebar-item w-full text-left ${
                activeAccountId === account.id && currentFolderId !== ALL_INBOXES_ID ? 'active' : ''
              }`}
            >
              <span
                className="w-[16px] text-center flex-shrink-0 text-xs"
                style={{ opacity: 0.4 }}
              >✉</span>
              <span className="truncate text-sm">{account.email}</span>
            </button>
          ))}
        </div>
      )}

      {/* Folder list */}
      <div className="flex-1 overflow-y-auto px-1">
        {sortedFolders.map((folder) => (
          <FolderItem
            key={folder.id}
            folder={folder}
            isActive={currentFolderId === folder.id}
            onClick={() => setCurrentFolder(folder.id, folder.role)}
          />
        ))}
      </div>

      {/* Bottom area */}
      <div className="px-1 pt-1 mt-1 space-y-0.5" style={{ borderTop: '1px solid var(--border)' }}>
        <button
          onClick={() => useUIStore.getState().openSettings()}
          className="sidebar-item w-full text-left"
        >
          <span className="w-[16px] text-center flex-shrink-0 text-xs" style={{ opacity: 0.6 }}>⚙</span>
          <span className="flex-1">Settings</span>
          <span className="text-2xs font-mono" style={{ color: 'var(--ink-faint)' }}>⌘,</span>
        </button>
        <div className="text-2xs px-2 pb-0.5" style={{ color: 'var(--ink-faint)' }}>
          ⌘K Command palette
        </div>
      </div>
    </div>
  )
}

function FolderItem({
  folder,
  isActive,
  onClick
}: {
  folder: Folder
  isActive: boolean
  onClick: () => void
}) {
  const icon = FOLDER_ICONS[folder.role] || FOLDER_ICONS.custom

  return (
    <button
      onClick={onClick}
      className={`sidebar-item w-full text-left ${isActive ? 'active' : ''}`}
    >
      <span className="w-[16px] text-center flex-shrink-0 text-xs" style={{ opacity: 0.6 }}>
        {icon}
      </span>
      <span className="flex-1 truncate">{folder.name.toUpperCase() === 'INBOX' ? 'Inbox' : folder.name}</span>
      {folder.unreadCount > 0 && (
        <span
          className="text-2xs font-mono"
          style={{ color: 'var(--ink-tertiary)' }}
        >
          {folder.unreadCount}
        </span>
      )}
    </button>
  )
}
