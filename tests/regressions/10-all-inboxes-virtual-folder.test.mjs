// REGRESSION TEST: All-Inboxes unified view
// BUG: New feature — a virtual "All Inboxes" folder aggregates threads
//      across every enabled account's inbox. Easy to break by future
//      refactors of the list IPC or the folder-id sentinel.
// FIXED: 2026-05 (initial implementation)
// SYMPTOM: Clicking All Inboxes shows nothing, shows only one account, or
//          the sidebar item disappears.
// CONTRACT:
//   1. ALL_INBOXES_ID constant exists in shared.
//   2. mail.store.loadThreads switches to {allInboxes:true} on the sentinel.
//   3. MAIL_LIST handler interprets allInboxes by JOINing folders+accounts
//      with role='inbox' AND enabled=1.
import { strict as assert } from 'node:assert'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

const shared = readFileSync(join(root, 'src/shared/constants.ts'), 'utf-8')
assert.match(
  shared,
  /export const ALL_INBOXES_ID/,
  "ALL_INBOXES_ID export removed from shared constants."
)

const store = readFileSync(join(root, 'src/renderer/src/stores/mail.store.ts'), 'utf-8')
assert.match(
  store,
  /ALL_INBOXES_ID[\s\S]{0,400}allInboxes:\s*true/,
  "mail.store.loadThreads no longer routes ALL_INBOXES_ID to {allInboxes:true}."
)

const ipc = readFileSync(join(root, 'src/main/ipc/mail.ipc.ts'), 'utf-8')
assert.match(
  ipc,
  /options\.allInboxes[\s\S]{0,400}role\s*=\s*['"]inbox['"][\s\S]{0,400}enabled\s*=\s*1/,
  "MAIL_LIST handler's allInboxes branch no longer joins folders+accounts " +
  "with role='inbox' AND enabled=1."
)

console.log('ok')
