// REGRESSION TEST: Shortcuts fire when focus is in an EMPTY input
// BUG: After we tightened input-protection, pressing 'a' to archive did
//      nothing when the (empty) search bar happened to be focused — the
//      input swallowed the key. Users frequently leave the search bar
//      focused and expect shortcuts to keep working.
// FIXED: 2026-05 (reinstated empty-input → blur-and-fire path)
// SYMPTOM: Shortcut key produces no archive/no action, but only when the
//          search bar / a recipient field is focused with no value typed.
// CONTRACT: useKeyboard must detect an EMPTY input + a key bound to a
//   global shortcut, blur the input, and fall through to shortcut dispatch.
import { strict as assert } from 'node:assert'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const src = readFileSync(join(root, 'src/renderer/src/hooks/useKeyboard.ts'), 'utf-8')

// Must explicitly check bindingsRef.singleBindings inside the input branch.
assert.match(
  src,
  /isInput[\s\S]{0,1200}singleBindings\.has\(/,
  "useKeyboard no longer checks if the key is a bound shortcut when focus is " +
  "in an input. Without this check, shortcuts can't fire from empty inputs."
)

// Must blur the input before falling through.
assert.match(
  src,
  /isInput[\s\S]{0,1500}\.blur\(\)/,
  "useKeyboard no longer blurs the input when an empty-input shortcut fires."
)

// The empty-input branch must require isEmpty (so non-empty inputs still
// own their keystrokes — typing 'a' in a search query must remain typing).
assert.match(
  src,
  /isEmpty\s*&&\s*isBoundShortcut/,
  "The empty-input passthrough lost its isEmpty guard. Without it, typing into " +
  "a non-empty search bar would trigger shortcuts and lose characters."
)

// The branch must preventDefault BEFORE blur. Without preventDefault the
// browser still delivers the keystroke to the (still-focused-at-dispatch-time)
// input and the user's shortcut key types as text — the visible symptom is
// "archive shortcut does nothing, but a letter appears in the search bar".
const branch = src.match(/isEmpty\s*&&\s*isBoundShortcut[\s\S]{0,1200}?\n\s*\}/)
assert(branch, "empty-input branch block not found")
assert.match(
  branch[0],
  /preventDefault\(\)[\s\S]*?\.blur\(\)/,
  "Empty-input shortcut passthrough no longer calls e.preventDefault() BEFORE " +
  "blurring the input. The shortcut key will type into the input instead of " +
  "firing the action."
)

console.log('ok')
