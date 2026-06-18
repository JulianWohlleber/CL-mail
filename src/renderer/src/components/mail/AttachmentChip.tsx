import { useState } from 'react'
import type { Attachment } from '@shared/types/mail'

interface Props {
  attachment: Attachment
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileIcon(contentType: string, filename: string): string {
  if (contentType.startsWith('image/')) return '🖼'
  if (contentType === 'application/pdf') return '📄'
  if (contentType.includes('spreadsheet') || filename.match(/\.xlsx?$/i)) return '📊'
  if (contentType.includes('presentation') || filename.match(/\.pptx?$/i)) return '📊'
  if (contentType.includes('document') || filename.match(/\.docx?$/i)) return '📝'
  if (contentType.includes('zip') || contentType.includes('compressed')) return '📦'
  return '📎'
}

export function AttachmentChip({ attachment }: Props) {
  const [showMenu, setShowMenu] = useState(false)
  const icon = getFileIcon(attachment.contentType, attachment.filename)

  const handleOpen = async () => {
    setShowMenu(false)
    await window.api.openAttachment(attachment.id)
  }

  const handleSave = async () => {
    setShowMenu(false)
    await window.api.saveAttachment(attachment.id)
  }

  return (
    <div className="relative">
      <div
        onClick={handleOpen}
        onContextMenu={(e) => { e.preventDefault(); setShowMenu(!showMenu) }}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs cursor-pointer transition-colors"
        style={{
          backgroundColor: 'var(--paper-raised)',
          border: '1px solid var(--border)',
          color: 'var(--ink-secondary)'
        }}
        title={`${attachment.filename} — Click to open, right-click for more`}
      >
        <span>{icon}</span>
        <span className="truncate max-w-[180px]">{attachment.filename}</span>
        <span className="font-mono" style={{ color: 'var(--ink-tertiary)', fontSize: '11px' }}>
          {formatSize(attachment.size)}
        </span>
      </div>

      {showMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
          <div
            className="absolute bottom-full left-0 mb-1 z-50 rounded-md shadow-lg py-1 min-w-[140px]"
            style={{
              backgroundColor: 'var(--paper-overlay)',
              border: '1px solid var(--border)'
            }}
          >
            <button
              onClick={handleOpen}
              className="w-full text-left px-3 py-1.5 text-sm transition-colors"
              style={{ color: 'var(--ink)' }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--paper-raised)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              Open
            </button>
            <button
              onClick={handleSave}
              className="w-full text-left px-3 py-1.5 text-sm transition-colors"
              style={{ color: 'var(--ink)' }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--paper-raised)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              Save As...
            </button>
          </div>
        </>
      )}
    </div>
  )
}
