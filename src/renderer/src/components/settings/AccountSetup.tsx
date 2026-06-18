import { useState } from 'react'
import { useAccountsStore } from '../../stores/accounts.store'

// Well-known IMAP/SMTP settings for common providers
const PROVIDERS: Record<string, { imapHost: string; imapPort: number; smtpHost: string; smtpPort: number }> = {
  'gmail.com': { imapHost: 'imap.gmail.com', imapPort: 993, smtpHost: 'smtp.gmail.com', smtpPort: 587 },
  'googlemail.com': { imapHost: 'imap.gmail.com', imapPort: 993, smtpHost: 'smtp.gmail.com', smtpPort: 587 },
  'outlook.com': { imapHost: 'outlook.office365.com', imapPort: 993, smtpHost: 'smtp.office365.com', smtpPort: 587 },
  'hotmail.com': { imapHost: 'outlook.office365.com', imapPort: 993, smtpHost: 'smtp.office365.com', smtpPort: 587 },
  'live.com': { imapHost: 'outlook.office365.com', imapPort: 993, smtpHost: 'smtp.office365.com', smtpPort: 587 },
  'yahoo.com': { imapHost: 'imap.mail.yahoo.com', imapPort: 993, smtpHost: 'smtp.mail.yahoo.com', smtpPort: 587 },
  'icloud.com': { imapHost: 'imap.mail.me.com', imapPort: 993, smtpHost: 'smtp.mail.me.com', smtpPort: 587 },
  'me.com': { imapHost: 'imap.mail.me.com', imapPort: 993, smtpHost: 'smtp.mail.me.com', smtpPort: 587 },
  'mac.com': { imapHost: 'imap.mail.me.com', imapPort: 993, smtpHost: 'smtp.mail.me.com', smtpPort: 587 },
  'fastmail.com': { imapHost: 'imap.fastmail.com', imapPort: 993, smtpHost: 'smtp.fastmail.com', smtpPort: 587 },
  'protonmail.com': { imapHost: '127.0.0.1', imapPort: 1143, smtpHost: '127.0.0.1', smtpPort: 1025 },
  'zoho.com': { imapHost: 'imap.zoho.com', imapPort: 993, smtpHost: 'smtp.zoho.com', smtpPort: 587 },
}

interface Props {
  onSuccess?: () => void
  onCancel?: () => void
}

