// REGRESSION TEST: Shortcuts cheatsheet reflects the active keymap preset
// BUG: ShortcutsHelp hard-coded superhumanKeymap. Users on the
//      mailspring / gmail / apple-mail preset saw the wrong shortcuts.
// FIXED: 2026-05 (sprint #3, v0.1.3)
// SYMPTOM: User picks `apple-mail`, hits `?`, the card still shows `e`
//          for archive instead of `Cmd+E`.
// CONTRACT: ShortcutsHelp loads settings.keymapPreset and uses the
//   matching keymap to build its binding map. Keymap registry has all
//   four presets.
import { strict as assert } from 'node:assert'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const src = readFileSync(join(root, 'src/renderer/src/components/shared/ShortcutsHelp.tsx'), 'utf-8')

assert.match(
  src,
  /settings\.keymapPreset/,
  "ShortcutsHelp no longer reads keymapPreset from settings — non-superhuman " +
  "users will see lies on the cheatsheet."
)

assert.match(
  src,
  /KEYMAPS\[keymapPreset\]/,
  "ShortcutsHelp no longer indexes into the keymap registry by preset name."
)

for (const k of ['superhuman', 'mailspring', 'gmail', "'apple-mail'"]) {
  assert.match(src, new RegExp(k.replace(/[-/\\.+]/g, '\\$&')),
    `ShortcutsHelp's keymap registry is missing ${k}.`)
}

console.log('ok')
