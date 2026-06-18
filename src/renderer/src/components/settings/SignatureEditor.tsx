import { useState, useRef, useEffect } from 'react'
import { useAccountsStore } from '../../stores/accounts.store'
import type { AppSettings } from '@shared/types/settings'

interface SignatureData {
  name: string
  title: string
  phone: string
  email: string
  website: string
  html: string
  isDefault: boolean
  defaultFor: string[] // account IDs
}

const EMPTY_SIGNATURE: SignatureData = {
  name: '',
  title: '',
  phone: '',
  email: '',
  website: '',
  html: '',
  isDefault: false,
  defaultFor: []
}

interface Props {
  settings: AppSettings
  updateSetting: (key: keyof AppSettings, value: any) => void
}

function buildSignatureHtml(sig: SignatureData): string {
  const lines: string[] = []
  if (sig.name) lines.push(`<strong>${sig.name}</strong>`)
  if (sig.title) lines.push(`<span style="color:#888">${sig.title}</span>`)
  const contactLines: string[] = []
  if (sig.email) contactLines.push(`E: <a href="mailto:${sig.email}">${sig.email}</a>`)
  if (sig.phone) contactLines.push(`P: ${sig.phone}`)
  if (sig.website) {
    const url = sig.website.startsWith('http') ? sig.website : `https://${sig.website}`
    contactLines.push(`W: <a href="${url}">${sig.website}</a>`)
  }
  if (contactLines.length > 0) lines.push(contactLines.join('<br/>'))
  if (sig.html) lines.push(sig.html)
  return lines.join('<br/>')
}

