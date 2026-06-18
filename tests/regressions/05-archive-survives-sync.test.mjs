// REGRESSION TEST: Archive/Trash/Move persist on the IMAP server
// BUG: Archiving locally only updated the SQLite folder_id. The next IMAP
//      sync re-pulled the message from INBOX, putting the thread back where
//      it was. Users saw archive "not working" — actually working then
//      immediately undone.
// FIXED: 2026-05
// SYMPTOM: Thread disappears when archived but returns within ~60s.
// CONTRACT: MAIL_ARCHIVE, MAIL_TRASH and MAIL_MOVE must each call
//   imapMoveThread() so the server move sticks.
import { strict as assert } from 'node:assert'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const src = readFileSync(join(root, 'src/main/ipc/mail.ipc.ts'), 'utf-8')

// imapMoveThread helper exists.
assert.match(
  src,
  /(?:const|function)\s+imapMoveThread/,
  "imapMoveThread helper is gone — server-side moves will silently not happen."
)

// Each of the three move-style handlers calls it. Slice each handler's body
// out by looking for the next ipcMain.handle that follows.
function handlerBody(src, channel) {
  const start = src.indexOf(`IPC.${channel}`)
  if (start < 0) return null
  const next = src.indexOf('ipcMain.handle', start + 20)
  return src.slice(start, next > 0 ? next : src.length)
}
for (const action of ['MAIL_ARCHIVE', 'MAIL_TRASH', 'MAIL_MOVE']) {
  const body = handlerBody(src, action)
  assert(body !== null, `Handler for IPC.${action} is missing`)
  assert(
    body.includes('imapMoveThread'),
    `Handler for IPC.${action} no longer calls imapMoveThread — local DB ` +
    `will be updated but the server is left untouched, and the next sync ` +
    `will undo the change.`
  )
}

// ImapClient must expose moveMessage(uid, fromPath, toPath).
const imap = readFileSync(join(root, 'src/main/services/sync/imap-client.ts'), 'utf-8')
assert.match(
  imap,
  /async\s+moveMessage\s*\([^)]*uid[^)]*fromPath[^)]*toPath/,
  "ImapClient.moveMessage signature changed. mail.ipc relies on it."
)

console.log('ok')
