# Regression Tests

This directory holds one file per real bug we've already hit and fixed in
mail_. The tests are plain Node `.mjs` scripts — no test framework. They run
before every `npm run build:mac` and the build fails if any of them fail.

## Why this exists

We kept reintroducing the same bugs (especially shortcut breakages). Each
test here pins down the *contract* of a previous fix so a future refactor
can't silently undo it.

## Conventions

Every test file has a header comment:

```js
// REGRESSION TEST: <short title>
// BUG: <plain-English description of what broke>
// FIXED: <date or PR>
// SYMPTOM: <how a user would notice the bug return>
// CONTRACT: <what the test asserts must remain true>
```

Tests use `node:assert/strict` and run as ES modules. They should be:
- **Fast**: each under 200 ms.
- **Specific**: assert one contract, not five.
- **Pessimistic**: an obvious refactor that breaks the bug-fix must trigger.

## Adding a new test

When fixing a bug:
1. Create `NN-short-name.test.mjs` (NN = next number).
2. Header comment with BUG/FIXED/SYMPTOM/CONTRACT.
3. Add the assertions that prove the bug is gone.
4. Run `npm test`.
5. Commit.

## Running

```sh
npm test                # all regression tests
node tests/regressions/01-archive-shortcut.test.mjs    # one
```
