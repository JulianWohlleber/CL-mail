import { useEffect, useRef } from 'react'
import type { ActionName, Keymap } from '../keymaps/keymap-types'
import { superhumanKeymap } from '../keymaps/superhuman.keymap'
import { mailspringKeymap } from '../keymaps/mailspring.keymap'
import { gmailKeymap } from '../keymaps/gmail.keymap'
import { appleMailKeymap } from '../keymaps/apple-mail.keymap'
import { useUIStore } from '../stores/ui.store'
import { useCommandStore } from '../stores/command.store'

type ActionHandler = () => void

const SEQUENCE_TIMEOUT = 500

const KEYMAPS: Record<string, Keymap> = {
  superhuman: superhumanKeymap,
  mailspring: mailspringKeymap,
  gmail: gmailKeymap,
  'apple-mail': appleMailKeymap
}

function normalizeKey(e: KeyboardEvent): string {
  const parts: string[] = []
  if (e.metaKey) parts.push('Cmd')
  if (e.ctrlKey) parts.push('Ctrl')
  if (e.altKey) parts.push('Alt')
  if (e.shiftKey && e.key.length > 1) parts.push('Shift')

  let key = e.key
  if (key === ' ') key = 'Space'

  // For single characters with Shift, use the actual character (e.g., '#', '!', '?')
  parts.push(key)

  return parts.join('+')
}

function buildBindingMaps(keymap: Keymap) {
  const singleBindings = new Map<string, ActionName>()
  const sequenceBindings = new Map<string, ActionName>()

  for (const binding of keymap) {
    if (binding.key.includes(' ') && !binding.key.includes('+')) {
      sequenceBindings.set(binding.key, binding.action)
    } else {
      singleBindings.set(binding.key, binding.action)
    }
  }

  return { singleBindings, sequenceBindings }
}

