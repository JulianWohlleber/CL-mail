# Mailspring → mail_ Parity Audit

Updated: 2026-05

## Already in mail_

| Feature | Status |
|---|---|
| Multi-account IMAP/SMTP | ✓ |
| Threading | ✓ |
| Search (FTS5) | ✓ |
| Send Later / Schedule | ✓ |
| Undo Send | ✓ |
| Snooze | ✓ (basic) |
| Move-to-folder modal (M) | ✓ |
| Multi-select with bulk archive/trash | ✓ |
| Templates | ✓ (basic) |
| Signatures (per-account) | ✓ |
| Themes (light/dark/system) | ✓ |
| Customizable shortcuts | ✓ |
| Right-click context menu | ✓ |
| All-inboxes unified view | ✓ |
| Vault export (markdown) | ✓ (mail_ exclusive) |
| Calendar invite (.ics) import | ✓ |
| Calendly event extraction | ✓ (mail_ exclusive) |
| Reply indicator on threads | ✓ (mail_ exclusive) |

## Missing vs. Mailspring (in rough priority)

| Feature | Notes / status |
|---|---|
| **CalDAV calendar (iCloud/Nextcloud)** | Now in progress — initial CalDAV client landing this session. |
| **Google account (OAuth2)** | Needs registered Google Cloud project. Structure landing; OAuth handshake TBD. |
| **Read receipts / link tracking** | Paid in Mailspring; we deliberately don't have it. |
| **Quick reply templates with `{{var}}`** | Have templates, missing variable substitution + popover trigger. |
| **Mail merge** | Mailspring paid feature; out of scope. |
| **Per-account default identity** | Sort-of via account.email; could add per-recipient picker. |
| **Activity tracking (open/click)** | Out of scope. |
| **Plugin system** | Out of scope (Electron security concerns). |
| **Translate inline** | Could integrate with Ollama / DeepL. |
| **Drag-and-drop attachments into compose** | Partial — needs verification. |
| **Drag emails between folders** | Currently only via `M` modal. |
| **Print** | Default Electron `Cmd+P` works for the open mail page. |
| **Apple Mail-style keymap preset** | We have superhuman / mailspring / gmail; could add `apple-mail`. |
| **Backspace = archive (configurable)** | Currently fixed to trash; could be a setting. |
| **Page Up/Down navigation** | Missing; would map to navigate.down × pageSize. |
| **Show count in macOS dock badge** | Missing; needs `app.setBadgeCount()`. |
| **Native macOS notifications with reply action** | We send notifications; missing inline-reply action button. |

## Roadmap (post-this-session)

1. **Google OAuth** — needs a `client_id`/`client_secret` from a Google Cloud project. The UI is structured to accept these; the OAuth handshake itself stays a TODO until creds exist.
2. **Cloud upload (Nextcloud + Google Drive)** — settings landed, actual WebDAV PUT + share-link API call still to wire.
3. **Page-Up/Down, badge count, apple-mail keymap** — quick wins, half a day each.
