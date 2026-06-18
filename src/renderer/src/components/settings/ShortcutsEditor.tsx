import { useState, useEffect, useCallback } from 'react'
import { superhumanKeymap } from '../../keymaps/superhuman.keymap'
import type { ActionName } from '../../keymaps/keymap-types'

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
  'thread.move': 'Move to folder…',
  'thread.star': 'Toggle Star',
  'thread.mark-read': 'Mark as Read',
  'thread.mark-unread': 'Mark as Unread',
  'thread.snooze': 'Snooze',
  'thread.select': 'Toggle selection',
  'thread.select-all': 'Select all in folder',
  'thread.extend-selection-down': 'Extend selection down',
  'thread.extend-selection-up': 'Extend selection up',
  'thread.clear-selection': 'Clear selection',
  'compose.new': 'New message',
  'compose.reply': 'Reply',
  'compose.reply-all': 'Reply All',
  'compose.forward': 'Forward',
  'compose.send': 'Send',
  'ui.command-palette': 'Command palette',
  'ui.search': 'Search',
  'ui.settings': 'Settings',
  'ui.shortcuts-help': 'Shortcuts help',
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
    title: 'Selection',
    actions: [
      'thread.select', 'thread.select-all',
      'thread.extend-selection-down', 'thread.extend-selection-up'
    ]
  },
  {
    title: 'Compose',
    actions: ['compose.new', 'compose.reply', 'compose.reply-all', 'compose.forward', 'compose.send']
  },
  {
    title: 'View',
    actions: ['ui.command-palette', 'ui.search', 'ui.settings', 'ui.shortcuts-help']
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

export function ShortcutsEditor() {
  const [customBindings, setCustomBindings] = useState<Record<string, string>>({})
  const [recording, setRecording] = useState<ActionName | null>(null)

  useEffect(() => {
    window.api.getSettings().then((settings: any) => {
      if (settings.customKeybindings) {
        setCustomBindings(settings.customKeybindings)
      }
    })
  }, [])

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
    if (['Meta', 'Shift', 'Control', 'Alt'].includes(e.key)) return

    const parts: string[] = []
    if (e.metaKey) parts.push('Cmd')
    if (e.ctrlKey) parts.push('Ctrl')
    if (e.altKey) parts.push('Alt')
    if (e.shiftKey && e.key.length > 1) parts.push('Shift')

    let key = e.key
    if (key === ' ') key = 'Space'
    parts.push(key)

    const normalized = parts.join('+')
    if (recording) {
      const newBindings = { ...customBindings, [recording]: normalized }
      setCustomBindings(newBindings)
      window.api.setSetting('customKeybindings', newBindings)
      // Tell useKeyboard to re-load bindings immediately, no polling delay
      window.dispatchEvent(new CustomEvent('settings:changed'))
      setRecording(null)
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
    window.dispatchEvent(new CustomEvent('settings:changed'))
  }

  return (
    <div className="space-y-4">
      <p className="text-xs" style={{ color: 'var(--ink-tertiary)' }}>
        Click any shortcut to record a new binding.
      </p>

      <div className="grid grid-cols-2 gap-x-6 gap-y-4">
        {SHORTCUT_GROUPS.map((group) => (
          <div key={group.title}>
            <h3 className="text-xs font-bold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--ink-tertiary)' }}>
              {group.title}
            </h3>
            <div className="space-y-0.5">
              {group.actions.map((action) => {
                const currentKey = bindingMap.get(action) || ''
                const isRecording = recording === action
                const isCustom = action in customBindings

                return (
                  <div key={action} className="flex items-center justify-between group py-0.5">
                    <span className="text-sm" style={{ color: 'var(--ink-secondary)' }}>
                      {ACTION_LABELS[action] || action}
                    </span>
                    <div className="flex items-center gap-1">
                      {isCustom && (
                        <button
                          onClick={() => resetBinding(action)}
                          className="text-2xs opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ color: 'var(--ink-tertiary)' }}
                        >
                          reset
                        </button>
                      )}
                      <button
                        onClick={() => setRecording(isRecording ? null : action)}
                        className="text-xs font-mono px-1.5 py-0.5 rounded"
                        style={{
                          backgroundColor: isRecording ? 'var(--paper-raised)' : 'transparent',
                          color: isRecording ? 'var(--ink)' : 'var(--ink-tertiary)',
                          border: isRecording ? '1px solid var(--border-strong)' : '1px solid transparent',
                          minWidth: '32px',
                          textAlign: 'center'
                        }}
                      >
                        {isRecording ? 'Press key...' : formatKey(currentKey)}
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
  )
}
