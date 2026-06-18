import { useEffect, useState } from 'react'

/**
 * One small dismissable card that appears the first time the user has
 * a thread open. Teaches the three highest-value shortcuts. Persists its
 * dismissal in the settings store so it never shows up again.
 *
 * Sprint #2 chose this over a multi-step Tutorial modal because users
 * tend to skip modals; an inline hint where they are already looking
 * tested better.
 */
export function FirstRunHint() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    ;(window.api as any).getSettings().then((s: any) => {
      if (!s?.firstRunHintDismissed) setShow(true)
    })
  }, [])

  const dismiss = () => {
    setShow(false)
    window.api.setSetting('firstRunHintDismissed', true)
  }

  if (!show) return null

  return (
    <div
      className="rounded mb-3 px-3 py-2 flex items-start gap-3"
      style={{
        backgroundColor: 'var(--accent-subtle)',
        border: '1px solid var(--border)',
        fontSize: 'var(--font-size-xs)'
      }}
      role="note"
    >
      <div className="flex-1" style={{ color: 'var(--ink-secondary)' }}>
        <span className="font-mono mr-1.5" style={{ color: 'var(--accent)' }}>tip</span>
        Press <Kbd>j</Kbd> / <Kbd>k</Kbd> to navigate, <Kbd>e</Kbd> to archive,
        <Kbd>?</Kbd> for all shortcuts.
      </div>
      <button
        onClick={dismiss}
        className="flex-shrink-0 text-2xs"
        style={{ color: 'var(--ink-tertiary)' }}
        aria-label="Dismiss hint"
      >
        Got it ✕
      </button>
    </div>
  )
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd
      className="font-mono mx-0.5 px-1 rounded"
      style={{
        fontSize: 'var(--font-size-2xs)',
        backgroundColor: 'var(--paper-overlay)',
        border: '1px solid var(--border)',
        color: 'var(--ink)'
      }}
    >
      {children}
    </kbd>
  )
}
