// REGRESSION TEST: Custom shortcuts cleanly replace defaults
// BUG: When the user remapped, e.g., thread.archive from 'e' to 'a', the old
//      'e → thread.archive' stuck around (only the first match was removed)
//      AND any other action already using 'a' was not unbound — so 'a' might
//      still fire something else, depending on iteration order.
// FIXED: 2026-05
// SYMPTOM: User reassigns a key in settings, presses it, and either nothing
//          happens or the wrong action fires.
// CONTRACT: The custom-binding loader in useKeyboard must remove BOTH the
//   action's previous bindings AND any other binding using the same key,
//   then insert the new one.
import { strict as assert } from 'node:assert'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const src = readFileSync(join(root, 'src/renderer/src/hooks/useKeyboard.ts'), 'utf-8')

// The filter must reject entries where action OR key matches — encoded as
// `b.action !== action && b.key !== key` (keep only entries NEITHER matches).
assert.match(
  src,
  /\.filter\(\s*\([^)]*\)\s*=>\s*[a-z]\.action\s*!==\s*action\s*&&\s*[a-z]\.key\s*!==\s*key\s*\)/,
  "Custom-binding loader no longer removes BOTH the old action binding AND " +
  "any binding on the same key. Reassignment will leave stale bindings."
)

// The new binding must be pushed AFTER the filter, in the same iteration.
assert.match(
  src,
  /for \(const \[action, key\] of Object\.entries\(settings\.customKeybindings\)\)[\s\S]{0,400}?keymap\.push\(\s*\{\s*key/,
  "After filtering, the new {key, action} entry must be pushed inside the same loop."
)

// Reload must fire on settings:changed (event, not just polling).
assert.match(
  src,
  /addEventListener\(\s*['"]settings:changed['"]/,
  "useKeyboard must listen for settings:changed so new shortcuts take effect " +
  "without a 5s polling delay."
)

console.log('ok')
