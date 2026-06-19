// REGRESSION TEST: SMTP auth decrypts the password via the keychain
// BUG: getSmtpClient read the password straight from the settings table
//      (account_password_*). KeychainService.store writes base64 CIPHERTEXT
//      there when Electron safeStorage is available (the normal case), so SMTP
//      authenticated with ciphertext → all outbound mail failed. IMAP was fine
//      because it used keychain.retrieve(), which decrypts.
// FIXED: 2026-06 (sprint #7 review, v0.1.8) — CRITICAL finding (David)
// SYMPTOM: Sending any mail fails with an auth error, while receiving works.
// CONTRACT: getSmtpClient must obtain the password via KeychainService, and
//   must NOT read account_password_* rows from the settings table directly.
import { strict as assert } from 'node:assert'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const src = readFileSync(join(root, 'src/main/ipc/mail.ipc.ts'), 'utf-8')

// The SMTP path must go through the keychain.
assert.match(
  src,
  /getSmtpClient[\s\S]{0,1000}keychain\.retrieve\(/,
  "getSmtpClient no longer retrieves the password via the keychain — it will " +
  "authenticate SMTP with base64 ciphertext and all outbound mail will fail."
)

// And must NOT read the encrypted settings row directly for the password.
assert.doesNotMatch(
  src,
  /getSmtpClient[\s\S]{0,1000}account_password_/,
  "getSmtpClient is reading account_password_* directly from settings again — " +
  "that value is ciphertext, not the real password."
)

console.log('ok')
