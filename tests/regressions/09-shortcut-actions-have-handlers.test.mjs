// REGRESSION TEST: Every bound action has a handler in App.tsx
// BUG: We added actions to the keymap ('thread.select-all',
//      'thread.extend-selection-down', etc.) and assumed they would work.
//      They were bound but had no handlers in App.tsx — pressing the key
//      preventDefault'd and did nothing. Felt to the user like "shortcuts
//      don't work."
// FIXED: 2026-05
// SYMPTOM: A key combination that's listed in the shortcuts editor does
//          nothing when pressed; no error in console.
// CONTRACT: For every action name appearing in any keymap, App.tsx's
//   keyHandlers object must define a handler.
import { strict as assert } from 'node:assert'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

const keymaps = [
  'src/renderer/src/keymaps/superhuman.keymap.ts',
  'src/renderer/src/keymaps/mailspring.keymap.ts',
  'src/renderer/src/keymaps/gmail.keymap.ts'
]

const usedActions = new Set()
for (const k of keymaps) {
  const src = readFileSync(join(root, k), 'utf-8')
  for (const m of src.matchAll(/action:\s*['"]([^'"]+)['"]/g)) {
    usedActions.add(m[1])
  }
}

const app = readFileSync(join(root, 'src/renderer/src/App.tsx'), 'utf-8')
// Locate `keyHandlers ... = {` — the type annotation between contains `=>`
// (for the function-value type), so we look for the assignment `>> = {`
// using the last `=` before the open brace on the same statement.
const khIdx = app.indexOf('const keyHandlers')
assert(khIdx >= 0, "Could not locate `const keyHandlers` in App.tsx")
const openIdx = app.indexOf('= {', khIdx)
assert(openIdx > khIdx, "Could not find the keyHandlers object literal opener")
// Find the matching closing brace by tracking depth.
let depth = 0
let close = -1
for (let i = openIdx + 2; i < app.length; i++) {
  const c = app[i]
  if (c === '{') depth++
  else if (c === '}') {
    depth--
    if (depth === 0) { close = i; break }
  }
}
assert(close > 0, "keyHandlers literal never closes")
const body = app.slice(openIdx, close)
const handlerKeys = new Set(
  Array.from(body.matchAll(/['"]([a-z][a-z0-9.-]+)['"]\s*:/g)).map((m) => m[1])
)

// Some actions are deliberately handled elsewhere (not by App.tsx's global
// keyHandlers). Each entry needs a one-line justification — without it the
// rule is "every keymap action must have a global handler".
const handledElsewhere = new Set([
  'navigate.open',     // MailList handles Enter on the focused thread row
  'compose.send',      // ComposeWindow has its own Cmd+Enter onKeyDown
  'compose.discard',   // ComposeWindow handles Esc / discard internally
  'ui.undo'            // UndoToast subscribes to its own undo state
])

const missing = []
for (const action of usedActions) {
  if (handlerKeys.has(action)) continue
  if (handledElsewhere.has(action)) continue
  missing.push(action)
}

assert.deepStrictEqual(
  missing,
  [],
  `Actions are bound in keymaps but have no handler in App.tsx — pressing ` +
  `them does nothing: ${missing.join(', ')}. Either add handlers or remove ` +
  `the binding.`
)

console.log('ok')
