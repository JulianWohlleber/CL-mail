// REGRESSION TEST: Thread list pages instead of loading the whole folder
// BUG: A future refactor could drop the limit argument and revert to
//      loading every thread at once — fine for a 20-thread test inbox,
//      terrible for a 10k-thread real one.
// FIXED: 2026-05 (sprint #4, v0.1.4)
// SYMPTOM: Opening a large folder is slow / blocks the UI; scrolling is jerky.
// CONTRACT: mail.store passes a `limit` to listMail, exports loadMoreThreads
//   and tracks endReached. MailList wires an IntersectionObserver against
//   the sentinel.
import { strict as assert } from 'node:assert'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const store = readFileSync(join(root, 'src/renderer/src/stores/mail.store.ts'), 'utf-8')
const list  = readFileSync(join(root, 'src/renderer/src/components/layout/MailList.tsx'), 'utf-8')

assert.match(store, /loadMoreThreads:\s*async/,
  "mail.store no longer exports loadMoreThreads — infinite scroll is gone.")
assert.match(store, /endReached/,
  "mail.store no longer tracks endReached — the scroller can't know when to stop.")
assert.match(store, /loadThreads:[\s\S]{0,1800}limit:\s*PAGE_SIZE/,
  "loadThreads no longer passes a limit — pages got dropped, the app will " +
  "fetch every thread on every folder switch.")

assert.match(list, /IntersectionObserver/,
  "MailList no longer uses an IntersectionObserver — infinite scroll is broken.")
assert.match(list, /sentinelRef/,
  "MailList no longer renders a sentinel for the observer to watch.")

console.log('ok')
