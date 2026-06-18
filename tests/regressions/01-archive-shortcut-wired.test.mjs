// REGRESSION TEST: Archive shortcut end-to-end wiring
// BUG: Pressing the archive key (default 'e', custom 'a', etc.) did nothing —
//      multiple times. Root causes seen: (1) handler missing from App.tsx,
//      (2) action not in keymap, (3) archive() function refactored without
//      preserving its single-id call signature, (4) IPC handler removed.
// FIXED: 2026-05
// SYMPTOM: User presses 'e' or their custom archive key and the highlighted
//          thread does NOT disappear from the list. Console may or may not
//          log anything depending on which layer broke.
// CONTRACT: Every layer of the archive shortcut chain must be present:
//   1. Keymap binds something to 'thread.archive'.
//   2. App.tsx has a handler for 'thread.archive' that calls archive().
//   3. mail.store exports an archive function that handles a missing argument
//      (falling back to selectedThreadId / selectedIds).
//   4. The IPC handler MAIL_ARCHIVE exists and accepts a threadId.
//   5. The IPC handler invokes the IMAP move so the change survives sync.
import { strict as assert } from 'node:assert'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const read = (p) => readFileSync(join(root, p), 'utf-8')

// 1. Keymap binds at least one key to thread.archive in the default preset.
const keymap = read('src/renderer/src/keymaps/superhuman.keymap.ts')
assert.match(
  keymap,
  /action:\s*'thread\.archive'/,
  "superhuman keymap no longer binds anything to 'thread.archive'. " +
  "Restore at least one binding (default was 'e')."
)

// 2. App.tsx wires the thread.archive action to a handler that ends up calling archive().
// We look up to ~400 chars into the handler body to allow for logging /
// multi-statement bodies but stop before the next handler entry.
const app = read('src/renderer/src/App.tsx')
const archiveHandler = app.match(/'thread\.archive':\s*\([^)]*\)\s*=>\s*\{?([\s\S]{0,400}?)\}?\s*,\n/)
assert(
  archiveHandler,
  "App.tsx no longer has a 'thread.archive' handler. " +
  "Without this, pressing the archive shortcut silently does nothing."
)
assert.match(
  archiveHandler[1],
  /\barchive\(/,
  "App.tsx's 'thread.archive' handler exists but no longer calls archive()."
)

// 3. mail.store exports archive() and treats an undefined argument as 'use selection'.
const store = read('src/renderer/src/stores/mail.store.ts')
assert.match(store, /archive:\s*async/, "archive() missing from mail.store")
assert.match(
  store,
  /archive:\s*async[\s\S]*?selectedThreadId/,
  "archive() in mail.store no longer falls back to selectedThreadId. " +
  "Calling archive() without an id must still archive the currently-open thread."
)

// 4. IPC handler exists.
const ipc = read('src/main/ipc/mail.ipc.ts')
assert.match(
  ipc,
  /ipcMain\.handle\(IPC\.MAIL_ARCHIVE,/,
  "IPC handler for MAIL_ARCHIVE is missing — archive() in mail.store will reject."
)

// 5. IPC handler triggers server-side IMAP move. Without this the next sync
// re-pulls the message into INBOX and archive 'doesn't work' to the user.
const archiveIpcStart = ipc.indexOf('IPC.MAIL_ARCHIVE')
assert(archiveIpcStart >= 0, "IPC.MAIL_ARCHIVE block not found")
// Slice from the handler start up to the closing of the handler block (next ipcMain.handle).
const nextHandlerOffset = ipc.indexOf('ipcMain.handle', archiveIpcStart + 20)
const archiveIpcBody = ipc.slice(archiveIpcStart, nextHandlerOffset > 0 ? nextHandlerOffset : archiveIpcStart + 2500)
assert.match(
  archiveIpcBody,
  /imapMoveThread/,
  "MAIL_ARCHIVE handler no longer calls imapMoveThread. Archive will appear " +
  "to work locally but the email reappears in INBOX on the next sync."
)

console.log('ok')
