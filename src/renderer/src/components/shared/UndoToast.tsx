import { useEffect, useRef } from 'react'
import { useUIStore } from '../../stores/ui.store'

export function UndoToast() {
  const undoToast = useUIStore((s) => s.undoToast)
  const hideUndoToast = useUIStore((s) => s.hideUndoToast)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    if (!undoToast) return

    timerRef.current = setTimeout(() => {
      hideUndoToast()
    }, 5000)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [undoToast, hideUndoToast])

  if (!undoToast) return null

  const handleUndo = async () => {
    await window.api.cancelSend(undoToast.undoId)
    hideUndoToast()
  }

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div
        className="flex items-center gap-3 px-4 py-2 rounded-lg shadow-elevated"
        style={{
          backgroundColor: 'var(--paper-overlay)',
          border: '1px solid var(--border)'
        }}
      >
        <span className="text-sm" style={{ color: 'var(--ink)' }}>
          {undoToast.message}
        </span>
        <button
          onClick={handleUndo}
          className="text-sm font-bold"
          style={{ color: 'var(--accent)' }}
        >
          Undo
        </button>
      </div>
    </div>
  )
}
