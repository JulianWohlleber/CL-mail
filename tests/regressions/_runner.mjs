// Tiny runner: globs *.test.mjs in this directory and runs each as a
// subprocess. Reports pass/fail with a counter and a one-line per failure.
//
// We don't use a test framework because the assertions are simple structural
// checks against source files — vitest/jest would be overkill and add deps.
import { readdirSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const files = readdirSync(here).filter((f) => f.endsWith('.test.mjs')).sort()

if (files.length === 0) {
  console.log('No regression tests found.')
  process.exit(0)
}

let passed = 0
let failed = 0
const failures = []

for (const file of files) {
  const res = spawnSync(process.execPath, [join(here, file)], { encoding: 'utf-8' })
  if (res.status === 0) {
    process.stdout.write(`\x1b[32m✓\x1b[0m ${file}\n`)
    passed++
  } else {
    process.stdout.write(`\x1b[31m✗\x1b[0m ${file}\n`)
    failed++
    failures.push({ file, stderr: res.stderr.trim() || res.stdout.trim() })
  }
}

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) {
  console.log('\n--- Failure details ---')
  for (const f of failures) {
    console.log(`\n[${f.file}]`)
    console.log(f.stderr)
  }
  process.exit(1)
}
