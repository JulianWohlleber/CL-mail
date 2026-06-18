import { useRef, useCallback } from 'react'
import { Sidebar } from './Sidebar'
import { MailList } from './MailList'
import { ReadingPane } from './ReadingPane'
import { useUIStore } from '../../stores/ui.store'
import { useMailStore } from '../../stores/mail.store'

export function ThreePaneLayout() {
  const sidebarVisible = useUIStore((s) => s.sidebarVisible)
  const sidebarWidth = useUIStore((s) => s.sidebarWidth)
  const listWidth = useUIStore((s) => s.listWidth)
  const focusMode = useUIStore((s) => s.focusMode)
  const setSidebarWidth = useUIStore((s) => s.setSidebarWidth)
  const setListWidth = useUIStore((s) => s.setListWidth)
  const selectedThreadId = useMailStore((s) => s.selectedThreadId)

  const containerRef = useRef<HTMLDivElement>(null)
  const dragging = useRef<'sidebar' | 'list' | null>(null)

  const onMouseDown = useCallback((handle: 'sidebar' | 'list') => {
    dragging.current = handle
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    const onMouseMove = (e: MouseEvent) => {
      if (!containerRef.current || !dragging.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left

      if (dragging.current === 'sidebar') {
        setSidebarWidth(Math.max(160, Math.min(360, x)))
      } else {
        const offset = sidebarVisible ? sidebarWidth : 0
        setListWidth(Math.max(280, Math.min(600, x - offset)))
      }
    }

    const onMouseUp = () => {
      dragging.current = null
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }, [sidebarVisible, sidebarWidth, setSidebarWidth, setListWidth])

  if (focusMode && selectedThreadId) {
    return (
      <div ref={containerRef} className="h-full">
        <ReadingPane />
      </div>
    )
  }

  return (
    <div ref={containerRef} className="h-full flex">
      {/* Sidebar */}
      {sidebarVisible && (
        <>
          <div style={{ width: sidebarWidth, minWidth: sidebarWidth }} className="h-full overflow-hidden">
            <Sidebar />
          </div>
          <div
            className="w-[1px] h-full cursor-col-resize hover:bg-accent flex-shrink-0 transition-colors"
            style={{ backgroundColor: 'var(--border)' }}
            onMouseDown={() => onMouseDown('sidebar')}
          />
        </>
      )}

      {/* Mail list */}
      {!focusMode && (
        <>
          <div style={{ width: listWidth, minWidth: listWidth }} className="h-full overflow-hidden">
            <MailList />
          </div>
          <div
            className="w-[1px] h-full cursor-col-resize hover:bg-accent flex-shrink-0 transition-colors"
            style={{ backgroundColor: 'var(--border)' }}
            onMouseDown={() => onMouseDown('list')}
          />
        </>
      )}

      {/* Reading pane */}
      <div className="flex-1 h-full overflow-hidden">
        <ReadingPane />
      </div>
    </div>
  )
}
