import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

interface DiscoveredAccount {
  source: string
  email: string
  displayName: string
  imapHost: string
  imapPort: number
  imapUsername: string
  smtpHost: string
  smtpPort: number
  smtpUsername: string
  tls: boolean
}

interface Props {
  onClose: () => void
  onImported: () => void
}

type RowState = 'idle' | 'testing' | 'success' | 'error'

interface Row {
  account: DiscoveredAccount
  password: string
  state: RowState
  error?: string
  selected: boolean
}

export function AppleMailImportModal({ onClose, onImported }: Props) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [errorCode, setErrorCode] = useState<string | null>(null)
  const [alreadyImported, setAlreadyImported] = useState(0)
  const [rows, setRows] = useState<Row[]>([])
  const [importing, setImporting] = useState(false)
  const [needsHostInfo, setNeedsHostInfo] = useState(false)

  useEffect(() => {
    ;(window.api as any).discoverAppleMailAccounts().then((res: any) => {
      setLoading(false)
      if (!res.success) {
        setError(res.message || res.error || 'Could not read Apple Mail accounts')
        setErrorCode(res.error || null)
        return
      }
      setAlreadyImported(res.alreadyImported || 0)
      setNeedsHostInfo(!!res.needsHostInfo)
      setRows(
        (res.accounts as DiscoveredAccount[]).map((a) => ({
          account: a,
          password: '',
          state: 'idle',
          selected: true
        }))
      )
    })
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const updateRow = (i: number, patch: Partial<Row>) => {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  }
  const updateAccount = (i: number, patch: Partial<DiscoveredAccount>) => {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, account: { ...r.account, ...patch } } : r)))
  }

  const importAll = async () => {
    setImporting(true)
    const next: Row[] = [...rows]
    for (let i = 0; i < next.length; i++) {
      const r = next[i]
      if (!r.selected) continue
      if (!r.password) {
        next[i] = { ...r, state: 'error', error: 'Password required' }
        continue
      }
      if (!r.account.imapHost) {
        next[i] = { ...r, state: 'error', error: 'IMAP host required' }
        continue
      }
      next[i] = { ...r, state: 'testing', error: undefined }
      setRows([...next])

      const config = {
        email: r.account.email,
        displayName: r.account.displayName,
        password: r.password,
        imapHost: r.account.imapHost,
        imapPort: r.account.imapPort,
        smtpHost: r.account.smtpHost || r.account.imapHost.replace(/^imap/, 'smtp'),
        smtpPort: r.account.smtpPort,
        authType: 'password',
        tls: r.account.tls ? 1 : 0
      }
      try {
        const test = await (window.api as any).testAccount(config)
        if (!test.success) {
          next[i] = { ...next[i], state: 'error', error: test.error || 'Connection failed' }
          setRows([...next])
          continue
        }
        const add = await (window.api as any).addAccount(config)
        if (!add?.id) {
          next[i] = { ...next[i], state: 'error', error: 'Failed to add account' }
          setRows([...next])
          continue
        }
        next[i] = { ...next[i], state: 'success' }
        setRows([...next])
      } catch (err) {
        next[i] = { ...next[i], state: 'error', error: (err as Error).message }
        setRows([...next])
      }
    }
    setImporting(false)
    onImported()
  }

  const openFullDiskAccess = () => {
    ;(window.api as any).openSystemPane('full_disk')
  }

  const modal = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
      style={{ animation: 'fadeIn 160ms ease-out' }}
    >
      <div className="absolute inset-0" style={{ backgroundColor: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(2px)' }} />

      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-[640px] max-h-[80vh] rounded-lg overflow-hidden flex flex-col"
        style={{
          backgroundColor: 'var(--paper-overlay)',
          border: '1px solid var(--border)',
          boxShadow: '0 24px 60px rgba(0,0,0,0.25)',
          animation: 'modalIn 200ms cubic-bezier(0.2, 0.9, 0.3, 1.2)'
        }}
      >
        <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="text-sm font-bold" style={{ color: 'var(--ink)' }}>
            Import accounts from Apple Mail
          </div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--ink-tertiary)' }}>
            mail_ can read your Apple Mail account list, but passwords live in macOS Keychain and need to be re-entered.
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading && <div className="text-sm" style={{ color: 'var(--ink-tertiary)' }}>Reading Apple Mail config…</div>}

          {error && errorCode === 'needs-full-disk-access' && (
            <div
              className="px-3 py-3 text-sm rounded"
              style={{ backgroundColor: 'var(--paper-raised)', border: '1px solid var(--border)' }}
            >
              <div className="font-bold mb-1" style={{ color: 'var(--ink)' }}>Full Disk Access required</div>
              <div className="text-xs" style={{ color: 'var(--ink-tertiary)' }}>
                Apple Mail keeps its account list in <code>~/Library/Mail/</code>, which macOS protects. Grant <b>mail_</b> Full Disk Access, relaunch, and try again.
              </div>
              <button
                onClick={openFullDiskAccess}
                className="mt-3 text-sm px-3 py-1.5 rounded font-bold text-white"
                style={{ backgroundColor: 'var(--accent)' }}
              >
                Open System Settings →
              </button>
            </div>
          )}

          {error && errorCode !== 'needs-full-disk-access' && (
            <div
              className="px-3 py-2 text-sm rounded"
              style={{ color: '#c0392b', backgroundColor: 'var(--paper-raised)', border: '1px solid var(--border)' }}
            >
              {error}
            </div>
          )}

          {!loading && !error && rows.length === 0 && (
            <div className="text-sm" style={{ color: 'var(--ink-tertiary)' }}>
              {alreadyImported > 0
                ? `All ${alreadyImported} Apple Mail accounts are already in mail_.`
                : 'No Apple Mail accounts found.'}
            </div>
          )}

          {rows.length > 0 && (
            <>
              {alreadyImported > 0 && (
                <div className="text-xs mb-3" style={{ color: 'var(--ink-tertiary)' }}>
                  Skipping {alreadyImported} account{alreadyImported === 1 ? '' : 's'} already in mail_.
                </div>
              )}
              {needsHostInfo && (
                <div className="text-xs mb-3" style={{ color: 'var(--ink-tertiary)' }}>
                  IMAP server addresses aren't stored in the macOS accounts DB — please fill them in below.
                </div>
              )}

              <div className="space-y-2">
                {rows.map((r, i) => (
                  <AccountRow
                    key={r.account.email + i}
                    row={r}
                    onPasswordChange={(p) => updateRow(i, { password: p })}
                    onHostChange={(h) => updateAccount(i, { imapHost: h, smtpHost: h.replace(/^imap/, 'smtp') })}
                    onToggle={() => updateRow(i, { selected: !r.selected })}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        <div className="px-6 py-3 flex items-center justify-end gap-2" style={{ borderTop: '1px solid var(--border)' }}>
          <button onClick={onClose} className="text-sm px-3 py-1.5 rounded" style={{ color: 'var(--ink-secondary)' }}>
            Close
          </button>
          {rows.length > 0 && (
            <button
              onClick={importAll}
              disabled={importing || !rows.some((r) => r.selected && r.password && r.account.imapHost)}
              className="text-sm px-4 py-1.5 rounded font-bold text-white"
              style={{
                backgroundColor: 'var(--accent)',
                opacity: (importing || !rows.some((r) => r.selected && r.password && r.account.imapHost)) ? 0.55 : 1
              }}
            >
              {importing ? 'Importing…' : `Import ${rows.filter((r) => r.selected).length} account${rows.filter((r) => r.selected).length === 1 ? '' : 's'}`}
            </button>
          )}
        </div>

        <style>{`
          @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
          @keyframes modalIn {
            from { opacity: 0; transform: translateY(8px) scale(0.97) }
            to   { opacity: 1; transform: translateY(0) scale(1) }
          }
        `}</style>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}

function AccountRow({
  row,
  onPasswordChange,
  onHostChange,
  onToggle
}: {
  row: Row
  onPasswordChange: (p: string) => void
  onHostChange: (h: string) => void
  onToggle: () => void
}) {
  const { account, password, state, error, selected } = row

  return (
    <div
      className="px-3 py-2 rounded"
      style={{
        backgroundColor: 'var(--paper-raised)',
        border: '1px solid var(--border)',
        opacity: state === 'success' ? 0.6 : 1
      }}
    >
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={selected}
          disabled={state === 'success'}
          onChange={onToggle}
          className="flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold truncate" style={{ color: 'var(--ink)' }}>
            {account.displayName}
          </div>
          <div className="text-xs truncate" style={{ color: 'var(--ink-tertiary)' }}>
            {account.email}
            {account.imapHost && ` · ${account.imapHost}:${account.imapPort}`}
          </div>
        </div>
        <StateChip state={state} />
      </div>
      {selected && state !== 'success' && (
        <div className="mt-2 space-y-1.5">
          {!account.imapHost && (
            <input
              type="text"
              defaultValue={account.imapHost}
              placeholder="IMAP host (e.g. imap.gmail.com)"
              onChange={(e) => onHostChange(e.target.value)}
              className="w-full bg-transparent text-sm rounded px-2 py-1 outline-none"
              style={{ border: '1px solid var(--border)', color: 'var(--ink)' }}
            />
          )}
          <input
            type="password"
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            placeholder="Password (or app password)"
            className="w-full bg-transparent text-sm rounded px-2 py-1 outline-none"
            style={{ border: '1px solid var(--border)', color: 'var(--ink)' }}
          />
          {error && (
            <div className="text-2xs" style={{ color: '#c0392b' }}>{error}</div>
          )}
        </div>
      )}
    </div>
  )
}

function StateChip({ state }: { state: RowState }) {
  if (state === 'idle') return null
  const colors = {
    testing: { bg: 'var(--paper-overlay)', text: 'var(--ink-tertiary)', label: 'Testing…' },
    success: { bg: 'var(--accent-subtle)', text: 'var(--accent)', label: 'Added' },
    error:   { bg: '#fdecea', text: '#c0392b', label: 'Failed' }
  }[state]
  return (
    <span
      className="font-mono flex-shrink-0 px-1.5 py-0.5 rounded"
      style={{ fontSize: 10, backgroundColor: colors.bg, color: colors.text, textTransform: 'uppercase' }}
    >
      {colors.label}
    </span>
  )
}
