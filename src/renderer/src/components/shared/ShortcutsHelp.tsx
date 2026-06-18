import { useState, useEffect, useCallback } from 'react'
import { useUIStore } from '../../stores/ui.store'
import { superhumanKeymap } from '../../keymaps/superhuman.keymap'
import type { ActionName, KeyBinding } from '../../keymaps/keymap-types'

const ACTION_LABELS: Record<string, string> = {
  'navigate.down': 'Move down',
  'navigate.up': 'Move up',
  'navigate.open': 'Open conversation',
  'navigate.back': 'Back / Close',
  'navigate.inbox': 'Go to Inbox',
  'navigate.sent': 'Go to Sent',
  'navigate.drafts': 'Go to Drafts',
  'navigate.archive': 'Go to Archive',
  'navigate.starred': 'Go to Starred',
  'navigate.trash': 'Go to Trash',
  'thread.archive': 'Archive',
  'thread.trash': 'Move to Trash',
  'thread.star': 'Toggle Star',
  'thread.mark-read': 'Mark as Read',
  'thread.mark-unread': 'Mark as Unread',
  'thread.snooze': 'Snooze',
  'thread.spam': 'Mark as Spam',
  'thread.move': 'Move to…',
  'thread.label': 'Label…',
  'thread.select': 'Select',
  'thread.select-all': 'Select All',
  'compose.new': 'New message',
  'compose.reply': 'Reply',
  'compose.reply-all': 'Reply All',
  'compose.forward': 'Forward',
  'compose.send': 'Send',
  'compose.discard': 'Discard draft',
  'ui.command-palette': 'Command palette',
  'ui.search': 'Search',
  'ui.focus-mode': 'Focus mode',
  'ui.toggle-sidebar': 'Toggle sidebar',
  'ui.settings': 'Settings',
  'ui.shortcuts-help': 'Shortcuts help',
  'ui.theme-toggle': 'Toggle theme',
  'ui.undo': 'Undo',
  'ui.escape': 'Escape / Close'
}

const SHORTCUT_GROUPS: { title: string; actions: ActionName[] }[] = [
  {
    title: 'Navigation',
    actions: [
      'navigate.down', 'navigate.up', 'navigate.open', 'navigate.back',
      'navigate.inbox', 'navigate.sent', 'navigate.drafts', 'navigate.archive', 'navigate.trash'
    ]
  },
  {
    title: 'Actions',
    actions: [
      'thread.archive', 'thread.trash', 'thread.move', 'thread.star',
      'thread.mark-read', 'thread.mark-unread', 'thread.snooze'
    ]
  },
  {
    title: 'Compose',
    actions: ['compose.new', 'compose.reply', 'compose.reply-all', 'compose.forward', 'compose.send']
  },
  {
    title: 'View',
    actions: [
      'ui.command-palette', 'ui.search', 'ui.focus-mode',
      'ui.toggle-sidebar', 'ui.settings', 'ui.shortcuts-help', 'ui.theme-toggle'
    ]
  }
]

function formatKey(key: string): string {
  return key
    .replace('Cmd', '\u2318')
    .replace('Shift', '\u21E7')
    .replace('Alt', '\u2325')
    .replace('Ctrl', '\u2303')
    .replace('Enter', '\u21A9')
    .replace('Escape', 'Esc')
    .replace(' ', ' then ')
}

