# App Store Connect — metadata draft

Copy-paste-ready listing content for mail_. Adjust the voice to taste.

## Identity

- **App name:** `mail_`
- **Subtitle** (30 char max): `Keyboard-first mail, on-device`
- **Bundle ID:** `com.mail.app`
- **Primary category:** Productivity
- **Secondary category:** Utilities
- **Primary language:** English (U.S.)

## Promotional text (170 char, editable anytime)

> A fast, keyboard-first mail client for macOS. Multiple accounts, one unified
> inbox, full-text search, and everything a keystroke away. Your data stays on
> your Mac.

## Description (4000 char max)

> mail_ is a keyboard-first desktop mail client for people who live in their
> inbox and want it to feel like a text editor, not a web app.
>
> **Fast, quiet, keyboard-driven**
> Navigate, archive, search, and compose without leaving the home row. Pick a
> shortcut preset (Superhuman, Gmail, Apple Mail) or remap everything.
>
> **Every account, one inbox**
> Add as many IMAP/SMTP accounts as you like and read them together in a unified
> All-Inboxes view — or one at a time.
>
> **Search that means it**
> Instant full-text search across every account, with filters like from:,
> subject:, and has:attachment.
>
> **Actions that stick**
> Archive, trash, and move happen on the server too, so your other devices stay
> in sync.
>
> **Calendar invites, handled**
> Accept an .ics invitation straight into your iCloud, Nextcloud, or CalDAV
> calendar.
>
> **On-device by design**
> Your mail is stored locally on your Mac. mail_ only ever talks to the mail,
> calendar, and cloud servers you configure — nothing is sent anywhere else.
>
> Also: compose autosave, undo send, schedule send, snooze, per-account
> signatures, light/dark themes, and Markdown export of any thread.

## Keywords (100 char, comma-separated, no spaces)

```
mail,email,imap,smtp,inbox,keyboard,shortcuts,client,unified,search,caldav,productivity
```

## URLs

- **Support URL:** https://github.com/JulianWohlleber/CL-mail/issues
- **Marketing URL:** https://github.com/JulianWohlleber/CL-mail
- **Privacy Policy URL:** *(required — publish one; a short page stating "all
  data is stored on your device; mail_ connects only to the servers you
  configure; no analytics, no third-party data sharing" is sufficient. GitHub
  Pages works.)*

## App Privacy questionnaire (the "nutrition label")

Answer honestly against the actual behavior:

| Question | Answer for mail_ |
|---|---|
| Do you collect data? | **Data is not collected** — *if* usage stats stay off/on-device and nothing is sent to you. mail_ has no analytics backend. |
| Contacts | Not collected (Contacts autocomplete is removed in the MAS build). |
| Email content / user content | Stored **on device only**; transmitted only to the user's own IMAP/SMTP/CalDAV/WebDAV servers. Not collected by you. |
| Identifiers / usage data | The on-device usage counters (Settings → General) never leave the Mac → "not collected". |
| Tracking | **No.** No cross-app tracking, no ad SDKs. |
| Third-party SDKs | None that phone home. |

> If you keep the optional on-device usage counters, they are still "not
> collected" for the label because they never transmit off the device. If you
> ever add real analytics, this section must change.

## Encryption / export compliance

- Uses standard TLS/HTTPS (IMAPS, SMTPS, CalDAV over HTTPS).
- Answer **Yes** to "uses encryption", then it qualifies for the
  **exemption** for standard/HTTPS encryption → no CCATS/export docs.

## App Review notes (free-text to the reviewer)

> mail_ is a native macOS mail client. To review account features without your
> own mailbox, use this demo IMAP account:
>
>  • Provider / IMAP host: <fill in a throwaway account, e.g. a free IMAP
>    provider>
>  • Email: <demo@example.com>
>  • App password: <…>
>  • SMTP host/port: <…>
>
> Add it in Settings → Accounts → Add Account. All data is stored locally; the
> app connects only to the configured mail server.

## Screenshots (required)

Mac App Store needs at least one screenshot; provide a few. Accepted sizes
(pick one aspect and be consistent):

- 1280 × 800, 1440 × 900, 2560 × 1600, or **2880 × 1800** (retina, best).

Shots to capture (use a **demo/redacted account** — no real correspondence):

1. Unified inbox with a thread open (the hero view).
2. Full-text search with an operator (`from:` / `has:attachment`).
3. Compose window with the autosave "Saved" state.
4. Settings → Shortcuts (the customizable keymap).
5. Calendar-invite "Accept into…" on an email.

> The redacted hero already in `docs/assets/hero.png` is a good template for #1.
> Capture the rest the same way — demo data only.
