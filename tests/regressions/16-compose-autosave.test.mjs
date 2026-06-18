// REGRESSION TEST: ComposeWindow autosaves drafts
// BUG: Without an autosave, Cmd+W mid-message loses everything. Users
//      hit this twice in QA. Once added, a future refactor could drop
//      the debounced effect and we'd be back to silent data loss.
// FIXED: 2026-05 (sprint #5, v0.1.5)
// SYMPTOM: User types a long message, accidentally closes the window,
//          reopens compose — all gone.
// CONTRACT:
//   1. ComposeWindow imports and calls saveDraft / loadDraft / deleteDraft
//   2. A debounced effect persists on body/subject/recipient changes
//   3. The local_drafts table exists in the migrations.
import { strict as assert } from 'node:assert'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const compose = readFileSync(join(root, 'src/renderer/src/components/compose/ComposeWindow.tsx'), 'utf-8')
const migrations = readFileSync(join(root, 'src/main/services/database/connection.ts'), 'utf-8')

assert.match(compose, /saveDraft\(/,    "ComposeWindow no longer calls saveDraft — drafts won't persist.")
assert.match(compose, /loadDraft\(/,    "ComposeWindow no longer calls loadDraft — drafts can't be restored.")
assert.match(compose, /deleteDraft\(/,  "ComposeWindow no longer deletes its draft on send — stale rows pile up.")

assert.match(compose, /setTimeout\([\s\S]{0,400}saveDraft/,
  "ComposeWindow autosave is no longer debounced via setTimeout — either it fires on " +
  "every keystroke (DB hammering) or not at all (data loss).")

assert.match(migrations, /CREATE TABLE IF NOT EXISTS local_drafts/,
  "local_drafts table is gone — the IPC will fail on save.")

console.log('ok')
