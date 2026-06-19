# Changelog

All notable changes to mail_. Versions follow the sprint cadence; each release
is tagged in git.

## v0.1.8 — Sprint 7 review fixes

Confirmed findings from the 7-persona adversarial code review (70 agents,
62 raw findings, 10 verified). See `docs/sprints/7-review.md`.

- **Critical:** SMTP authenticated with base64 ciphertext — `getSmtpClient`
  read the encrypted password row directly instead of decrypting via the
  keychain, breaking all outbound mail on machines with Electron safeStorage.
  Now routed through `KeychainService`.
- **High:** `to:` search operator referenced a non-existent FTS column,
  crashing any `to:` query. Now pushes a plain FTS term.
- Removed the redundant Tutorial modal (superseded by the first-run hint; its
  hardcoded colours broke dark mode).
- Token sweep: `--danger`, `--star`, `--email-canvas` replace hardcoded hex.

## v0.1.7 — Release-prep + team review

- About surface in Settings (version, Electron/Chromium/Node).
- Opt-in, strictly on-device usage counters (default off, no network sink).
- Search field disables global shortcuts while focused.
- Dead-code removal after the calendar-view scope change.

## v0.1.6 — Search filter operators

- `from:` / `to:` / `subject:` / `has:` / `is:` operators parsed into FTS +
  structured filters, with an operator cheatsheet under the search box.

## v0.1.5 — Compose draft autosave

- `local_drafts` table, 1.2s debounced autosave, "Saved · Ns ago" pill,
  restore-on-open, delete-on-send.

## v0.1.4 — Paged thread list

- 100-thread pages with IntersectionObserver infinite scroll for large folders.

## v0.1.3 — Apple Mail preset + truthful cheatsheet

- New `apple-mail` keymap; the shortcuts panel reads the active preset instead
  of hard-coding superhuman.

## v0.1.2 — First-run hint

- Inline dismissable shortcut hint in the reading pane.

## v0.1.1 — Visual polish + a11y

- `--accent-ring` token and global `:focus-visible` ring; sidebar hover motion.

## v0.1 — Initial release

- Multi-account IMAP/SMTP, FTS5 search, unified inbox, customizable shortcuts,
  multi-select, right-click actions, server-side archive/trash/move, CalDAV
  invite acceptance, Calendly detection, vault markdown export, Nextcloud
  cloud-upload, Mailspring/Apple Mail import, regression-test suite.
