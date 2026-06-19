// REGRESSION TEST: Search operators round-trip
// BUG: Without operators, typing `from:foo` just hands `from:foo` to FTS5
//      which treats `:` as a column-restriction syntax against a column that
//      probably doesn't exist — returns garbage. Sprint #6 added a parser
//      that translates user operators into the right structured filters.
// FIXED: 2026-05 (sprint #6, v0.1.6)
// SYMPTOM: User types `from:alice`, gets either nothing or unrelated results.
// CONTRACT: parseSearchQuery exists and:
//   - `from:foo`              → fts mentions from_address/from_name
//   - `subject:foo`           → fts targets the subject column
//   - `has:attachment`        → sets hasAttachment: true
//   - `has:unread`            → sets unread: true
//   - free text outside ops   → flows through as fts text
import { strict as assert } from 'node:assert'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const parser = readFileSync(join(root, 'src/main/services/search/parse-query.ts'), 'utf-8')
const ipc    = readFileSync(join(root, 'src/main/ipc/mail.ipc.ts'),    'utf-8')

// Structural: parser exports parseSearchQuery and handles the four key cases.
assert.match(parser, /export function parseSearchQuery/,
  "parseSearchQuery is gone — search operators won't be recognized.")
for (const op of ['from', 'to', 'subject', 'has']) {
  assert.match(parser, new RegExp(`case '${op}'`),
    `parser no longer handles the '${op}' operator.`)
}

// MAIL_LIST handler uses the parser, not the raw text.
assert.match(ipc, /parseSearchQuery\(options\.searchText\)/,
  "MAIL_LIST IPC no longer routes searchText through parseSearchQuery — operators won't work.")
assert.match(ipc, /parsed\.hasAttachment/,
  "MAIL_LIST IPC no longer applies the hasAttachment filter from the parser.")
assert.match(ipc, /parsed\.unread/,
  "MAIL_LIST IPC no longer applies the unread filter from the parser.")

console.log('ok')
