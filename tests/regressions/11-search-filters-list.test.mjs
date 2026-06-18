// REGRESSION TEST: Search filters the main thread list
// BUG: Pressing Enter or clicking a search result navigated to one thread
//      via selectThread() but never filtered the list. Users saw previews
//      but couldn't get the list to actually show only matching threads.
// FIXED: 2026-05
// SYMPTOM: User types in the search bar, sees dropdown previews, presses
//          Enter — the highlighted thread changes but the mail list still
//          shows everything else from the current folder.
// CONTRACT:
//   1. mail.store exports applySearch(query) and exitSearch().
//   2. SearchBar's Enter handler calls applySearch with the query.
//   3. MAIL_LIST IPC handler accepts a searchText option and routes it to
//      messages_fts JOIN.
//   4. mail.store.loadThreads passes searchText when in SEARCH_RESULTS_ID mode.
import { strict as assert } from 'node:assert'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const read = (p) => readFileSync(join(root, p), 'utf-8')

const shared = read('src/shared/constants.ts')
assert.match(
  shared,
  /export const SEARCH_RESULTS_ID/,
  "SEARCH_RESULTS_ID sentinel removed from shared constants."
)

const store = read('src/renderer/src/stores/mail.store.ts')
assert.match(
  store,
  /applySearch:\s*\(query\)\s*=>/,
  "applySearch(query) removed from mail.store — search Enter has nothing to call."
)
assert.match(
  store,
  /exitSearch:\s*\(\)\s*=>/,
  "exitSearch() removed from mail.store — user can't leave the filtered view."
)
assert.match(
  store,
  /SEARCH_RESULTS_ID[\s\S]{0,400}searchText/,
  "mail.store.loadThreads no longer maps SEARCH_RESULTS_ID to {searchText} — " +
  "the search-results virtual folder will return empty."
)

const searchBar = read('src/renderer/src/components/search/SearchBar.tsx')
assert.match(
  searchBar,
  /e\.key\s*===\s*['"]Enter['"][\s\S]{0,300}applySearch|applyAndClose/,
  "SearchBar's Enter handler no longer calls applySearch. The list won't be filtered."
)

const ipc = read('src/main/ipc/mail.ipc.ts')
assert.match(
  ipc,
  /options\.searchText[\s\S]{0,800}messages_fts\s+MATCH/,
  "MAIL_LIST handler's searchText branch no longer JOINs messages_fts — " +
  "search query won't return matching threads."
)

console.log('ok')