export function ShortcutsHelp() {
  const toggleShortcutsHelp = useUIStore((s) => s.toggleShortcutsHelp)
  const [customBindings, setCustomBindings] = useState<Record<string, string>>({})
  const [recording, setRecording] = useState<ActionName | null>(null)
  const [recordedKeys, setRecordedKeys] = useState<string[]>([])

  // Load custom bindings from settings
  useEffect(() => {
    window.api.getSettings().then((settings: any) => {
      if (settings.customKeybindings) {
        setCustomBindings(settings.customKeybindings)
      }
    })
  }, [])

  // Build a map of action -> key from default keymap + overrides
  const bindingMap = new Map<ActionName, string>()
  for (const binding of superhumanKeymap) {
    bindingMap.set(binding.action, binding.key)
  }
  for (const [action, key] of Object.entries(customBindings)) {
    bindingMap.set(action as ActionName, key)
  }

  const handleRecordKey = useCallback((e: KeyboardEvent) => {
    e.preventDefault()
    e.stopPropagation()

    // Ignore bare modifier keys
    if (['Meta', 'Shift', 'Control', 'Alt'].includes(e.key)) return

    const parts: string[] = []
    if (e.metaKey) parts.push('Cmd')
    if (e.ctrlKey) parts.push('Ctrl')
    if (e.altKey) parts.push('Alt')
    if (e.shiftKey && e.key.length > 1) parts.push('Shift')

    let key = e.key
    if (key === ' ') key = 'Space'
    if (e.shiftKey && key.length === 1) {
      parts.push(key)
    } else {
      parts.push(key)
    }

    const normalized = parts.join('+')
    setRecordedKeys([normalized])

    // Save the binding
    if (recording) {
      const newBindings = { ...customBindings, [recording]: normalized }
      setCustomBindings(newBindings)
      window.api.setSetting('customKeybindings', newBindings)
      setRecording(null)
      setRecordedKeys([])
    }
  }, [recording, customBindings])

  useEffect(() => {
    if (!recording) return
    document.addEventListener('keydown', handleRecordKey, true)
    return () => document.removeEventListener('keydown', handleRecordKey, true)
  }, [recording, handleRecordKey])

  const resetBinding = (action: ActionName) => {
    const newBindings = { ...customBindings }
    delete newBindings[action]
    setCustomBindings(newBindings)
    window.api.setSetting('customKeybindings', newBindings)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => { setRecording(null); toggleShortcutsHelp() }}>
      <div className="absolute inset-0" style={{ backgroundColor: 'rgba(0,0,0,0.3)' }} />
      <div
        className="relative w-[640px] max-h-[80vh] rounded-lg shadow-overlay overflow-y-auto p-6"
        style={{ backgroundColor: 'var(--paper-overlay)', border: '1px solid var(--border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold" style={{ color: 'var(--ink)' }}>
            Keyboard Shortcuts
          </h2>
          <div className="flex items-center gap-3">
            <span className="text-2xs" style={{ color: 'var(--ink-tertiary)' }}>
              Click a shortcut to rebind
            </span>
            <button onClick={toggleShortcutsHelp} className="text-sm" style={{ color: 'var(--ink-tertiary)' }}>✕</button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.title}>
              <h3 className="text-sm font-bold mb-2" style={{ color: 'var(--ink-secondary)' }}>
                {group.title}
              </h3>
              <div className="space-y-1">
                {group.actions.map((action) => {
                  const currentKey = bindingMap.get(action) || ''
                  const isRecording = recording === action
                  const isCustom = action in customBindings

                  return (
                    <div key={action} className="flex items-center justify-between group">
                      <span className="text-sm" style={{ color: 'var(--ink)' }}>
                        {ACTION_LABELS[action] || action}
                      </span>
                      <div className="flex items-center gap-1">
                        {isCustom && (
                          <button
                            onClick={() => resetBinding(action)}
                            className="text-2xs opacity-0 group-hover:opacity-100 transition-opacity px-1"
                            style={{ color: 'var(--ink-tertiary)' }}
                            title="Reset to default"
                          >
                            reset
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setRecording(isRecording ? null : action)
                            setRecordedKeys([])
                          }}
                          className="text-xs font-mono px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                          style={{
                            backgroundColor: isRecording ? 'var(--accent-subtle)' : 'var(--paper-raised)',
                            color: isRecording ? 'var(--accent)' : isCustom ? 'var(--accent)' : 'var(--ink-secondary)',
                            border: `1px solid ${isRecording ? 'var(--accent)' : 'var(--border)'}`,
                            minWidth: '32px',
                            textAlign: 'center'
                          }}
                        >
                          {isRecording ? 'Press a key…' : formatKey(currentKey)}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