export function SignatureEditor({ settings, updateSetting }: Props) {
  const accounts = useAccountsStore((s) => s.accounts)
  const signatures: Record<string, SignatureData> = settings.signatures || {}
  const sigEntries = Object.entries(signatures)
  const [selectedId, setSelectedId] = useState<string | null>(sigEntries[0]?.[0] || null)

  const selected = selectedId ? signatures[selectedId] : null

  const save = (updated: Record<string, SignatureData>) => {
    updateSetting('signatures', updated)
  }

  const createSig = () => {
    const id = `sig_${Date.now()}`
    const updated = {
      ...signatures,
      [id]: { ...EMPTY_SIGNATURE, isDefault: sigEntries.length === 0, defaultFor: accounts.map(a => a.id) }
    }
    save(updated)
    setSelectedId(id)
  }

  const deleteSig = () => {
    if (!selectedId) return
    const { [selectedId]: _, ...rest } = signatures
    const entries = Object.entries(rest)
    if (entries.length > 0 && !entries.some(([, s]) => s.isDefault)) {
      rest[entries[0][0]] = { ...entries[0][1], isDefault: true }
    }
    save(rest)
    setSelectedId(entries[0]?.[0] || null)
  }

  const updateField = (field: keyof SignatureData, value: any) => {
    if (!selectedId || !selected) return
    const updated = { ...signatures }
    updated[selectedId] = { ...selected, [field]: value }
    if (field === 'isDefault' && value) {
      for (const key of Object.keys(updated)) {
        if (key !== selectedId) updated[key] = { ...updated[key], isDefault: false }
      }
    }
    save(updated)
  }

  const preview = selected ? buildSignatureHtml(selected) : ''

  return (
    <div className="flex gap-3" style={{ minHeight: '380px' }}>
      {/* Left: signature list */}
      <div className="flex flex-col w-[140px] flex-shrink-0">
        <div
          className="flex-1 rounded-t overflow-y-auto"
          style={{ border: '1px solid var(--border)', borderBottom: 'none', backgroundColor: 'var(--paper-sunken)' }}
        >
          {sigEntries.map(([id, sig]) => (
            <div
              key={id}
              onClick={() => setSelectedId(id)}
              className="px-2.5 py-2 text-sm"
              style={{
                backgroundColor: id === selectedId ? 'var(--paper-raised)' : 'transparent',
                color: id === selectedId ? 'var(--ink)' : 'var(--ink-secondary)',
                fontWeight: id === selectedId ? 600 : 400,
                borderBottom: '1px solid var(--border)',
                cursor: 'default'
              }}
            >
              <div className="truncate" style={{ fontSize: '13px' }}>{sig.name || 'Untitled'}</div>
            </div>
          ))}
          {sigEntries.length === 0 && (
            <div className="px-2.5 py-3 text-xs text-center" style={{ color: 'var(--ink-tertiary)' }}>
              No signatures
            </div>
          )}
        </div>
        <div
          className="flex rounded-b"
          style={{ border: '1px solid var(--border)', backgroundColor: 'var(--paper-sunken)' }}
        >
          <button
            onClick={createSig}
            className="flex-1 py-1.5 text-sm text-center"
            style={{ color: 'var(--ink-secondary)', borderRight: '1px solid var(--border)' }}
          >+</button>
          <button
            onClick={deleteSig}
            disabled={!selectedId}
            className="flex-1 py-1.5 text-sm text-center"
            style={{ color: selectedId ? 'var(--ink-secondary)' : 'var(--ink-faint)' }}
          >−</button>
        </div>
      </div>

      {/* Right: editor */}
      {selected && selectedId ? (
        <div className="flex-1 flex flex-col min-w-0 gap-3">
          {/* Top bar: name + default for */}
          <div className="flex items-center gap-3">
            <input
              value={selected.name || ''}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="Signature name"
              className="flex-1 bg-transparent outline-none text-sm px-2 py-1 rounded"
              style={{ border: '1px solid var(--border)', color: 'var(--ink)' }}
            />
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-xs" style={{ color: 'var(--ink-tertiary)' }}>Default for:</span>
              <select
                value={selected.defaultFor?.length === accounts.length ? 'all' : 'select'}
                onChange={(e) => {
                  if (e.target.value === 'all') {
                    updateField('defaultFor', accounts.map(a => a.id))
                    updateField('isDefault', true)
                  }
                }}
                className="bg-transparent text-xs rounded px-1.5 py-0.5"
                style={{ border: '1px solid var(--border)', color: 'var(--ink-secondary)' }}
              >
                <option value="all">{accounts.length} Account{accounts.length !== 1 ? 's' : ''}</option>
                {accounts.map(a => (
                  <option key={a.id} value={a.id}>{a.email}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Preview */}
          <div
            className="rounded p-3 text-sm"
            style={{
              border: '1px solid var(--border)',
              backgroundColor: 'var(--paper-sunken)',
              color: 'var(--ink)',
              minHeight: '80px'
            }}
          >
            {preview ? (
              <>
                <div className="text-xs mb-1" style={{ color: 'var(--ink-faint)' }}>Preview</div>
                <div dangerouslySetInnerHTML={{ __html: preview }} style={{ lineHeight: '1.5', fontSize: '13px' }} />
              </>
            ) : (
              <div className="text-xs" style={{ color: 'var(--ink-tertiary)' }}>Fill in the fields below to see a preview</div>
            )}
          </div>

          {/* Fields grid */}
          <div className="grid grid-cols-2 gap-x-3 gap-y-2">
            <SigField label="Name" value={selected.name} onChange={(v) => updateField('name', v)} />
            <SigField label="Title" value={selected.title} onChange={(v) => updateField('title', v)} />
            <SigField label="Phone" value={selected.phone} onChange={(v) => updateField('phone', v)} />
            <SigField label="Email Address" value={selected.email} onChange={(v) => updateField('email', v)} />
            <SigField label="Website" value={selected.website} onChange={(v) => updateField('website', v)} />
          </div>

          {/* Raw HTML (advanced) */}
          <div>
            <div className="text-xs mb-1" style={{ color: 'var(--ink-tertiary)' }}>Additional HTML (optional)</div>
            <textarea
              value={selected.html || ''}
              onChange={(e) => updateField('html', e.target.value)}
              className="w-full bg-transparent outline-none text-xs font-mono px-2 py-1.5 rounded resize-none"
              style={{ border: '1px solid var(--border)', color: 'var(--ink-secondary)', height: '48px' }}
              placeholder="<a href='...'>LinkedIn</a>"
            />
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-sm mb-2" style={{ color: 'var(--ink-tertiary)' }}>No signature selected</div>
            <button
              onClick={createSig}
              className="text-sm"
              style={{ color: 'var(--ink-secondary)' }}
            >
              Click + to create one
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function SigField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <div className="text-xs mb-0.5" style={{ color: 'var(--ink-tertiary)' }}>{label}</div>
      <input
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent outline-none text-sm px-2 py-1 rounded"
        style={{ border: '1px solid var(--border)', color: 'var(--ink)' }}
      />
    </div>
  )
}
