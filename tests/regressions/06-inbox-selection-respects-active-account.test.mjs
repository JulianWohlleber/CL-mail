// REGRESSION TEST: Startup inbox selection respects activeAccountId
// BUG: On startup, App.tsx selected the first inbox in folders array across
//      ALL accounts. If that wasn't the active account's inbox, the sidebar
//      showed a highlighted inbox but the thread list was empty (or stale).
// FIXED: 2026-05
// SYMPTOM: After cold start with multiple accounts, sidebar shows the first
//          account active, but the mail list shows another account's inbox
//          (or is empty for accounts that have no inbox messages).
// CONTRACT: App.tsx must prefer the active account's inbox when selecting
//   a default folder, falling back to any inbox only if no active account.
import { strict as assert } from 'node:assert'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const src = readFileSync(join(root, 'src/renderer/src/App.tsx'), 'utf-8')

// Find inbox lookup that filters by accountId === activeAccountId.
assert.match(
  src,
  /folders\.find\(\([^)]*\)\s*=>\s*[^)]*accountId\s*===\s*activeAccountId\s*&&[^)]*role\s*===\s*['"]inbox['"]/,
  "Startup inbox-selection effect no longer filters by activeAccountId. " +
  "On multi-account setups the wrong account's inbox will be picked."
)

// The All-Inboxes virtual view must NOT be overwritten by this effect.
assert.match(
  src,
  /ALL_INBOXES_ID[\s\S]{0,200}return/,
  "Startup inbox-selection effect must early-return when the user is in the " +
  "All Inboxes virtual view, otherwise it gets switched out on each render."
)

console.log('ok')
