import { useState } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  onClose: () => void
  onAdded: () => void
}

type Provider = 'icloud' | 'nextcloud' | 'caldav' | 'google'

interface Preset {
  id: Provider
  title: string
  blurb: string
  icon: string
  needsServer: boolean
  serverHint?: string
  userHint: string
  passwordHint: string
}

const PRESETS: Preset[] = [
  {
    id: 'icloud',
    title: 'iCloud Calendar',
    blurb: 'Your iCloud calendars via CalDAV. Requires an app-specific password from appleid.apple.com.',
    icon: '',
    needsServer: false,
    userHint: 'Your Apple ID, e.g. you@icloud.com',
    passwordHint: 'App-specific password (NOT your Apple ID password)'
  },
  {
    id: 'nextcloud',
    title: 'Nextcloud',
    blurb: 'Any Nextcloud server with the Calendar app enabled.',
    icon: '☁',
    needsServer: true,
    serverHint: 'e.g. https://cloud.example.com',
    userHint: 'Nextcloud username',
    passwordHint: 'Nextcloud password or app token'
  },
  {
    id: 'caldav',
    title: 'Generic CalDAV',
    blurb: 'Any RFC-4791 CalDAV server (FastMail, Posteo, Mailbox.org, …).',
    icon: '◷',
    needsServer: true,
    serverHint: 'Principal URL, e.g. https://caldav.fastmail.com/dav/principals/user/USER/',
    userHint: 'Username',
    passwordHint: 'Password or app token'
  },
  {
    id: 'google',
    title: 'Google Calendar',
    blurb: 'Requires Google Cloud OAuth credentials — see Settings → Calendar → Google for setup.',
    icon: 'G',
    needsServer: false,
    userHint: '',
    passwordHint: ''
  }
]

