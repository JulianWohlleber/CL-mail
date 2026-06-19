import { useState, useEffect } from 'react'
import { useUIStore } from '../../stores/ui.store'
import { useAccountsStore } from '../../stores/accounts.store'
import type { AppSettings } from '@shared/types/settings'
import { DEFAULT_SETTINGS } from '@shared/types/settings'
import { AccountSetup } from './AccountSetup'
import { SignatureEditor } from './SignatureEditor'
import { ShortcutsEditor } from './ShortcutsEditor'
import { PermissionModal, type PermissionInfo } from './PermissionModal'
import { AppleMailImportModal } from './AppleMailImportModal'

type Tab = 'general' | 'accounts' | 'vault' | 'calendar' | 'privacy' | 'shortcuts' | 'appearance' | 'signatures'

export function SettingsPanel() {
  const closeSettings = useUIStore((s) => s.closeSettings)
  const setTheme = useUIStore((s) => s.setTheme)
  const theme = useUIStore((s) => s.theme)
  const [activeTab, setActiveTab] = useState<Tab>('general')
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)

  useEffect(() => {
    window.api.getSettings().then(setSettings)
  }, [])

  const updateSetting = async (key: keyof AppSettings, value: any) => {
    setSettings((s) => ({ ...s, [key]: value }))
    await window.api.setSetting(key, value)
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'general', label: 'General' },
    { id: 'accounts', label: 'Accounts' },
    { id: 'vault', label: 'Vault' },
    { id: 'calendar', label: 'Calendar' },
    { id: 'privacy', label: 'Privacy' },
    { id: 'shortcuts', label: 'Shortcuts' },
    { id: 'signatures', label: 'Signatures' },
    { id: 'appearance', label: 'Appearance' }
  ]

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center" onClick={closeSettings}>
      <div className="absolute inset-0" style={{ backgroundColor: 'rgba(0,0,0,0.25)' }} />
      <div
        className="relative w-[720px] h-[560px] rounded-lg shadow-overlay flex overflow-hidden"
        style={{ backgroundColor: 'var(--paper-overlay)', border: '1px solid var(--border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sidebar */}
        <div className="w-[180px] py-3 px-2 flex-shrink-0" style={{ backgroundColor: 'var(--paper-sunken)', borderRight: '1px solid var(--border)' }}>
          <div className="text-sm font-bold px-2 mb-2" style={{ color: 'var(--ink)' }}>Settings</div>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`sidebar-item w-full text-left ${activeTab === tab.id ? 'active' : ''}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold" style={{ color: 'var(--ink)' }}>
              {tabs.find((t) => t.id === activeTab)?.label}
            </h2>
            <button onClick={closeSettings} className="text-sm" style={{ color: 'var(--ink-tertiary)' }}>✕</button>
          </div>

          {activeTab === 'general' && (
            <div className="space-y-4">
              <SettingRow label="Undo send delay" description="Seconds to wait before sending">
                <select
                  value={settings.undoSendDelay}
                  onChange={(e) => updateSetting('undoSendDelay', Number(e.target.value))}
                  className="bg-transparent text-sm rounded px-2 py-1"
                  style={{ border: '1px solid var(--border)', color: 'var(--ink)' }}
                >
                  {[0, 3, 5, 10, 15, 30].map((s) => (
                    <option key={s} value={s}>{s === 0 ? 'Off' : `${s}s`}</option>
                  ))}
                </select>
              </SettingRow>

              <SettingRow label="Notifications" description="Show notifications for new mail">
                <Toggle
                  value={settings.notificationsEnabled}
                  onChange={(v) => updateSetting('notificationsEnabled', v)}
                />
              </SettingRow>

              <SettingRow label="Split Inbox" description="Categorize inbox into tabs">
                <Toggle
                  value={settings.splitInboxEnabled}
                  onChange={(v) => updateSetting('splitInboxEnabled', v)}
                />
              </SettingRow>

              <SettingRow label="Mark as read delay" description="Milliseconds before marking opened email as read">
                <select
                  value={settings.markAsReadDelay}
                  onChange={(e) => updateSetting('markAsReadDelay', Number(e.target.value))}
                  className="bg-transparent text-sm rounded px-2 py-1"
                  style={{ border: '1px solid var(--border)', color: 'var(--ink)' }}
                >
                  {[0, 500, 1000, 2000, 5000].map((ms) => (
                    <option key={ms} value={ms}>{ms === 0 ? 'Instant' : `${ms / 1000}s`}</option>
                  ))}
                </select>
              </SettingRow>

              <SettingRow
                label="Usage stats (on-device)"
                description="Count which features you use. Strictly local — never leaves this Mac."
              >
                <Toggle
                  value={!!settings.usageStatsEnabled}
                  onChange={(v) => updateSetting('usageStatsEnabled', v)}
                />
              </SettingRow>

              <AboutSection />
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="space-y-4">
              <SettingRow label="Theme" description="Light, dark, or match system">
                <div className="flex gap-1">
                  {(['light', 'dark', 'system'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => {
                        updateSetting('theme', t)
                        setTheme(t)
                      }}
                      className="px-3 py-1 text-sm rounded capitalize"
                      style={{
                        backgroundColor: theme === t ? 'var(--paper-raised)' : 'transparent',
                        color: theme === t ? 'var(--ink)' : 'var(--ink-tertiary)',
                        border: `1px solid ${theme === t ? 'var(--border-strong)' : 'var(--border)'}`,
                        fontWeight: theme === t ? 600 : 400
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </SettingRow>

              <SettingRow label="Compact list" description="Show less spacing in the mail list">
                <Toggle
                  value={settings.compactList}
                  onChange={(v) => updateSetting('compactList', v)}
                />
              </SettingRow>

              <SettingRow label="Reading pane" description="Position of the reading pane">
                <select
                  value={settings.readingPanePosition}
                  onChange={(e) => updateSetting('readingPanePosition', e.target.value)}
                  className="bg-transparent text-sm rounded px-2 py-1"
                  style={{ border: '1px solid var(--border)', color: 'var(--ink)' }}
                >
                  <option value="right">Right</option>
                  <option value="bottom">Bottom</option>
                  <option value="hidden">Hidden</option>
                </select>
              </SettingRow>
            </div>
          )}

          {activeTab === 'shortcuts' && (
            <ShortcutsEditor />
          )}

          {activeTab === 'signatures' && (
            <SignatureEditor settings={settings} updateSetting={updateSetting} />
          )}

          {activeTab === 'accounts' && (
            <AccountsTab onClose={closeSettings} />
          )}

          {activeTab === 'vault' && (
            <VaultTab />
          )}

          {activeTab === 'privacy' && (
            <PrivacyTab settings={settings} updateSetting={updateSetting} />
          )}

          {activeTab === 'calendar' && (
            <CalendarTab />
          )}
        </div>
      </div>
    </div>
  )
}

function CalendarTab() {
  const [accounts, setAccounts] = useState<any[]>([])
  const [addOpen, setAddOpen] = useState(false)
  const [refreshing, setRefreshing] = useState<string | null>(null)

  const load = () => (window.api as any).listCalendarAccounts().then(setAccounts)
  useEffect(() => { load() }, [])

  const refresh = async (id: string) => {
    setRefreshing(id)
    await (window.api as any).syncCalendarAccount(id)
    await load()
    setRefreshing(null)
  }
  const remove = async (id: string, label: string) => {
    if (!confirm(`Disconnect "${label}"?`)) return
    await (window.api as any).removeCalendarAccount(id)
    await load()
  }

  return (
    <div className="space-y-3">
      <div
        className="px-3 py-2 rounded text-xs"
        style={{ backgroundColor: 'var(--paper-raised)', color: 'var(--ink-secondary)', border: '1px solid var(--border)' }}
      >
        mail_ is not a calendar app — these accounts only exist so the "Accept invite" button on .ics emails can drop events into a calendar of your choice. iCloud, Nextcloud and any generic CalDAV server work. Google Calendar needs OAuth credentials (see the picker for setup).
      </div>

      {accounts.length === 0 ? (
        <div className="text-sm" style={{ color: 'var(--ink-tertiary)' }}>
          No calendars connected. Click "Connect a calendar" to add one.
        </div>
      ) : (
        accounts.map((a) => (
          <div
            key={a.id}
            className="px-3 py-2 rounded"
            style={{ backgroundColor: 'var(--paper-raised)', border: '1px solid var(--border)' }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="w-[10px] h-[10px] rounded-full"
                  style={{ backgroundColor: a.color || 'var(--accent)' }}
                />
                <div>
                  <div className="text-sm font-bold" style={{ color: 'var(--ink)' }}>
                    {a.displayName} <span className="text-xs font-normal" style={{ color: 'var(--ink-tertiary)' }}>· {a.provider}</span>
                  </div>
                  <div className="text-xs" style={{ color: 'var(--ink-tertiary)' }}>
                    {a.username} · {a.calendarCount} calendar{a.calendarCount === 1 ? '' : 's'}
                  </div>
                  {a.lastError && (
                    <div className="text-2xs mt-0.5" style={{ color: '#c0392b' }}>{a.lastError}</div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => refresh(a.id)}
                  disabled={refreshing === a.id}
                  className="text-xs px-2 py-0.5 rounded"
                  style={{ border: '1px solid var(--border)', color: 'var(--ink-secondary)' }}
                >
                  {refreshing === a.id ? '…' : 'Refresh'}
                </button>
                <button
                  onClick={() => remove(a.id, a.displayName)}
                  className="text-xs px-2 py-0.5 rounded"
                  style={{ color: 'var(--danger)' }}
                >
                  Disconnect
                </button>
              </div>
            </div>
          </div>
        ))
      )}

      <button
        onClick={() => setAddOpen(true)}
        className="px-4 py-2 text-sm rounded font-bold text-white"
        style={{ backgroundColor: 'var(--accent)' }}
      >
        + Connect a calendar
      </button>

      {addOpen && (
        <AddCalendarModalLazy
          onClose={() => setAddOpen(false)}
          onAdded={() => { setAddOpen(false); load() }}
        />
      )}
    </div>
  )
}

// Lazy wrapper so this file doesn't import the modal eagerly at module load.
function AddCalendarModalLazy(props: { onClose: () => void; onAdded: () => void }) {
  const [Mod, setMod] = useState<any>(null)
  useEffect(() => { import('../calendar/AddCalendarModal').then((m) => setMod(() => m.AddCalendarModal)) }, [])
  if (!Mod) return null
  return <Mod {...props} />
}

function PrivacyTab({ settings, updateSetting }: { settings: AppSettings; updateSetting: (k: keyof AppSettings, v: any) => void }) {
  const [openPermission, setOpenPermission] = useState<PermissionInfo | null>(null)

  // Build the list of permissions in one place so the row, the modal,
  // and any future programmatic launch (e.g. from a feature that needs it)
  // share the same content.
  const permissions: Array<PermissionInfo & { short: string }> = [
    {
      title: 'macOS Contacts',
      short: 'Auto-complete recipients from your address book',
      icon: '☺',
      description: 'When enabled, mail_ queries your macOS address book as you type a recipient. Suggestions are merged with people you have written to before. Nothing is uploaded anywhere — the lookup happens locally on your Mac.',
      caveat: 'When off, recipient suggestions come only from your mail history.',
      enabled: !!settings.macContactsEnabled,
      onToggle: (v) => updateSetting('macContactsEnabled', v),
      systemPane: 'contacts',
      systemPaneLabel: 'Privacy → Contacts'
    },
    {
      title: 'Calendar import',
      short: 'Add invites & Calendly events to Calendar.app',
      icon: '☷',
      description: 'Lets the “Add to Calendar” button on .ics attachments and detected Calendly events open Calendar.app. mail_ writes a temporary .ics to your tmp folder and asks the system to open it.',
      caveat: 'Calendar.app may itself ask for permission the first time.',
      enabled: !!settings.calendarImportEnabled,
      onToggle: (v) => updateSetting('calendarImportEnabled', v),
      systemPane: 'calendars',
      systemPaneLabel: 'Privacy → Calendars'
    },
    {
      title: 'Notifications',
      short: 'macOS banners for new mail',
      icon: '◔',
      description: 'Show a macOS notification when a new message arrives. You can fine-tune look, sound and Do Not Disturb behaviour in the system pane.',
      enabled: !!settings.notificationsEnabled,
      onToggle: (v) => updateSetting('notificationsEnabled', v),
      systemPane: 'notifications',
      systemPaneLabel: 'Notifications'
    }
  ]

  const openPane = (pane: string) => (window.api as any).openSystemPane(pane)

  return (
    <div className="space-y-3">
      <div
        className="px-3 py-2 rounded text-xs"
        style={{ backgroundColor: 'var(--paper-raised)', color: 'var(--ink-secondary)', border: '1px solid var(--border)' }}
      >
        Click any item to see what it does and grant permission once in System Settings.
        Toggles control whether mail_ even tries to use the integration — leave them off to avoid the macOS permission prompt entirely.
      </div>

      <div
        className="rounded overflow-hidden"
        style={{ border: '1px solid var(--border)', backgroundColor: 'var(--paper-raised)' }}
      >
        {permissions.map((p, i) => (
          <PermissionRow
            key={p.title}
            permission={p}
            isLast={i === permissions.length - 1}
            onOpen={() => setOpenPermission(p)}
          />
        ))}
      </div>

      <div className="pt-3 mt-3" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="text-xs font-bold mb-1" style={{ color: 'var(--ink-secondary)' }}>
          Other system panes
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => openPane('automation')} className="text-xs px-2 py-1 rounded" style={{ border: '1px solid var(--border)', color: 'var(--ink-secondary)' }}>
            Privacy → Automation →
          </button>
          <button onClick={() => openPane('full_disk')} className="text-xs px-2 py-1 rounded" style={{ border: '1px solid var(--border)', color: 'var(--ink-secondary)' }}>
            Privacy → Full Disk Access →
          </button>
          <button onClick={() => openPane('privacy')} className="text-xs px-2 py-1 rounded" style={{ border: '1px solid var(--border)', color: 'var(--ink-secondary)' }}>
            Privacy & Security →
          </button>
        </div>
        <div className="text-2xs mt-2" style={{ color: 'var(--ink-tertiary)' }}>
          The keychain prompt for stored mail passwords is shown by macOS and can't be suppressed by the app — picking "Always Allow" in that dialog is the one-time fix.
        </div>
      </div>

      {openPermission && (
        <PermissionModal
          permission={openPermission}
          onClose={() => setOpenPermission(null)}
        />
      )}
    </div>
  )
}

function PermissionRow({
  permission,
  isLast,
  onOpen
}: {
  permission: PermissionInfo & { short: string }
  isLast: boolean
  onOpen: () => void
}) {
  return (
    <div
      onClick={onOpen}
      className="flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors"
      style={{
        borderBottom: isLast ? 'none' : '1px solid var(--border)'
      }}
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--paper-overlay)')}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}
    >
      <div
        className="flex items-center justify-center flex-shrink-0"
        style={{
          width: 28,
          height: 28,
          borderRadius: 6,
          backgroundColor: 'var(--paper-overlay)',
          border: '1px solid var(--border)',
          fontSize: 14,
          color: 'var(--ink-secondary)'
        }}
      >
        {permission.icon || '◌'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold" style={{ color: 'var(--ink)' }}>
          {permission.title}
        </div>
        <div className="text-xs truncate" style={{ color: 'var(--ink-tertiary)' }}>
          {permission.short}
        </div>
      </div>
      <div
        className="flex items-center gap-1.5 font-mono flex-shrink-0"
        style={{
          fontSize: 10,
          color: permission.enabled ? 'var(--accent)' : 'var(--ink-tertiary)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em'
        }}
      >
        <span
          className="w-[6px] h-[6px] rounded-full"
          style={{ backgroundColor: permission.enabled ? 'var(--accent)' : 'var(--ink-faint)' }}
        />
        {permission.enabled ? 'on' : 'off'}
      </div>
      <span className="text-xs flex-shrink-0" style={{ color: 'var(--ink-tertiary)' }}>›</span>
    </div>
  )
}

function VaultTab() {
  const accounts = useAccountsStore((s) => s.accounts)
  const loadAccounts = useAccountsStore((s) => s.loadAccounts)
  const [syncing, setSyncing] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  const handleSetVault = async (accountId: string) => {
    const path = await window.api.pickVaultFolder()
    if (path) {
      await window.api.updateAccount(accountId, { vaultPath: path })
      await loadAccounts()
    }
  }

  const handleClearVault = async (accountId: string) => {
    await window.api.updateAccount(accountId, { vaultPath: null })
    await loadAccounts()
  }

  const handleSyncAll = async () => {
    setSyncing(true)
    setStatus(null)
    const result = await window.api.syncVault()
    setSyncing(false)
    if (result?.success) {
      setStatus(`Synced ${new Date().toLocaleTimeString()}`)
    } else {
      setStatus(`Error: ${result?.error || 'unknown'}`)
    }
  }

  const anyConnected = accounts.some((a: any) => a.vaultPath)

  return (
    <div className="space-y-4">
      <div
        className="px-3 py-2 rounded text-xs"
        style={{ backgroundColor: 'var(--paper-raised)', color: 'var(--ink-secondary)', border: '1px solid var(--border)' }}
      >
        Each account can be linked to a folder (e.g. an Obsidian vault). All threads will be exported as markdown files in <code>{'{vault}'}/Mail/</code> with YAML frontmatter for tags and search. Sync runs automatically after every mail check, and immediately after archive, move, star or read changes.
      </div>

      {accounts.map((account: any) => (
        <div
          key={account.id}
          className="px-3 py-2 rounded"
          style={{ backgroundColor: 'var(--paper-raised)', border: '1px solid var(--border)' }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className="w-[10px] h-[10px] rounded-full"
                style={{ backgroundColor: account.color }}
              />
              <div>
                <div className="text-sm font-bold" style={{ color: 'var(--ink)' }}>
                  {account.displayName || account.email}
                </div>
                <div className="text-xs" style={{ color: 'var(--ink-tertiary)' }}>
                  {account.vaultPath || 'No vault selected'}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {account.vaultPath && (
                <button
                  onClick={() => handleClearVault(account.id)}
                  className="text-2xs px-1.5 py-0.5 rounded"
                  style={{ color: 'var(--ink-tertiary)' }}
                >
                  Disconnect
                </button>
              )}
              <button
                onClick={() => handleSetVault(account.id)}
                className="text-xs px-2 py-1 rounded"
                style={{ border: '1px solid var(--border)', color: 'var(--ink-secondary)' }}
              >
                {account.vaultPath ? 'Change folder…' : 'Select folder…'}
              </button>
            </div>
          </div>
        </div>
      ))}

      {anyConnected && (
        <div className="flex items-center gap-3">
          <button
            onClick={handleSyncAll}
            disabled={syncing}
            className="px-3 py-2 text-sm rounded font-bold text-white"
            style={{ backgroundColor: 'var(--accent)', opacity: syncing ? 0.6 : 1 }}
          >
            {syncing ? 'Syncing…' : 'Sync all to vault now'}
          </button>
          {status && (
            <span className="text-xs" style={{ color: 'var(--ink-tertiary)' }}>
              {status}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

function SettingRow({
  label,
  description,
  children
}: {
  label: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="text-sm font-bold" style={{ color: 'var(--ink)' }}>{label}</div>
        <div className="text-xs" style={{ color: 'var(--ink-tertiary)' }}>{description}</div>
      </div>
      <div>{children}</div>
    </div>
  )
}

function AccountsTab({ onClose }: { onClose: () => void }) {
  const accounts = useAccountsStore((s) => s.accounts)
  const removeAccount = useAccountsStore((s) => s.removeAccount)
  const loadAccounts = useAccountsStore((s) => s.loadAccounts)
  const [showAddForm, setShowAddForm] = useState(accounts.length === 0)
  const [showAppleMailImport, setShowAppleMailImport] = useState(false)
  const [syncing, setSyncing] = useState(false)

  if (showAddForm) {
    return (
      <AccountSetup
        onSuccess={() => setShowAddForm(false)}
        onCancel={accounts.length > 0 ? () => setShowAddForm(false) : undefined}
      />
    )
  }

  const handleSetVault = async (accountId: string) => {
    const path = await window.api.pickVaultFolder()
    if (path) {
      await window.api.updateAccount(accountId, { vaultPath: path })
      await loadAccounts()
    }
  }

  const handleClearVault = async (accountId: string) => {
    await window.api.updateAccount(accountId, { vaultPath: null })
    await loadAccounts()
  }

  const handleSyncVault = async () => {
    setSyncing(true)
    await window.api.syncVault()
    setSyncing(false)
  }

  return (
    <div className="space-y-3">
      {accounts.map((account: any) => (
        <div
          key={account.id}
          className="px-3 py-2 rounded"
          style={{ backgroundColor: 'var(--paper-raised)', border: '1px solid var(--border)' }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className="w-[10px] h-[10px] rounded-full"
                style={{ backgroundColor: account.color }}
              />
              <div>
                <div className="flex items-center gap-2">
                  <div className="text-sm font-bold" style={{ color: 'var(--ink)' }}>
                    {account.displayName || account.email}
                  </div>
                  {!account.enabled && (
                    <span
                      className="font-mono px-1.5 py-0.5 rounded"
                      style={{
                        fontSize: 10,
                        color: '#c0392b',
                        backgroundColor: '#fdecea',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}
                    >
                      Needs password
                    </span>
                  )}
                </div>
                <div className="text-xs" style={{ color: 'var(--ink-tertiary)' }}>
                  {account.email}
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                if (confirm(`Remove ${account.email}?`)) {
                  removeAccount(account.id)
                }
              }}
              className="text-xs px-2 py-1 rounded"
              style={{ color: 'var(--danger)' }}
            >
              Remove
            </button>
          </div>

          {!account.enabled && (
            <SetPasswordInline
              accountId={account.id}
              onSuccess={loadAccounts}
            />
          )}

          {/* Vault connection */}
          <div className="mt-2 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-bold" style={{ color: 'var(--ink-secondary)' }}>
                  Vault
                </div>
                <div className="text-2xs" style={{ color: 'var(--ink-tertiary)' }}>
                  {account.vaultPath
                    ? account.vaultPath.split('/').slice(-2).join('/')
                    : 'Not connected'}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {account.vaultPath && (
                  <button
                    onClick={() => handleClearVault(account.id)}
                    className="text-2xs px-1.5 py-0.5 rounded"
                    style={{ color: 'var(--ink-tertiary)' }}
                  >
                    Disconnect
                  </button>
                )}
                <button
                  onClick={() => handleSetVault(account.id)}
                  className="text-xs px-2 py-0.5 rounded"
                  style={{ border: '1px solid var(--border)', color: 'var(--ink-secondary)' }}
                >
                  {account.vaultPath ? 'Change' : 'Connect Vault'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}

      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowAddForm(true)}
          className="px-4 py-2 text-sm rounded font-bold text-white"
          style={{ backgroundColor: 'var(--accent)' }}
        >
          + Add Account
        </button>
        <button
          onClick={() => setShowAppleMailImport(true)}
          className="px-3 py-2 text-xs rounded"
          style={{ border: '1px solid var(--border)', color: 'var(--ink-secondary)' }}
          title="Read accounts from Apple Mail's config and add them here"
        >
          Import from Apple Mail…
        </button>
        {accounts.some((a: any) => a.vaultPath) && (
          <button
            onClick={handleSyncVault}
            disabled={syncing}
            className="px-3 py-2 text-xs rounded"
            style={{ border: '1px solid var(--border)', color: 'var(--ink-secondary)' }}
          >
            {syncing ? 'Syncing...' : 'Sync All to Vault'}
          </button>
        )}
      </div>

      {showAppleMailImport && (
        <AppleMailImportModal
          onClose={() => setShowAppleMailImport(false)}
          onImported={() => loadAccounts()}
        />
      )}
    </div>
  )
}

function SetPasswordInline({ accountId, onSuccess }: { accountId: string; onSuccess: () => void }) {
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    if (!password) return
    setBusy(true)
    setError(null)
    const res = await (window.api as any).setAccountPassword(accountId, password)
    setBusy(false)
    if (res?.success) {
      setPassword('')
      onSuccess()
    } else {
      setError(res?.error || 'Failed to set password')
    }
  }

  return (
    <div className="mt-2 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
      <div className="flex items-center gap-2">
        <input
          type="password"
          value={password}
          disabled={busy}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit()
          }}
          placeholder="Password or app password"
          className="flex-1 bg-transparent text-sm rounded px-2 py-1 outline-none"
          style={{ border: '1px solid var(--border)', color: 'var(--ink)' }}
        />
        <button
          onClick={submit}
          disabled={busy || !password}
          className="text-xs px-3 py-1 rounded font-bold text-white"
          style={{
            backgroundColor: 'var(--accent)',
            opacity: (busy || !password) ? 0.55 : 1
          }}
        >
          {busy ? 'Testing…' : 'Enable'}
        </button>
      </div>
      {error && (
        <div className="text-2xs mt-1" style={{ color: '#c0392b' }}>{error}</div>
      )}
    </div>
  )
}

function AboutSection() {
  const [info, setInfo] = useState<any>(null)
  const [usage, setUsage] = useState<any[]>([])

  useEffect(() => {
    ;(window.api as any).getAppInfo().then(setInfo)
    ;(window.api as any).getUsageSummary().then((rows: any[]) => setUsage(rows || []))
  }, [])

  return (
    <div className="pt-4 mt-2" style={{ borderTop: '1px solid var(--border)' }}>
      <div className="text-xs font-bold mb-1" style={{ color: 'var(--ink-secondary)' }}>About</div>
      {info && (
        <div className="text-xs space-y-0.5" style={{ color: 'var(--ink-tertiary)' }}>
          <div>
            <span style={{ color: 'var(--ink)', fontWeight: 600 }}>mail_</span> v{info.version}
            {' · '}{info.platform}/{info.arch}
          </div>
          <div className="font-mono" style={{ fontSize: 'var(--font-size-2xs)' }}>
            Electron {info.electron} · Chromium {info.chrome} · Node {info.node}
          </div>
        </div>
      )}
      {usage.length > 0 && (
        <div className="mt-2">
          <div className="text-2xs font-mono uppercase mb-1" style={{ color: 'var(--ink-tertiary)' }}>
            Most-used actions (on-device)
          </div>
          <div className="space-y-0.5">
            {usage.slice(0, 6).map((u) => (
              <div key={u.action} className="flex items-center justify-between text-xs" style={{ color: 'var(--ink-secondary)' }}>
                <span className="font-mono">{u.action}</span>
                <span style={{ color: 'var(--ink-tertiary)' }}>{u.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className="w-[40px] h-[22px] rounded-full relative transition-colors"
      style={{ backgroundColor: value ? 'var(--accent)' : 'var(--ink-faint)' }}
    >
      <div
        className="absolute top-[2px] w-[18px] h-[18px] rounded-full bg-white shadow-sm transition-transform"
        style={{ left: value ? '20px' : '2px' }}
      />
    </button>
  )
}
