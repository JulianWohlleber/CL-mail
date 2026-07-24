# mail_ — QA test scenarios

Manual test pass before any release. Work top to bottom; each scenario has a
✅/❌ box, preconditions, steps, and the expected result. Use **demo/throwaway
accounts** — never test destructive actions (trash, move) on a mailbox you care
about.

**Setup once:**
- A throwaway IMAP/SMTP account you can send to/from (e.g. a spare provider).
- A second account (for multi-account / unified-inbox tests).
- Optional: a CalDAV calendar (iCloud app-password or a Nextcloud), and a
  Nextcloud for cloud-upload tests.
- Send yourself: a plain email, one with an attachment (PDF), one with a
  calendar `.ics` invite, and a Calendly-style "New event" notification.

---

## A. Accounts & setup

- [ ] **A1 Add account (happy path).** Settings → Accounts → Add. Enter valid
  IMAP/SMTP + password → **account is added, folders appear, inbox starts syncing.**
- [ ] **A2 Add account (bad password).** Enter a wrong password → **clear error,
  no blank screen, no crash;** you can correct and retry.
- [ ] **A3 Add a second account** → **both appear in the sidebar; each shows its
  own folders.**
- [ ] **A4 Remove account** → **it disappears from sidebar; its threads are gone;
  no orphan errors.**
- [ ] **A5 Password stored in Keychain.** Quit and relaunch → **account still
  syncs without re-entering the password** (proves keychain retrieve works).

## B. Sync, inbox & unified view

- [ ] **B1 Initial sync** populates the inbox with recent mail.
- [ ] **B2 New mail arrives** (send yourself one) → **appears in the list within a
  sync cycle without manual refresh.**
- [ ] **B3 Folder unread counts** match reality; open a thread → **count decrements.**
- [ ] **B4 All Inboxes** (2+ accounts) → sidebar shows **"All Inboxes"** with a
  combined unread count; clicking it lists threads **from both accounts** newest-first.
- [ ] **B5 Account click** in sidebar → **jumps to that account's inbox** and the
  list matches (no visually-selected-but-empty mismatch).

## C. Reading a thread

- [ ] **C1 Open a thread** → reading pane shows sender, recipients, date, body.
- [ ] **C2 Mark-as-read** happens on open (per the delay setting).
- [ ] **C3 Multi-message thread:** only the **newest message is expanded**; older
  ones are one-line previews; **clicking one expands it**, clicking a header collapses.
- [ ] **C4 Attachment shows** as a chip; **Open** opens it; **Save** offers a save
  dialog and writes the file.
- [ ] **C5 First-run hint** appears once in the reading pane; **dismiss it → it
  stays gone** after reopening a thread / relaunch.
- [ ] **C6 Replied indicator:** a thread you've answered shows the **↩ / "Replied"**
  marker; one you haven't does not.

## D. Thread actions (+ server persistence)

- [ ] **D1 Archive** (button or `e`) → thread leaves the inbox; **selection moves to
  the next thread.**
- [ ] **D2 Archive persists on the server.** After archiving, wait one sync cycle
  (or relaunch) → **the thread does NOT reappear in the inbox** (proves the IMAP
  MOVE, not just a local change).
- [ ] **D3 Trash** (`#` / Backspace) → thread moves to Trash folder; persists after sync.
- [ ] **D4 Move to folder** (`m`) → modal opens, search folders, Enter moves;
  **thread appears in the target folder and persists after sync.**
