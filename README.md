<p align="center">
  <img src="https://raw.githubusercontent.com/JulianWohlleber/CL-mail/main/docs/assets/icon.png?v=6" alt="mail_ icon" width="96" height="96">
</p>

<h1 align="center">mail_</h1>

<p align="center">
  A keyboard-first desktop mail client for macOS.<br>
  Electron · React 19 · TypeScript · SQLite.
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/JulianWohlleber/CL-mail/main/docs/assets/hero.png?v=2" alt="mail_ — unified inbox with an open thread" width="880">
</p>

---

A small, fast mail client built around one idea: reading and triaging email
should feel like moving through a text editor, not clicking around a web app.
The interface borrows its restraint from iA Writer and its speed from
Superhuman — warm paper tones, a real type scale, and every action one
keystroke away.

It's a personal project, but built the way I'd build production software:
typed end to end, a clear main/renderer boundary, migrations for every schema
change, and a regression-test suite that blocks the build if a bug I've
already fixed tries to come back.

## What it does

- **Multi-account IMAP/SMTP** with a cross-account **unified inbox**
- **Full-text search** (SQLite FTS5) with `from:` / `subject:` / `has:` operators
- **Keyboard-driven** — customizable shortcuts, four presets (Superhuman, Gmail,
  Mailspring, Apple Mail), multi-select with `Cmd+A` and `Shift+↕`
- **Server-truthful actions** — archive / trash / move issue a real IMAP `MOVE`,
  so changes survive the next sync instead of bouncing back
- **Compose that doesn't lose work** — debounced draft autosave, undo send,
  schedule send, snooze
- **Calendar invites** — accept an `.ics` straight into a chosen CalDAV calendar
  (iCloud, Nextcloud, or generic), with a Calendar.app fallback
- **Obsidian vault export** — threads written out as Markdown with YAML
  frontmatter
- **Large files without the SMTP tax** — upload to Nextcloud from the compose
  window and drop a share link inline
- Light / dark / system themes, per-account signatures, account import from
  Mailspring and Apple Mail

## How it's built

```
src/
  main/         Electron main — IMAP sync, IPC handlers, services
    services/   sync · database (+migrations) · calendar (CalDAV) · vault · credentials
  preload/      the typed window.api bridge (contextIsolation on)
  renderer/     React UI — Zustand stores, Tailwind, iA Writer type
  shared/       types + IPC channel contract shared across processes
tests/
  regressions/  one file per fixed bug; the runner gates the build
```

A few decisions worth calling out:

- **The renderer never touches the network or disk.** Everything crosses a
  single typed `window.api` surface into the main process. IMAP, SMTP, SQLite,
  CalDAV and the keychain all live behind IPC.
- **The server is the source of truth.** Early on, archiving only updated the
  local DB and the next sync happily undid it. Actions now perform the IMAP
  `MOVE` and the local update together.
- **Credentials go through the OS keychain** (`safeStorage`), never plaintext,
  never the renderer.
- **Schema changes are migrations**, numbered and forward-only — twelve so far,
  covering FTS, calendar, drafts, and on-device usage counters.

## Regression discipline

The part I'm most deliberate about. Every bug that gets fixed earns a small
test in [`tests/regressions/`](tests/regressions) that pins the *contract* of
the fix — not the implementation. Each one carries a header explaining the bug,
the symptom a user would see, and what must stay true:

```
// REGRESSION TEST: Active search field disables global shortcuts
// BUG: typing a query starting with a shortcut letter ("ebay") archived
//      the thread instead of typing.
// SYMPTOM: focus search, type e/a/s — the first letter fires an action.
// CONTRACT: the search input opts out of the shortcut passthrough.
```

The runner is wired into `build:mac`, so a build fails the moment a known bug
reappears. Twenty of them and counting — most trace back to a real moment where
something broke and I didn't want it breaking twice.

The releases (`v0.1` → `v0.1.8`) were shipped as themed iterations — visual
polish, onboarding, large-inbox paging, compose autosave, search operators —
each closing with a review pass and, where it earned one, a pinning test. The
notes live in [`docs/sprints/`](docs/sprints).

## Tech

| Layer | Choice |
|-------|--------|
| Runtime | Electron 33 |
| UI | React 19, Zustand, Tailwind, iA Writer fonts |
| Mail | ImapFlow, Nodemailer, mailparser |
| Storage | better-sqlite3 with FTS5; Markdown export |
| Calendar | a small raw-`fetch` CalDAV client (no extra native deps) |
| Build | electron-vite + electron-builder |

## Run it

```sh
npm install
npm run dev          # electron-vite dev with HMR
npm run lint         # tsc --noEmit
npm test             # regression suite
npm run build:mac    # signed-optional .dmg + .zip
```

Installing the built app on a fresh Mac: see **[INSTALL.md](INSTALL.md)**.
Version history: **[CHANGELOG.md](CHANGELOG.md)**.

## Status & license

A personal project under active, occasional development — not affiliated with
any provider. Unsigned builds (no paid Apple Developer ID), so first launch
needs a right-click → Open. MIT licensed.
