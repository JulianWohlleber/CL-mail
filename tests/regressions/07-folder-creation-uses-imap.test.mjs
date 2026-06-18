// REGRESSION TEST: New folder via "Move to folder…" actually creates on IMAP
// BUG: Creating a folder via the move-to-folder modal only inserted a row
//      into the local folders table. The next sync would delete it again
//      because the server has no such mailbox.
// FIXED: 2026-05
// SYMPTOM: User types a new folder name in the move modal, sees it appear in
//          the sidebar, then it vanishes ~60s later.
// CONTRACT: ImapClient.createFolder must call mailboxCreate on the server
//   AND the FOLDERS_CREATE IPC handler must route through it.
import { strict as assert } from 'node:assert'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

// Pull out the body of ImapClient.createFolder.
const imap = readFileSync(join(root, 'src/main/services/sync/imap-client.ts'), 'utf-8')
const createStart = imap.search(/(?:async\s+)?createFolder\s*\(/)
assert(createStart >= 0, "ImapClient.createFolder is missing")
const createBody = imap.slice(createStart, createStart + 1500)
assert(
  createBody.includes('mailboxCreate'),
  "ImapClient.createFolder no longer calls mailboxCreate — folder won't be " +
  "created on the server and the next sync will delete the local row."
)

const main = readFileSync(join(root, 'src/main/index.ts'), 'utf-8')
const handlerStart = main.indexOf('IPC.FOLDERS_CREATE')
assert(handlerStart >= 0, "FOLDERS_CREATE handler is missing")
const handlerBody = main.slice(handlerStart, handlerStart + 1200)
assert(
  /client\.createFolder|services\.getSyncManager\(\)/.test(handlerBody),
  "FOLDERS_CREATE handler no longer routes through the SyncManager's IMAP client."
)

console.log('ok')
