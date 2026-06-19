# mail_

A keyboard-first desktop mail client inspired by Superhuman and iA Writer.
Built with Electron, React 19, TypeScript and a healthy distrust of bloat.

## Install

macOS on Apple Silicon. Download **`mail-space-<version>.dmg`** from the
[latest release](https://github.com/JulianWohlleber/CL-mail/releases/latest),
open it, and drag **mail_** into Applications. On first launch, right-click the
app → **Open** (it's unsigned, so a plain double-click is blocked once).

Prefer a script that handles the Gatekeeper step for you, or building from
source? See **[INSTALL.md](INSTALL.md)**.

## What it does

- Multi-account IMAP / SMTP with full-text search (SQLite FTS5)
- Cross-account unified "All Inboxes" view
- Customizable keyboard shortcuts with multiple keymap presets
  (superhuman, gmail, mailspring)
- Multi-select with `Cmd+A` and `Shift+↓/↑`
- Right-click context menu with every thread action
- Server-side archive / trash / move via real IMAP `MOVE`
- Folder creation on the IMAP server from the move-to-folder modal
- Calendar invite (`.ics`) acceptance into CalDAV calendars
  (iCloud, Nextcloud, generic CalDAV)
- Calendly-style event detection straight from email bodies
- Vault export to Obsidian-style markdown with YAML frontmatter
- Nextcloud cloud-upload from the compose window (large files → share link)
- Mailspring / Apple Mail account import helpers
- Per-account signatures, schedule send, undo send, snooze, templates

## Tech

- **Main:** electron 33, better-sqlite3, imapflow, mailparser, nodemailer
- **Renderer:** React 19, Zustand, Tailwind, iA Writer fonts
- **Storage:** SQLite with FTS5; per-account markdown export to a vault folder
- **Calendar:** raw-fetch CalDAV client (no extra native deps)
- **Build:** electron-vite + electron-builder

## Project layout

```
src/
  main/           Electron main process: IMAP sync, IPC, services
  preload/        Exposed window.api surface
  renderer/       React UI
  shared/         Types + constants shared across processes
tests/
  regressions/    Bug-pinning tests that block the build if they fail
docs/             Audit + planning docs
```

## Development

```sh
npm install
npm run dev           # electron-vite dev mode with HMR
npm run lint          # tsc --noEmit
npm test              # regression tests
npm run build:mac     # production .dmg + .zip into dist/
```

## Regression-test discipline

Every recurring bug gets pinned by a small test in `tests/regressions/`. The
runner is wired into `build:mac` — if a known bug returns, the build fails.
See `tests/regressions/README.md` for the conventions.

## License

MIT
