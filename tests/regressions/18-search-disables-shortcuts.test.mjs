// REGRESSION TEST: Active search field disables global shortcuts
// BUG: The "empty input fires a bound shortcut" passthrough (added for the
//      general case) misfired in the search box — clicking search and typing
//      a query that starts with a shortcut letter (e.g. "ebay") archived the
//      thread instead of typing. The search field must opt out entirely.
// FIXED: 2026-06 (sprint #7, v0.1.7)
// SYMPTOM: Focus search, type a word starting with e/a/s/u/x — the first
//          letter triggers archive/star/etc instead of going into the box.
// CONTRACT:
//   1. The search input carries data-disable-shortcuts="true".
//   2. useKeyboard checks data-disable-shortcuts and, for such inputs, returns
//      early on any non-Escape key (no blur, no shortcut dispatch).
import { strict as assert } from 'node:assert'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const searchBar = readFileSync(join(root, 'src/renderer/src/components/search/SearchBar.tsx'), 'utf-8')
const keyboard  = readFileSync(join(root, 'src/renderer/src/hooks/useKeyboard.ts'), 'utf-8')

assert.match(
  searchBar,
  /data-disable-shortcuts=["']true["']/,
  "Search input no longer carries data-disable-shortcuts — global shortcuts will " +
  "hijack the first letter of a query again."
)

assert.match(
  keyboard,
  /data-disable-shortcuts/,
  "useKeyboard no longer reads data-disable-shortcuts — the search opt-out is dead."
)

// The opt-out must short-circuit BEFORE the empty-input shortcut-fire path.
const optOutIdx = keyboard.indexOf('optsOutOfShortcuts')
const emptyFireIdx = keyboard.indexOf('isEmpty && isBoundShortcut')
assert(optOutIdx >= 0, "optsOutOfShortcuts guard is missing from useKeyboard")
assert(
  optOutIdx < emptyFireIdx,
  "The data-disable-shortcuts opt-out must be evaluated BEFORE the empty-input " +
  "shortcut-fire path, otherwise search keystrokes still fire shortcuts."
)

console.log('ok')