export function AddCalendarModal({ onClose, onAdded }: Props) {
  const [step, setStep] = useState<'pick' | 'configure'>('pick')
  const [preset, setPreset] = useState<Preset | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [serverUrl, setServerUrl] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string; calendars?: string[] } | null>(null)
  const [busy, setBusy] = useState(false)

  const choose = (p: Preset) => {
    setPreset(p)
    setTestResult(null)
    setStep('configure')
  }

  const tryConnect = async () => {
    if (!preset) return
    if (preset.id === 'google') {
      const res = await (window.api as any).connectGoogleCalendar()
      setTestResult({ ok: false, msg: res.message || res.error })
      return
    }
    setBusy(true)
    const res = await (window.api as any).testCalendarAccount({
      provider: preset.id,
      serverUrl: preset.needsServer ? serverUrl : undefined,
      username,
      password
    })
    setBusy(false)
    setTestResult({ ok: res.success, msg: res.error || `Found ${res.calendars?.length || 0} calendars`, calendars: res.calendars })
  }

  const save = async () => {
    if (!preset || !testResult?.ok) return
    setBusy(true)
    const res = await (window.api as any).addCalendarAccount({
      provider: preset.id,
      serverUrl: preset.needsServer ? serverUrl : undefined,
      username,
      password,
      displayName: displayName || username
    })
    setBusy(false)
    if (res.success) {
      onAdded()
      onClose()
    } else {
      setTestResult({ ok: false, msg: res.error })
    }
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
        className="relative w-[560px] max-h-[80vh] rounded-lg overflow-hidden flex flex-col"
        style={{
          backgroundColor: 'var(--paper-overlay)',
          border: '1px solid var(--border)',
          boxShadow: '0 24px 60px rgba(0,0,0,0.25)',
          animation: 'modalIn 200ms cubic-bezier(0.2, 0.9, 0.3, 1.2)'
        }}
      >
        <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="text-sm font-bold" style={{ color: 'var(--ink)' }}>
            Connect a calendar
          </div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--ink-tertiary)' }}>
            {step === 'pick' ? 'Pick a provider' : `${preset?.title} · ${preset?.blurb}`}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {step === 'pick' && (
            <div className="grid grid-cols-2 gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => choose(p)}
                  className="text-left px-3 py-2.5 rounded transition-colors"
                  style={{ border: '1px solid var(--border)', backgroundColor: 'var(--paper-raised)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--border-strong)')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
                >
                  <div className="flex items-baseline gap-2">
                    <span className="text-base font-bold" style={{ color: 'var(--ink)' }}>{p.icon || '◌'}</span>
                    <span className="text-sm font-bold" style={{ color: 'var(--ink)' }}>{p.title}</span>
                  </div>
                  <div className="text-xs mt-1" style={{ color: 'var(--ink-tertiary)' }}>{p.blurb}</div>
                </button>
              ))}
            </div>
          )}

          {step === 'configure' && preset && (
            <div className="space-y-3">
              {preset.id === 'google' && (
                <div
                  className="px-3 py-2.5 rounded text-xs"
                  style={{ backgroundColor: 'var(--paper-raised)', border: '1px solid var(--border)', color: 'var(--ink-secondary)' }}
                >
                  Google Calendar uses OAuth2 and needs your own Google Cloud OAuth client (mail_ ships without one to avoid leaking shared credentials). Create one at <code>console.cloud.google.com</code>, enable the Calendar API, and paste the credentials below — that section is still under construction.
                </div>
              )}
              {preset.needsServer && (
                <Field
                  label="Server URL"
                  value={serverUrl}
                  onChange={setServerUrl}
                  placeholder={preset.serverHint || ''}
                />
              )}
              <Field label="Username" value={username} onChange={setUsername} placeholder={preset.userHint} />
              <Field label="Password" value={password} onChange={setPassword} placeholder={preset.passwordHint} type="password" />
              <Field label="Display name (optional)" value={displayName} onChange={setDisplayName} placeholder={username} />

              <div className="pt-2 flex items-center gap-2">
                <button
                  onClick={tryConnect}
                  disabled={busy || preset.id === 'google'}
                  className="text-sm px-3 py-1.5 rounded"
                  style={{ border: '1px solid var(--border)', color: 'var(--ink)', opacity: busy ? 0.6 : 1 }}
                >
                  {busy ? 'Testing…' : 'Test connection'}
                </button>
                {testResult && (
                  <span className="text-xs" style={{ color: testResult.ok ? 'var(--accent)' : '#c0392b' }}>
                    {testResult.ok ? '✓ ' : '✗ '}{testResult.msg}
                  </span>
                )}
              </div>

              {testResult?.ok && testResult.calendars && (
                <div className="text-xs" style={{ color: 'var(--ink-tertiary)' }}>
                  Will sync: {testResult.calendars.join(', ')}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-6 py-3 flex items-center justify-between gap-2" style={{ borderTop: '1px solid var(--border)' }}>
          {step === 'configure' ? (
            <button onClick={() => setStep('pick')} className="text-xs" style={{ color: 'var(--ink-tertiary)' }}>← Back</button>
          ) : <div />}
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="text-sm px-3 py-1.5 rounded" style={{ color: 'var(--ink-secondary)' }}>
              Cancel
            </button>
            {step === 'configure' && (
              <button
                onClick={save}
                disabled={!testResult?.ok || busy}
                className="text-sm px-4 py-1.5 rounded font-bold text-white"
                style={{ backgroundColor: 'var(--accent)', opacity: (!testResult?.ok || busy) ? 0.5 : 1 }}
              >
                {busy ? 'Saving…' : 'Add account'}
              </button>
            )}
          </div>
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

function Field({ label, value, onChange, placeholder, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div>
      <label className="text-xs block mb-0.5" style={{ color: 'var(--ink-tertiary)' }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent text-sm rounded px-2 py-1 outline-none"
        style={{ border: '1px solid var(--border)', color: 'var(--ink)' }}
      />
    </div>
  )
}
