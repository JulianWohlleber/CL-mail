# Mail Space User Guide

A keyboard-first desktop mail client inspired by Superhuman, with iA Writer's clean design.

---

## Getting Started

### Adding an Account
1. On first launch, the Welcome Screen guides you through account setup
2. Enter your email and password — common providers (Gmail, Outlook, Strato, etc.) are auto-detected
3. Click "Test Connection" to verify, then "Add Account"
4. To add more accounts later: **Settings > Accounts > + Add Account**

### The Interface
Mail Space uses a three-pane layout:
- **Left sidebar** — folders and accounts
- **Center** — mail list (threads)
- **Right** — reading pane (selected conversation)

---

## Superhuman Features

### 1. Keyboard-First Navigation
Navigate your entire inbox without touching the mouse.

| Key | Action |
|-----|--------|
| `J` or `↓` | Move down in mail list |
| `K` or `↑` | Move up in mail list |
| `Enter` | Open conversation |
| `Escape` | Go back / close |

**Folder navigation (sequences):**

| Key sequence | Action |
|-----|--------|
| `G` then `I` | Go to Inbox |
| `G` then `S` | Go to Sent |
| `G` then `D` | Go to Drafts |
| `G` then `A` | Go to Archive |
| `G` then `T` | Go to Trash |
| `G` then `R` | Go to Starred |

### 2. Instant Actions
Act on emails instantly with single-key shortcuts:

| Key | Action |
|-----|--------|
| `E` | Archive — removes from inbox, moves to Archive |
| `#` | Trash — moves to Trash |
| `S` | Toggle Star |
| `Shift+I` | Mark as Read |
| `Shift+U` | Mark as Unread |

After archiving or trashing, Mail Space auto-advances to the next conversation (like Superhuman).

### 3. Command Palette (`⌘K`)
Press `⌘K` to open the command palette. Search and execute any action:
- Navigate to folders
- Compose new message
- Toggle theme
- Open settings
- Archive, trash, star...

### 4. Undo Send
After sending an email, a toast appears for 5 seconds. Click **Undo** to cancel the send before it goes out. Configure the delay in **Settings > General > Undo send delay** (0–30 seconds).

### 5. Snooze (`H`)
Press `H` on any conversation to snooze it. Choose when it should return:
- Later today
- Tomorrow morning/afternoon
- Next week
- Custom date/time

Snoozed conversations disappear from your inbox and reappear at the chosen time.

### 6. Scheduled Send
In the compose window, click the **▾** dropdown next to Send to schedule:
- Tomorrow morning (9:00 AM)
- Tomorrow afternoon (2:00 PM)
- Monday morning (9:00 AM)
- Custom date and time

### 7. Follow-Up Reminders
When reading a conversation, click the **clock icon** in the header to set a reminder:
- "Remind me if no reply in 1 hour / 2 hours / tomorrow / 1 week..."
- Mail Space will bring the conversation back to your attention if you haven't received a reply.

### 8. Focus Mode (`⌘⇧F`)
Hides the sidebar for distraction-free reading and triage. Toggle with `⌘⇧F`.

### 9. Quick Reply Bar
At the bottom of every conversation: **Reply**, **Reply All**, and **Forward** buttons. Or use keyboard shortcuts:

| Key | Action |
|-----|--------|
| `R` | Reply |
| `Shift+R` | Reply All |
| `F` | Forward |
| `C` | New message |
| `⌘Enter` | Send |

### 10. Customizable Keyboard Shortcuts
Press `?` to open the shortcuts editor. Click any shortcut to record a new key binding. Custom bindings are highlighted in blue. Hover over a custom binding and click "reset" to restore the default.

---

## View Controls

| Key | Action |
|-----|--------|
| `⌘\` | Toggle sidebar |
| `⌘,` | Open Settings |
| `/` | Focus search |
| `?` | Keyboard shortcuts |

---

## Search
Press `/` to focus the search bar. Mail Space uses full-text search (SQLite FTS5) across:
- Subject lines
- Email body text
- Sender names and addresses

Results appear instantly as you type.

---

## Settings (`⌘,`)

### General
- **Undo send delay** — 0 to 30 seconds
- **Notifications** — enable/disable new mail notifications
- **Mark as read delay** — how quickly opened emails are marked read

### Accounts
- Add, remove, and manage email accounts
- Auto-detects IMAP/SMTP settings for major providers

### Shortcuts
- Opens the keyboard shortcuts editor
- Click any shortcut to rebind it

### Appearance
- **Theme** — Light / Dark / System
- **Compact list** — tighter spacing in mail list
- **Reading pane position** — Right / Bottom / Hidden

---

## Tips
- **Archive aggressively** — press `E` to keep your inbox clean. Everything is searchable in Archive.
- **Use keyboard sequences** — `G I` to jump to inbox is faster than clicking.
- **Schedule sends** — write emails now, send them at the perfect time.
- **Set reminders** — never forget to follow up on important threads.
