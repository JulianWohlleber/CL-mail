// REGRESSION TEST: Mac App Store build gates out sandbox-incompatible code
// BUG(-to-prevent): a refactor could un-gate the features that get the MAS
//      build rejected — Apple Mail import (reads ~/Library, spawns plutil),
//      osascript Contacts, and direct arbitrary-path vault writes.
// ADDED: 2026-06 (MAS prep)
// SYMPTOM: the App Store build would be rejected or crash on use.
// CONTRACT:
//   1. __MAS_BUILD__ is defined at build time (electron-vite config).
//   2. The Apple Mail discover handler early-returns under __MAS_BUILD__.
//   3. Vault writes go through withVaultAccess (security-scoped bookmarks).
//   4. Contacts lookups route through the mac-contacts backend, not an inline
//      osascript exec in the IPC handler.
import { strict as assert } from 'node:assert'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const read = (p) => readFileSync(join(root, p), 'utf-8')

// 1. Flag is injected by the build.
assert.match(
  read('electron.vite.config.ts'),
  /__MAS_BUILD__/,
  'electron.vite.config.ts no longer defines __MAS_BUILD__ — the gating flag is dead.'
)

// 2. Apple Mail import is gated.
assert.match(
  read('src/main/ipc/accounts.ipc.ts'),
  /ACCOUNTS_DISCOVER_APPLE_MAIL[\s\S]{0,400}if\s*\(\s*__MAS_BUILD__\s*\)/,
  'Apple Mail discover handler no longer early-returns under __MAS_BUILD__ — it ' +
  'would read ~/Library and spawn plutil in the sandbox → rejection.'
)

// 3. Vault writes are wrapped in security-scoped access.
const vault = read('src/main/services/vault/vault-sync.ts')
assert.match(vault, /withVaultAccess\(/,
  'vault-sync no longer wraps writes in withVaultAccess — the MAS build cannot ' +
  'write to the user-picked vault folder.')
assert.match(
  read('src/main/ipc/vault.ipc.ts'),
  /securityScopedBookmarks:\s*__MAS_BUILD__/,
  'VAULT_PICK_FOLDER no longer requests a security-scoped bookmark for the MAS build.'
)

// 4. Contacts goes through the backend abstraction, not inline osascript in the IPC.
const contactsIpc = read('src/main/ipc/contacts.ipc.ts')
assert.match(contactsIpc, /services\/contacts\/mac-contacts/,
  'contacts.ipc no longer uses the mac-contacts backend abstraction.')
assert.doesNotMatch(contactsIpc, /\bexec\s*\(/,
  'contacts.ipc still spawns a child process (inline osascript) — it must live ' +
  'behind the mac-contacts backend so the MAS build uses the native framework.')

console.log('ok')
