// REGRESSION TEST: First-run hint respects its dismissal flag
// BUG: A future cleanup could forget to read firstRunHintDismissed from
//      settings and end up showing the hint every time the app starts.
// FIXED: 2026-05 (sprint #2, v0.1.2)
// SYMPTOM: The "tip: press j/k…" card reappears in the reading pane every
//          time the user opens an email, even after dismissing it.
// CONTRACT: FirstRunHint must read firstRunHintDismissed from getSettings()
//   AND must call setSetting('firstRunHintDismissed', true) on dismiss.
import { strict as assert } from 'node:assert'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const src = readFileSync(join(root, 'src/renderer/src/components/shared/FirstRunHint.tsx'), 'utf-8')

assert.match(
  src,
  /getSettings\(\)[\s\S]{0,200}firstRunHintDismissed/,
  "FirstRunHint no longer reads firstRunHintDismissed from settings — " +
  "the tip will appear on every cold start."
)
assert.match(
  src,
  /setSetting\(\s*['"]firstRunHintDismissed['"]\s*,\s*true\s*\)/,
  "FirstRunHint no longer persists its dismissal — the user can't make it stop."
)

console.log('ok')
