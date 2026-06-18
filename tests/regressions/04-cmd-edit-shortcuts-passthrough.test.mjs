// REGRESSION TEST: Cmd+A/C/V/X/Z/Y reach text fields
// BUG: Once we added a Cmd+a shortcut for "select all threads", the macOS-
//      standard Cmd+A (select all text) stopped working inside text inputs.
// FIXED: 2026-05
// SYMPTOM: User can't Cmd+A to select text inside the recipient field, the
//          subject, the body, or the search bar.
// CONTRACT: When focus is in an input, the global handler must return early
//   for the six standard edit shortcuts (a/c/v/x/z/y with Cmd or Ctrl), no
//   matter what global bindings exist for those combos.
import { strict as assert } from 'node:assert'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const src = readFileSync(join(root, 'src/renderer/src/hooks/useKeyboard.ts'), 'utf-8')

// The edit-keys allowlist must be present and include the six standard letters.
const editKeysMatch = src.match(/editKeys\s*=\s*\[\s*([^\]]+)\]/)
assert(editKeysMatch, "editKeys allowlist for native edit-shortcuts is missing")
const letters = editKeysMatch[1]
  .split(',')
  .map((s) => s.trim().replace(/['"]/g, ''))
for (const k of ['a', 'c', 'v', 'x', 'z', 'y']) {
  assert(
    letters.includes(k),
    `editKeys allowlist no longer includes '${k}'. Cmd+${k.toUpperCase()} in ` +
    `text inputs will be hijacked by a global shortcut.`
  )
}

// The check must run when isInput is true and metaKey or ctrlKey is held.
assert.match(
  src,
  /isInput[\s\S]{0,400}metaKey\s*\|\|\s*[a-z]\.ctrlKey/,
  "The metaKey/ctrlKey check for native edit-shortcut passthrough is gone."
)

console.log('ok')