export function useKeyboard(
  handlers: Partial<Record<ActionName, ActionHandler>>,
  preset: string = 'superhuman'
) {
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers

  const sequenceBuffer = useRef('')
  const sequenceTimer = useRef<ReturnType<typeof setTimeout>>()

  // Store binding maps in a ref so they can be updated async
  const bindingsRef = useRef(buildBindingMaps(KEYMAPS[preset] || superhumanKeymap))

  useEffect(() => {
    // Load and apply bindings (including custom overrides)
    const loadBindings = () => {
      let keymap = [...(KEYMAPS[preset] || superhumanKeymap)]
      window.api.getSettings().then((settings: any) => {
        if (settings.customKeybindings && Object.keys(settings.customKeybindings).length > 0) {
          // For every custom binding: remove ALL existing entries for that action
          // (an action can have multiple default keys, e.g. `u` and `Shift+U` both
          // bound to mark-unread). Then add the new custom key. Also remove any
          // OTHER action that was previously using this key — the user's intent
          // is "this key now does X", so we must clear the previous binding for
          // that key, otherwise the order in the map decides which wins.
          for (const [action, key] of Object.entries(settings.customKeybindings)) {
            keymap = keymap.filter((b) => b.action !== action && b.key !== key)
            keymap.push({ key: key as string, action: action as ActionName })
          }
        }
        bindingsRef.current = buildBindingMaps(keymap)
        console.log('[Keyboard] Bindings loaded:', bindingsRef.current.singleBindings.size, 'single,', bindingsRef.current.sequenceBindings.size, 'sequence')
      })
    }

    loadBindings()

    // Reload immediately when settings change (custom event fired by ShortcutsEditor)
    const onSettingsChanged = () => loadBindings()
    window.addEventListener('settings:changed', onSettingsChanged)

    // Slow fallback poll in case an external process changes settings
    const reloadInterval = setInterval(loadBindings, 5000)

    const handleKeyDown = (e: KeyboardEvent) => {
      // If a blocking modal owns focus, skip all global shortcuts so every
      // keystroke (letters, numbers, etc.) flows into its search field.
      // The modal handles its own Arrow/Enter/Escape via React onKeyDown.
      const ui = useUIStore.getState()
      if (ui.moveToFolderOpen) {
        if (e.key.length === 1 || e.key === 'Backspace') {
          console.log(`[Keyboard] blocked: move-folder modal open`)
        }
        return
      }
      // Command palette: similar — block global shortcuts while it's open,
      // but allow the same Cmd+K that opened it to also close it.
      const cmd = useCommandStore.getState()
      if (cmd.isOpen) {
        const normalized = normalizeKey(e)
        if (normalized !== 'Cmd+k' && normalized !== 'Escape') {
          if (e.key.length === 1) console.log(`[Keyboard] blocked: command palette open`)
          return
        }
      }

      // Don't capture shortcuts when actively typing in inputs, with two
      // exceptions:
      //   • Standard edit shortcuts (Cmd+A/C/V/X/Z/Y) must always reach the input.
      //   • If the input is EMPTY and the pressed key is bound to a global
      //     shortcut, fire the shortcut and blur the input. This is critical
      //     for keys like 'a' (archive) / 'e' (archive) — users very often
      //     have the search bar focused but empty, and expect the shortcut to
      //     work without first having to click somewhere else.
      const target = e.target as HTMLElement
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable
      if (isInput) {
        if (e.metaKey || e.ctrlKey) {
          const editKeys = ['a', 'c', 'v', 'x', 'z', 'y']
          if (editKeys.includes(e.key.toLowerCase())) {
            return
          }
          // Other Cmd-shortcuts fall through to global handler
        } else if (e.key === 'Escape') {
          // Falls through so Escape can close modals or blur
        } else {
          const inputEl = target as HTMLInputElement | HTMLTextAreaElement
          const isEmpty = !('value' in inputEl) || !inputEl.value
          const normalizedNow = normalizeKey(e)
          const isBoundShortcut =
            bindingsRef.current.singleBindings.has(normalizedNow) ||
            Array.from(bindingsRef.current.sequenceBindings.keys()).some(
              (seq) => seq.startsWith(normalizedNow + ' ')
            )
          if (isEmpty && isBoundShortcut && e.key.length === 1) {
            // CRITICAL: prevent the character from being typed into the input
            // BEFORE we blur. Without this, the browser still delivers the
            // keystroke to the (still-focused-at-dispatch-time) input, and
            // the user sees their shortcut key appear as text instead of
            // firing the action.
            e.preventDefault()
            inputEl.blur()
            // Fall through to the shortcut dispatcher below.
          } else {
            if (e.key.length === 1) {
              console.log(`[Keyboard] key "${e.key}" went to input <${target.tagName.toLowerCase()}> (value="${(inputEl as any).value ?? ''}") — clear input to use shortcuts`)
            }
            return
          }
        }
      }

      const normalized = normalizeKey(e)
      const { singleBindings, sequenceBindings } = bindingsRef.current

      // Check for sequence continuation
      if (sequenceBuffer.current) {
        const sequence = `${sequenceBuffer.current} ${normalized}`
        const action = sequenceBindings.get(sequence)

        clearTimeout(sequenceTimer.current)
        sequenceBuffer.current = ''

        if (action && handlersRef.current[action]) {
          e.preventDefault()
          handlersRef.current[action]!()
          return
        }
      }

      // Check if this could be the start of a sequence
      const possibleSequence = Array.from(sequenceBindings.keys()).some(
        (seq) => seq.startsWith(normalized + ' ')
      )

      if (possibleSequence) {
        e.preventDefault()
        sequenceBuffer.current = normalized
        sequenceTimer.current = setTimeout(() => {
          sequenceBuffer.current = ''
        }, SEQUENCE_TIMEOUT)
        return
      }

      // Single key binding
      const action = singleBindings.get(normalized)
      if (action) {
        e.preventDefault()
        if (handlersRef.current[action]) {
          handlersRef.current[action]!()
        } else {
          console.warn(`[Keyboard] Action "${action}" has no handler`)
        }
      } else {
        console.log(`[Keyboard] No binding for key "${normalized}"`)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('settings:changed', onSettingsChanged)
      clearTimeout(sequenceTimer.current)
      clearInterval(reloadInterval)
    }
  }, [preset])
}
