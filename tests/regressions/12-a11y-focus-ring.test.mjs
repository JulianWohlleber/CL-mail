// REGRESSION TEST: keyboard focus is visible
// BUG: A future CSS cleanup could delete the focus-visible ring or remove
//      the --accent-ring token, leaving keyboard users with no way to see
//      which element has focus.
// FIXED: 2026-05 (sprint #1, v0.1.1)
// SYMPTOM: Tab through the UI and nothing visibly highlights.
// CONTRACT:
//   1. --accent-ring is defined in both light and dark colour tokens.
//   2. globals.css ships a :focus-visible outline rule that uses it.
import { strict as assert } from 'node:assert'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const read = (p) => readFileSync(join(root, p), 'utf-8')

for (const f of ['src/renderer/src/styles/tokens/colors-light.css',
                 'src/renderer/src/styles/tokens/colors-dark.css']) {
  assert.match(read(f), /--accent-ring:/, `${f} no longer defines --accent-ring`)
}

const globals = read('src/renderer/src/styles/globals.css')
assert.match(
  globals,
  /:focus-visible[\s\S]{0,200}var\(--accent-ring\)/,
  "globals.css no longer applies var(--accent-ring) on :focus-visible — keyboard users will see no focus ring."
)

console.log('ok')
