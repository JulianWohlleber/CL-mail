// REGRESSION TEST: `to:` search operator must not reference a non-existent FTS column
// BUG: parse-query emitted `to_list:<term>*`, but messages_fts only indexes
//      subject/body_text/from_name/from_address. A column-filter against a
//      missing FTS column raises "fts5: no such column: to_list" and fails the
//      ENTIRE query — so any search containing `to:` returned nothing.
// FIXED: 2026-06 (sprint #7 review, v0.1.8) — HIGH finding (David)
// SYMPTOM: Searching `to:alice` (alone or with other terms) returns no results.
// CONTRACT: applyOperator's `to` case must NOT emit a to_list: column filter.
//   Either the FTS schema gains a to_list column (and this test should be
//   updated to assert that) or the operator pushes a plain term.
import { strict as assert } from 'node:assert'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const parser = readFileSync(join(root, 'src/main/services/search/parse-query.ts'), 'utf-8')
const migrations = readFileSync(join(root, 'src/main/services/database/connection.ts'), 'utf-8')

// Find the FTS column list to know what's actually indexed.
const ftsDecl = migrations.match(/messages_fts\s+USING\s+fts5\(([^)]*)\)/i)
assert(ftsDecl, "Could not find the messages_fts fts5() declaration")
const ftsHasToList = /\bto_list\b/.test(ftsDecl[1])

// If to_list ISN'T an indexed column, the parser must not emit a to_list: filter.
if (!ftsHasToList) {
  assert.doesNotMatch(
    parser,
    /to_list:/,
    "parse-query emits a `to_list:` FTS column filter, but messages_fts does not " +
    "index a to_list column — every `to:` search will throw and return nothing."
  )
}

console.log('ok')
