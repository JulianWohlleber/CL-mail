import { AccountSetup } from '../settings/AccountSetup'

interface Props {
  onComplete: () => void
}

export function WelcomeScreen({ onComplete }: Props) {
  return (
    <div className="h-full flex items-center justify-center" style={{ backgroundColor: 'var(--paper)' }}>
      <div className="w-[480px]">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--ink)' }}>
            Welcome to mail_space
          </h1>
          <p className="text-sm" style={{ color: 'var(--ink-tertiary)' }}>
            A keyboard-first mail client. Add your email account to get started.
          </p>
        </div>

        <div
          className="rounded-lg p-6 shadow-soft"
          style={{ backgroundColor: 'var(--paper-overlay)', border: '1px solid var(--border)' }}
        >
          <AccountSetup onSuccess={onComplete} />
        </div>

        <div className="text-center mt-4 text-2xs font-mono" style={{ color: 'var(--ink-faint)' }}>
          Your credentials are stored securely in macOS Keychain
        </div>
      </div>
    </div>
  )
}