- [ ] **D5 Create folder via move modal:** type a non-existent name → **"Create
  folder …" appears, Enter creates it on the server** and moves the thread;
  the new folder survives a sync (doesn't vanish).
- [ ] **D6 Star / unstar** toggles and persists.
- [ ] **D7 Mark unread** (`u`) → thread shows unread again.
- [ ] **D8 Right-click a thread** → context menu with Open, Mark read/unread, Star,
  Archive, Move, Reply/Reply-all/Forward, Trash; **each action works and the
  reading pane matches the right-clicked thread.**

## E. Multi-select

- [ ] **E1 `Cmd+A`** selects all threads in the folder; a **"N selected" bar** appears.
- [ ] **E2 `Shift+↓/↑`** extends the selection.
- [ ] **E3 Cmd-click** toggles individual threads; **Shift-click** selects a range.
- [ ] **E4 Bulk Archive** on a multi-selection → **all selected threads archive**
  (and persist on the server); selection clears.
- [ ] **E5 Bulk Trash** likewise.
- [ ] **E6 `Esc`** clears the selection.

## F. Shortcuts & keymaps

- [ ] **F1 Archive shortcut works** from the thread list (default `e`; also your
  custom key if set). **This is the one that kept breaking — verify explicitly.**
- [ ] **F2 Search field disables shortcuts:** click the search box and type a word
  starting with a shortcut letter (e.g. "ebay") → **it types into the box, does
  NOT archive.**
- [ ] **F3 Empty-input passthrough:** with nothing focused, `j/k` navigate, `e`
  archives, `c` composes, `?` opens the cheatsheet.
- [ ] **F4 `Cmd+A/C/V/X/Z` inside a text field** (compose body, recipient) do the
  normal text edit, **not** the app shortcut.
- [ ] **F5 Change preset** (Settings → Shortcuts is via keymap presets) — pick
  Apple Mail → **`Cmd+E` archives**; the cheatsheet (`?`) shows the **matching**
  bindings, not superhuman's.
- [ ] **F6 Rebind a shortcut** in the editor → **new key works immediately** (no
  restart), and the old default for that action stops firing.

## G. Search

- [ ] **G1 Live preview:** type a query → dropdown shows matching messages.
- [ ] **G2 Enter filters the list:** press Enter (or "Filter list to all N
  results") → **the main list now shows only matching threads**, with a
  "Search: …" banner.
- [ ] **G3 Click a preview result** → filters the list **and** jumps to that thread.
- [ ] **G4 Operators:** `from:<name>` restricts by sender; `subject:<word>` by
  subject; `has:attachment` shows only threads with attachments; `has:unread`
  only unread. **`to:<name>` returns results (doesn't crash/empty).**
- [ ] **G5 Combined:** `from:alice invoice` works (operator + free text).
- [ ] **G6 Exit search:** "Exit search" or `Esc` → **returns to the previous folder.**
- [ ] **G7 Clearing the box** leaves search-results mode.

## H. Compose & send

- [ ] **H1 New message** (`c`): recipient autocompletes from mail history; send →
  **it arrives; a "Message sent" toast shows; the compose window closes with the
  animation (no long 'Sending…' hang).**
- [ ] **H2 Reply / Reply-all / Forward** pre-fill recipients + subject + quote correctly.
- [ ] **H3 Draft autosave:** type a subject + body, wait ~2s → **"Saved …" pill**
  shows. Close the window (`Esc`/Cmd+W), reopen compose for the same context →
  **the draft is restored.**
- [ ] **H4 Draft cleared on send:** send a message → its autosaved draft is deleted
  (doesn't restore next time).
- [ ] **H5 Undo send** (if delay > 0): send → **undo toast**; click Undo →
  **message is not sent.**
- [ ] **H6 Schedule send:** pick a future time → scheduled; **"Send scheduled" toast.**
- [ ] **H7 Cloud file (if Nextcloud configured):** "+ Cloud file" → pick a file →
  **uploads, and a share link line is inserted into the body.**

## I. Calendar invites

- [ ] **I1 .ics invite, no CalDAV configured:** email with an `.ics` → **"Add to
  Calendar" opens Calendar.app** with the event.
- [ ] **I2 .ics invite, CalDAV configured:** the chip shows **"Accept into
  <calendar>"** + a dropdown; accept → **event lands in the chosen CalDAV
  calendar** (verify in that calendar); chip shows "Added to …".
- [ ] **I3 Calendly email** (no attachment) → the event is **detected from the
  body** and the same accept flow works.
- [ ] **I4 Dropdown picker** lets you choose a different calendar before accepting.

## J. CalDAV account setup

- [ ] **J1 iCloud:** Settings → Calendar → Connect → iCloud → Apple ID +
  app-specific password → **Test connection lists your calendars**; Add → saved.
- [ ] **J2 Nextcloud:** server URL + user + password → **test lists calendars**; add.
- [ ] **J3 Generic CalDAV** (FastMail/Posteo/…) with a principal URL works.
- [ ] **J4 Wrong password** → **clear error, no crash.**
- [ ] **J5 Refresh** re-discovers calendars; **Disconnect** removes the account.

## K. Vault export (Obsidian/Markdown)

- [ ] **K1 Connect a vault folder** (Settings → Vault → select folder).
- [ ] **K2** After a sync, **`{vault}/Mail/` contains `.md` files** with YAML
  frontmatter (title, participants, folder, tags).
- [ ] **K3 Live update:** archive/move/star a thread → its `.md` **updates**
  (folder role / flags change) within a moment.
- [ ] **K4 Disconnect vault** stops the export.

## L. Cloud storage (Nextcloud)

- [ ] **L1 Connect Nextcloud** (server + user + password) → **probe succeeds**, saved.
- [ ] **L2 Upload from compose** (H7) → file appears in the Nextcloud
  `mail_attachments` folder and the **public share link works.**

## M. Settings, privacy & appearance

- [ ] **M1 Theme:** switch light / dark / system → **UI updates immediately**;
  relaunch preserves it.
- [ ] **M2 Privacy tab:** clicking a permission opens the **modal** with the
  System-Settings deep link; toggles persist.
- [ ] **M3 macOS Contacts off by default:** first recipient typing does **not**
  trigger a Contacts permission prompt (unless you enabled it).
- [ ] **M4 Usage stats off by default:** with it off, **no counts recorded**
  (About section stays empty). Turn on → counts appear after actions; **nothing
  leaves the device** (it's local-only).
- [ ] **M5 About** shows the correct version + Electron/Chromium/Node.

## N. Performance & large data

- [ ] **N1 Large folder** (1k+ threads): opening it is responsive; **scrolling loads
  more** ("Loading more…" → "· end ·"), not everything at once.
- [ ] **N2 No flicker:** during background sync the list/sidebar **don't flash** or
  reload visibly; fonts/lines don't disappear.
- [ ] **N3 Stability:** leave the app running through several sync cycles →
  **no hang, no runaway CPU, no crash.**

## O. Edge cases & error paths

- [ ] **O1 Offline:** disconnect network → **no crash;** actions queue or show a
  clear state; reconnect → recovers.
- [ ] **O2 Bad server / timeout** during sync → logged, **app stays responsive.**
- [ ] **O3 Empty states:** an empty folder shows a friendly empty message (Inbox
  Zero, etc.), not a blank pane.
- [ ] **O4 Restart persistence:** quit and relaunch → accounts, folders, read/
  unread, and the selected folder are all **remembered**; the first account's
  inbox is selected and **actually shows its threads** (no phantom selection).
- [ ] **O5 Thread removed mid-view:** if a synced change removes the open thread,
  the reading pane doesn't get stuck "selected but empty."

## P. Quick regression re-checks (the pinned bugs)

Each of these has an automated test, but eyeball them once:

- [ ] **P1** Archive fires from the shortcut AND survives the next sync (F1, D2).
- [ ] **P2** Search field swallows shortcut letters (F2).
- [ ] **P3** `Cmd+A` selects text in inputs, threads in the list (F4, E1).
- [ ] **P4** Move-to-folder creates a server folder that doesn't vanish (D5).
- [ ] **P5** Startup selects the active account's inbox with matching content (O4).
- [ ] **P6** Compose autosave restores after an accidental close (H3).
- [ ] **P7** `to:` search returns results instead of nothing (G4).
- [ ] **P8** SMTP send actually works (H1) — this was the critical keychain bug.

---

### Sign-off

Run `npm test` first (the 20 automated regression tests must pass), then work
this list. Note the date, build version, and any ❌ with a one-line repro.

| Date | Version | Tester | Result |
|------|---------|--------|--------|
|      | 0.1.x   |        | ⬜     |