export function AccountSetup({ onSuccess, onCancel }: Props) {
  const addAccount = useAccountsStore((s) => s.addAccount)

  const [step, setStep] = useState<'credentials' | 'server' | 'testing' | 'done'>('credentials')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [imapHost, setImapHost] = useState('')
  const [imapPort, setImapPort] = useState(993)
  const [smtpHost, setSmtpHost] = useState('')
  const [smtpPort, setSmtpPort] = useState(587)
  const [tls, setTls] = useState(true)
  const [vaultPath, setVaultPath] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string } | null>(null)
  const [error, setError] = useState('')

  const autoDetect = (emailAddr: string) => {
    const domain = emailAddr.split('@')[1]?.toLowerCase()
    if (domain && PROVIDERS[domain]) {
      const p = PROVIDERS[domain]
      setImapHost(p.imapHost)
      setImapPort(p.imapPort)
      setSmtpHost(p.smtpHost)
      setSmtpPort(p.smtpPort)
      return true
    }
    return false
  }

  const handleEmailBlur = () => {
    if (email.includes('@')) {
      const detected = autoDetect(email)
      if (!detected) {
        setShowAdvanced(true)
      }
    }
  }

  const handleTestConnection = async () => {
    setTesting(true)
    setTestResult(null)
    setError('')

    // Auto-detect if not already set
    if (!imapHost && email.includes('@')) {
      const detected = autoDetect(email)
      if (!detected) {
        setTesting(false)
        setError('Could not auto-detect server settings. Please enter them manually.')
        setShowAdvanced(true)
        return
      }
    }

    try {
      const result = await window.api.testAccount({
        email,
        password,
        imapHost,
        imapPort,
        smtpHost,
        smtpPort,
        tls
      })
      setTestResult(result)
      if (result.success) {
        setStep('done')
      }
    } catch (err) {
      setTestResult({ success: false, error: (err as Error).message })
    } finally {
      setTesting(false)
    }
  }

  const handleAddAccount = async () => {
    const result = await addAccount({
      email,
      password,
      displayName: displayName || email,
      imapHost,
      imapPort,
      smtpHost,
      smtpPort,
      tls,
      authType: 'password',
      vaultPath: vaultPath || undefined
    })
    if (result) {
      // Trigger sync for the new account to fetch folders and messages
      try {
        await window.api.triggerSync(result.id)
      } catch (err) {
        console.error('Sync failed after account setup:', err)
      }
      onSuccess?.()
    }
  }

  return (
    <div className="space-y-4">
      {step === 'done' ? (
        <div className="text-center py-4">
          <div className="text-2xl mb-2" style={{ color: 'var(--success)' }}>✓</div>
          <div className="text-sm font-bold mb-1" style={{ color: 'var(--ink)' }}>
            Connection successful
          </div>
          <div className="text-xs mb-4" style={{ color: 'var(--ink-tertiary)' }}>
            {email} is ready to use
          </div>
          <button
            onClick={handleAddAccount}
            className="px-6 py-2 text-sm rounded font-bold text-white"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            Add Account
          </button>
        </div>
      ) : (
        <>
          {/* Email & Password */}
          <div>
            <label className="block text-xs font-bold mb-0.5" style={{ color: 'var(--ink-secondary)' }}>
              Email address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={handleEmailBlur}
              placeholder="you@example.com"
              className="w-full bg-transparent text-sm rounded px-3 py-2 outline-none"
              style={{ border: '1px solid var(--border)', color: 'var(--ink)' }}
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-bold mb-0.5" style={{ color: 'var(--ink-secondary)' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password or app-specific password"
              className="w-full bg-transparent text-sm rounded px-3 py-2 outline-none"
              style={{ border: '1px solid var(--border)', color: 'var(--ink)' }}
            />
            <div className="text-2xs mt-0.5" style={{ color: 'var(--ink-faint)' }}>
              For Gmail/iCloud, use an app-specific password
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold mb-0.5" style={{ color: 'var(--ink-secondary)' }}>
              Display name (optional)
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your Name"
              className="w-full bg-transparent text-sm rounded px-3 py-2 outline-none"
              style={{ border: '1px solid var(--border)', color: 'var(--ink)' }}
            />
          </div>

          {/* Vault connection */}
          <div>
            <label className="block text-xs font-bold mb-0.5" style={{ color: 'var(--ink-secondary)' }}>
              Vault folder (optional)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={vaultPath}
                readOnly
                placeholder="No vault connected"
                className="flex-1 bg-transparent text-sm rounded px-3 py-2 outline-none"
                style={{ border: '1px solid var(--border)', color: 'var(--ink)' }}
              />
              <button
                onClick={async () => {
                  const path = await window.api.pickVaultFolder()
                  if (path) setVaultPath(path)
                }}
                className="px-3 py-2 text-xs rounded"
                style={{ border: '1px solid var(--border)', color: 'var(--ink-secondary)' }}
              >
                Browse
              </button>
              {vaultPath && (
                <button
                  onClick={() => setVaultPath('')}
                  className="text-xs"
                  style={{ color: 'var(--ink-tertiary)' }}
                >
                  ✕
                </button>
              )}
            </div>
            <div className="text-2xs mt-0.5" style={{ color: 'var(--ink-faint)' }}>
              Emails will be saved as Markdown files in a "Mail" folder inside your vault
            </div>
          </div>

          {/* Advanced server settings */}
          <div>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-xs font-bold"
              style={{ color: 'var(--accent)' }}
            >
              {showAdvanced ? '▾ Hide' : '▸ Show'} server settings
            </button>
          </div>

          {showAdvanced && (
            <div className="space-y-3 pl-2" style={{ borderLeft: '2px solid var(--border)' }}>
              <div className="grid grid-cols-[1fr_80px] gap-2">
                <div>
                  <label className="block text-2xs font-mono mb-0.5" style={{ color: 'var(--ink-tertiary)' }}>IMAP Host</label>
                  <input
                    type="text"
                    value={imapHost}
                    onChange={(e) => setImapHost(e.target.value)}
                    placeholder="imap.example.com"
                    className="w-full bg-transparent text-sm rounded px-2 py-1 outline-none"
                    style={{ border: '1px solid var(--border)', color: 'var(--ink)' }}
                  />
                </div>
                <div>
                  <label className="block text-2xs font-mono mb-0.5" style={{ color: 'var(--ink-tertiary)' }}>Port</label>
                  <input
                    type="number"
                    value={imapPort}
                    onChange={(e) => setImapPort(Number(e.target.value))}
                    className="w-full bg-transparent text-sm rounded px-2 py-1 outline-none"
                    style={{ border: '1px solid var(--border)', color: 'var(--ink)' }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-[1fr_80px] gap-2">
                <div>
                  <label className="block text-2xs font-mono mb-0.5" style={{ color: 'var(--ink-tertiary)' }}>SMTP Host</label>
                  <input
                    type="text"
                    value={smtpHost}
                    onChange={(e) => setSmtpHost(e.target.value)}
                    placeholder="smtp.example.com"
                    className="w-full bg-transparent text-sm rounded px-2 py-1 outline-none"
                    style={{ border: '1px solid var(--border)', color: 'var(--ink)' }}
                  />
                </div>
                <div>
                  <label className="block text-2xs font-mono mb-0.5" style={{ color: 'var(--ink-tertiary)' }}>Port</label>
                  <input
                    type="number"
                    value={smtpPort}
                    onChange={(e) => setSmtpPort(Number(e.target.value))}
                    className="w-full bg-transparent text-sm rounded px-2 py-1 outline-none"
                    style={{ border: '1px solid var(--border)', color: 'var(--ink)' }}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="tls"
                  checked={tls}
                  onChange={(e) => setTls(e.target.checked)}
                  className="accent-[var(--accent)]"
                />
                <label htmlFor="tls" className="text-xs" style={{ color: 'var(--ink-secondary)' }}>
                  Use TLS/SSL
                </label>
              </div>
            </div>
          )}

          {/* Error display */}
          {error && (
            <div className="text-xs px-3 py-2 rounded" style={{ backgroundColor: 'rgba(220,38,38,0.1)', color: 'var(--danger)' }}>
              {error}
            </div>
          )}
          {testResult && !testResult.success && (
            <div className="text-xs px-3 py-2 rounded" style={{ backgroundColor: 'rgba(220,38,38,0.1)', color: 'var(--danger)' }}>
              Connection failed: {testResult.error || 'Unknown error'}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            {onCancel && (
              <button
                onClick={onCancel}
                className="text-sm"
                style={{ color: 'var(--ink-tertiary)' }}
              >
                Cancel
              </button>
            )}
            <div className="flex-1" />
            <button
              onClick={handleTestConnection}
              disabled={!email || !password || testing}
              className="px-4 py-2 text-sm rounded font-bold text-white transition-colors"
              style={{
                backgroundColor: (!email || !password || testing) ? 'var(--ink-faint)' : 'var(--accent)',
                cursor: (!email || !password || testing) ? 'not-allowed' : 'pointer'
              }}
            >
              {testing ? 'Testing…' : 'Test & Connect'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
