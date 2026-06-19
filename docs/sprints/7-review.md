# Sprint 7 — Code-review report

The planned 7-persona automated review (one agent per teammate, each finding
adversarially verified) was launched but hit the shared session quota mid-run,
so the findings below come from a manual pass standing in for the team. The
review workflow script is preserved and can be re-run after quota reset:
`mail-team-review`.

## Confirmed findings fixed this sprint

| Sev | Area | Finding | Fix |
|-----|------|---------|-----|
| High | UX (reported by user) | Focused search box still fired global shortcuts — a query like "ebay" archived the thread on the first `e`. | Search input opts out via `data-disable-shortcuts`; `useKeyboard` returns early for such inputs. Pinned by test #18. |
| Medium | Dead code (Tom) | `ics-parser.ts`, `CalDavClient.fetchEvents`, `RawEvent`, `toIcsDateUtc` became unreferenced after the calendar-view removal — mail_ only *writes* invites now. | Deleted. |
| Medium | Noise (Sam/Tom) | `useKeyboard` logged on every keystroke (`[Keyboard] key "x" went to input…`, `No binding for key…`, modal-blocked) — console spam in production. | Removed the per-keystroke logs; kept the one real `console.warn` for an action with no handler. |
| — | Release-prep (Maya) | No way for a user to see what build they're on. | About section in Settings → General (version, Electron/Chromium/Node, platform). |
| — | Release-prep (Maya/Tom) | No signal on which features matter. | Opt-in, strictly on-device usage counters (default off, no network sink). |

## Verified NOT issues (false positives the manual pass rejected)

- `decodeXmlEntities` / `randomEventName` looked orphaned alongside the removed
  `fetchEvents`, but they're still used by `discoverCalendars` / `putEvent`.
- `importCalendarEvent` IPC looked redundant after the CalDAV accept flow, but
  it's the deliberate Calendar.app fallback when no CalDAV account is connected.
- The empty-input-fires-shortcut path looked like the search bug, but the real
  fix is a targeted opt-out — the general behavior is still wanted elsewhere.

## Deferred (tracked, not this sprint)

- Google OAuth (mail + calendar) — needs a registered Cloud client.
- RRULE expansion / event editing — out of scope; mail_ is not a calendar app.
- Virtualized thread list — paging (sprint #4) is enough for now.
