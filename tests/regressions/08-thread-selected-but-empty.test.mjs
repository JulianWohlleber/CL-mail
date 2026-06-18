// REGRESSION TEST: selectThread handles null fetch result
// BUG: selectThread set selectedThreadId synchronously, then awaited
//      getThread(). If getThread returned null (race with sync that
//      archived the thread), selectedThread stayed null while
//      selectedThreadId was set — the list showed a highlighted row, but
//      the reading pane showed the empty state.
// FIXED: 2026-05
// SYMPTOM: A thread row looks selected but the reading pane is empty.
// CONTRACT: When getThread returns null, selectThread must clear the
//   selection or pick a different available thread, never leave the
//   half-selected state.
import { strict as assert } from 'node:assert'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const src = readFileSync(join(root, 'src/renderer/src/stores/mail.store.ts'), 'utf-8')

// After awaiting getThread, the code must branch on a null result.
assert.match(
  src,
  /selectThread:\s*async[\s\S]{0,1500}if\s*\(\s*!thread\s*\)/,
  "selectThread no longer handles a null result from getThread(). The UI can " +
  "end up with a highlighted thread row and an empty reading pane."
)

// And the protection against race "user moved on while we awaited" must remain.
assert.match(
  src,
  /selectThread:\s*async[\s\S]{0,2200}selectedThreadId\s*!==\s*threadId[\s\S]{0,100}return/,
  "selectThread no longer drops a stale fetch result when the user has " +
  "already selected another thread. Reading pane will flash old content."
)

console.log('ok')
