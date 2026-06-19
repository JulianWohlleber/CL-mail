# Sprint 7 — Code-review report

The 7-persona automated review ran in full (70 agents, 62 raw findings). All
seven reviewers completed; the adversarial-verification stage confirmed 10
findings before hitting the shared session quota. The confirmed set below is
from the verified findings (David + Felix verifiers completed; Maya/Priya/Tom/
Sam/Lena verifiers were cut off by quota — their raw findings remain in the run
log for a follow-up pass). Workflow: `mail-team-review`.

## Confirmed findings — status

| # | Sev | Area | Finding | Status |
|---|-----|------|---------|--------|
| 1 | **Critical** | bug (David) | SMTP auth used the encrypted ciphertext as the password (read `account_password_*` from settings directly instead of `keychain.retrieve()`) → all outbound mail failed on any machine with Electron safeStorage. | **Fixed** — routed `getSmtpClient` through `KeychainService`. Test #19. |
| 2 | High | bug (David) | `to:` search operator emitted `to_list:term*`, a filter against an FTS column that doesn't exist → any `to:` query threw and returned nothing. | **Fixed** — `to:` now pushes a plain FTS term. Test #20. |
| 3 | High | visual (Felix) | Tutorial modal hardcoded every color/size → broke in dark mode. | **Fixed by removal** — the Tutorial was redundant with sprint-2's `FirstRunHint` and was still wired by oversight; removed entirely. |
| 4 | High | visual (Felix) | Error red `#c0392b` hardcoded in 5 files. | **Fixed** — swept to `var(--danger)`. |
| 5 | High | visual (Felix) | 60+ inline px font-sizes bypass the `--font-size-*` scale. | **Deferred** — large mechanical sweep; tracked, not a bug. Risk/reward says do it as its own focused PR. |
| 6 | Medium | visual (Felix) | Modal scrim opacity inconsistent (0.25/0.30/0.35/0.50). | **Partially addressed** — the worst offender (0.50 Tutorial) is gone; remaining overlays use 0.25–0.35. Tracked for a scrim token. |
| 7 | Medium | visual (Felix) | Star highlight `#F1C40F` hardcoded. | **Fixed** — new `--star` token; reading-pane + thread-item use it. (The avatar-palette hex of the same value is a distinct use and stays literal.) |
| 8 | Medium | visual (Felix) | Email body card `#ffffff` hardcoded. | **Fixed** — new `--email-canvas` token (intentionally light in both themes since email HTML assumes white). |
| 9 | Medium | a11y (Felix) | No focus trap in modals. | **Deferred** — baseline focus ring shipped in sprint #1; a proper trap is a follow-up. |
| 10 | Low | a11y (Felix) | Tutorial button focus order reversed. | **Moot** — Tutorial removed (see #3). |

## Verified NOT issues (rejected by the manual cross-check)

- `decodeXmlEntities` / `randomEventName` are still used by `discoverCalendars`
  / `putEvent` — not orphaned.
- `importCalendarEvent` IPC is the deliberate Calendar.app fallback.

## Deferred, tracked

- #5 font-size token sweep · #6 scrim token · #9 modal focus-trap.
- Re-run the verification stage for the Maya/Priya/Tom/Sam/Lena raw findings
  after quota reset (they completed review but not verify).
