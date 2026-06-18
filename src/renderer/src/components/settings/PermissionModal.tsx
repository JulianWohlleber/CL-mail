import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

export interface PermissionInfo {
  /** Short display title, e.g. "macOS Contacts" */
  title: string
  /** Carbon-icon-style glyph (single character) for the hero. Falls back to "" */
  icon?: React.ReactNode
  /** Plain-English why-do-you-need-this. */
  description: string
  /** Optional secondary line, e.g. caveat or current behaviour when off. */
  caveat?: string
  /** Whether the in-app feature is currently enabled. */
  enabled: boolean
  /** Setter for the in-app feature toggle. */
  onToggle: (next: boolean) => void
  /** macOS System Settings pane key (passed to openSystemPane). */
  systemPane: string
  /** Friendly path shown on the CTA button, e.g. "Privacy → Contacts". */
  systemPaneLabel: string
}

interface Props {
  permission: PermissionInfo
  onClose: () => void
}

export function PermissionModal({ permission, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const openPane = () => {
    ;(window.api as any).openSystemPane(permission.systemPane)
  }

  const modal = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
      style={{
        animation: 'fadeIn 160ms ease-out'
      }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ backgroundColor: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(2px)' }}
      />

      {/* Panel */}
      <div
        ref={ref}
        onClick={(e) => e.stopPropagation()}
        className="relative w-[440px] rounded-lg overflow-hidden flex flex-col"
        style={{
          backgroundColor: 'var(--paper-overlay)',
          border: '1px solid var(--border)',
          boxShadow: '0 24px 60px rgba(0,0,0,0.25)',
          animation: 'modalIn 200ms cubic-bezier(0.2, 0.9, 0.3, 1.2)'
        }}
      >
        {/* Hero block */}
        <div
          className="px-8 pt-8 pb-5 text-center"
          style={{
            borderBottom: '1px solid var(--border)',
            backgroundColor: 'var(--paper-sunken)'
          }}
        >
          <div
            className="mx-auto mb-3 flex items-center justify-center"
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              backgroundColor: 'var(--paper-overlay)',
              border: '1px solid var(--border)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.5)',
              fontSize: 24,
              color: 'var(--ink-secondary)'
            }}
          >
            {permission.icon || '◌'}
          </div>
          <div className="text-base font-bold mb-1" style={{ color: 'var(--ink)' }}>
            {permission.title}
          </div>
          <StatusBadge enabled={permission.enabled} />
        </div>

        {/* Body */}
        <div className="px-8 py-5">
          <p className="text-sm leading-relaxed" style={{ color: 'var(--ink-secondary)' }}>
            {permission.description}
          </p>
          {permission.caveat && (
            <p className="text-xs mt-2 leading-relaxed" style={{ color: 'var(--ink-tertiary)' }}>
              {permission.caveat}
            </p>
          )}

          {/* Step list */}
          <ol
            className="text-xs mt-5 space-y-2"
            style={{ color: 'var(--ink-secondary)', listStyle: 'none', padding: 0 }}
          >
            <Step
              n={1}
              done={false}
              label={<>Open <b>System Settings → {permission.systemPaneLabel}</b></>}
            />
            <Step
              n={2}
              done={false}
              label={<>Toggle the entry for <b>mail_</b> on</>}
            />
            <Step
              n={3}
              done={permission.enabled}
              label={<>Come back and enable this feature in the app</>}
            />
          </ol>
        </div>

        {/* Action bar */}
        <div
          className="px-8 py-4 flex items-center gap-3"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <button
            onClick={openPane}
            className="flex-1 px-4 py-2.5 rounded font-bold text-white text-sm"
            style={{
              backgroundColor: 'var(--accent)',
              transition: 'transform 80ms ease-out, opacity 80ms ease-out'
            }}
            onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.98)')}
            onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            Open System Settings →
          </button>

          <label
            className="flex items-center gap-2 select-none cursor-pointer"
            title={permission.enabled ? 'Disable in-app' : 'Enable in-app'}
          >
            <span className="text-xs" style={{ color: 'var(--ink-tertiary)' }}>
              In-app
            </span>
            <MiniToggle value={permission.enabled} onChange={permission.onToggle} />
          </label>
        </div>

        {/* Subtle close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-7 h-7 rounded flex items-center justify-center"
          style={{ color: 'var(--ink-tertiary)', fontSize: 14 }}
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      {/* Inline keyframes — keeps the modal a single self-contained file */}
      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes modalIn {
          from { opacity: 0; transform: translateY(8px) scale(0.97) }
          to   { opacity: 1; transform: translateY(0) scale(1) }
        }
      `}</style>
    </div>
  )

  return createPortal(modal, document.body)
}

function Step({ n, done, label }: { n: number; done: boolean; label: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <span
        className="flex-shrink-0 flex items-center justify-center font-mono"
        style={{
          width: 18,
          height: 18,
          borderRadius: 4,
          fontSize: 10,
          backgroundColor: done ? 'var(--accent)' : 'var(--paper-raised)',
          color: done ? '#fff' : 'var(--ink-tertiary)',
          border: done ? '1px solid var(--accent)' : '1px solid var(--border)'
        }}
      >
        {done ? '✓' : n}
      </span>
      <span className="pt-[1px]">{label}</span>
    </li>
  )
}

function StatusBadge({ enabled }: { enabled: boolean }) {
  return (
    <div
      className="inline-flex items-center gap-1.5 font-mono"
      style={{
        fontSize: 11,
        color: enabled ? 'var(--accent)' : 'var(--ink-tertiary)',
        textTransform: 'uppercase',
        letterSpacing: '0.06em'
      }}
    >
      <span
        className="w-[6px] h-[6px] rounded-full"
        style={{ backgroundColor: enabled ? 'var(--accent)' : 'var(--ink-faint)' }}
      />
      {enabled ? 'enabled in-app' : 'disabled'}
    </div>
  )
}

function MiniToggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className="relative rounded-full transition-colors"
      style={{
        width: 32,
        height: 18,
        backgroundColor: value ? 'var(--accent)' : 'var(--ink-faint)'
      }}
    >
      <span
        className="absolute top-[2px] bg-white rounded-full shadow-sm transition-all"
        style={{
          width: 14,
          height: 14,
          left: value ? 16 : 2
        }}
      />
    </button>
  )
}
