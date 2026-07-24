# mail_ — native (SwiftUI)

The native macOS rebuild of **mail_**, on the `mac-app-store` branch. It reproduces
the Electron app's exact look — warm-paper / dark theme, iA Writer type, the
three-pane keyboard-first layout — as a pure SwiftUI app that can ship through the
Mac App Store without the Electron sandbox workarounds.

Right now this is the **visual shell**: the full UI, driven by mock data, so the
look can be verified 1:1 against the Electron app before the mail engine is wired in.

## Status

| Layer | State |
|-------|-------|
| Design system (colors, type, tokens) | ✅ ported 1:1 from `src/renderer/src/styles/tokens/*` |
| Three-pane layout (sidebar · list · reading) | ✅ SwiftUI `NavigationSplitView` |
| Sidebar (unified inbox, accounts, folders) | ✅ |
| Thread list (search bar, REPLIED chip, accent bar) | ✅ |
| Reading pane (header actions, message cards, reply bar) | ✅ |
| Mail engine (IMAP/SMTP) | ⬜ planned — MailCore2 |
| Local store + search | ⬜ planned — GRDB.swift (SQLite + FTS5) |
| Calendar | ⬜ planned — EventKit |
| Contacts autocomplete | ⬜ planned — CNContactStore |

## Build

Requires Xcode 15+ and [XcodeGen](https://github.com/yonaskolb/XcodeGen)
(`brew install xcodegen`).

```bash
cd native
xcodegen generate        # writes mail_.xcodeproj from project.yml
open mail_.xcodeproj      # or build headless:
xcodebuild -project mail_.xcodeproj -scheme mail_ -configuration Debug build
```

`mail_.xcodeproj` is generated and git-ignored — regenerate it from `project.yml`,
which is the source of truth for build settings.

## Layout

```
native/
  project.yml                 XcodeGen spec (bundle id, deployment target, Info.plist keys)
  Sources/mailapp/
    App.swift                 @main + ContentView (NavigationSplitView)
    Theme.swift               Palette + Typo — the ported design tokens
    Models.swift              Account / MailFolder / Message / MailThread
    MockData.swift            demo data mirroring the redacted README hero
    SidebarView.swift         unified inbox · accounts · folders
    ThreadListView.swift      search bar + ThreadRow list
    ReadingPaneView.swift     header actions · MessageCard · reply bar
```

## Notes

- Uses **iA Writer Duo S / Mono S** if installed (as the Electron app does), else the
  system font substitutes gracefully.
- `Palette` colors are dynamic (light/dark) via `NSColor` dynamic providers, so the
  whole UI tracks the system appearance — matching the Electron token behaviour.
- Deployment target is macOS 14.0 (SwiftUI `NavigationSplitView` three-column).
