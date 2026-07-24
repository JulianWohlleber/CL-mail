# Shipping mail_ to the App Store

Read this before spending money on anything. Two facts up front, then the plan.

## Two hard truths

### 1. This is a Mac App Store question, not an iOS one
mail_ is an **Electron desktop app**. Electron runs on macOS/Windows/Linux — it
**does not run on iOS**. There is no way to put this codebase on the iPhone/iPad
App Store; that would be a full native rewrite (SwiftUI or React Native from
scratch), reusing basically only the visual design. So "App Store" here means the
**Mac App Store (MAS)**.

### 2. The Mac App Store forces the App Sandbox — and several features break in it
MAS apps must run inside Apple's **App Sandbox**. A few things mail_ does today
are outright forbidden there and would get the build **rejected or crash on use**.
They must be removed or reworked for the MAS build (details in the audit below).

Because of that, seriously consider the alternative first:

| | **Notarized direct download** (Developer ID) | **Mac App Store** |
|---|---|---|
| Sandbox required | No | **Yes** |
| Keeps ALL current features | **Yes** | No — must cut/rework 3 (see audit) |
| Removes "app is damaged / right-click-open" | **Yes** | Yes |
| Distribution | Your own site / GitHub Releases | Apple's store |
| Cost | $99/yr Developer Program | $99/yr + 15–30% of any revenue |
| Review | Notarization only (automated, minutes) | Human review (days), stricter |
| Auto-update | You wire it (electron-updater) | Apple handles it |
| Effort from here | **Low** — add cert + `notarize: true` | **High** — sandbox rework + review |

**Recommendation:** if the goal is "make it installable without the scary
Gatekeeper warning," **notarized direct distribution** gets you there in an
afternoon and keeps every feature. Go MAS only if being *in the store* (search,
trust, one-click install, auto-update) is worth cutting features and the review
overhead. This doc covers **both** — the notarized path is short; the MAS path
is the bulk.

---

## Path A — Notarized direct download (recommended, low effort)

Keeps all features, no sandbox. What you need:

1. **Apple Developer Program** membership ($99/yr).
2. A **"Developer ID Application"** certificate (Xcode → Settings → Accounts →
   Manage Certificates, or developer.apple.com).
3. An **app-specific password** (appleid.apple.com) or Notary API key for
   `notarytool`.

Then flip the build config:

```yaml
# electron-builder.yml → mac:
  notarize: true
```

and provide credentials to electron-builder (env vars):

```sh
export APPLE_ID="you@example.com"
export APPLE_APP_SPECIFIC_PASSWORD="abcd-efgh-ijkl-mnop"
export APPLE_TEAM_ID="YOURTEAMID"
npm run build:mac        # now signs with Developer ID + notarizes + staples
```

The current `resources/entitlements.mac.plist` already has the right hardened-
runtime + network entitlements. Result: a `.dmg` that installs with a normal
double-click, no "damaged" warning. Done.

---

## Path B — Mac App Store

### Sandbox audit — what breaks and what to do

Grounded in the actual code (`src/main/**`). ✅ = works in the sandbox, ⚠️ = needs
work, ❌ = forbidden, must be removed/gated out of the MAS build.

| Feature | Code | Sandbox verdict | Action for MAS |
|---|---|---|---|
| IMAP/SMTP sync & send | `services/sync`, `services/send` | ✅ `network.client` | none |
| SQLite DB + FTS search | `services/database` (in `userData`) | ✅ container write | none |
| Attachment download to userData | `imap-client.ts` | ✅ container write | none |
| Keychain passwords | `credentials/keychain.ts` (`safeStorage`) | ✅ | keep app-group entitlement |
| CalDAV invite accept | `services/calendar` (fetch) | ✅ `network.client` | none |
| Nextcloud/WebDAV upload | `ipc/cloud-storage.ipc.ts` (fetch) | ✅ `network.client` | none |
| Open URL in browser | `shell.openExternal` | ✅ | none |
| Save attachment (dialog) | `ATTACHMENT_SAVE` | ✅ via powerbox | none |
| Open attachment / open .ics | `shell.openPath` on userData/tmp file | ⚠️ | opening user-created files is allowed, but auto-launching Calendar.app with a generated temp `.ics` is fragile — prefer "Save .ics…" via a save panel, or the CalDAV accept flow |
| **Vault export** to a folder | `services/vault/vault-sync.ts` writes to `account.vault_path` | ❌ writing an arbitrary stored path is blocked | rework to **security-scoped bookmarks**: user picks the folder in an open panel, persist the bookmark, resolve + `startAccessingSecurityScopedResource` before each write. Otherwise gate the whole vault feature out of the MAS build |
| **Apple Mail / Mailspring import** | `accounts.ipc.ts` reads `~/Library/Mail`, `~/Library/Accounts/Accounts4.sqlite`, runs `plutil`/`execSync` | ❌ reading other apps' data + spawning child processes are both forbidden | **remove** from the MAS build |
| **macOS Contacts autocomplete** | `contacts.ipc.ts` runs `osascript` to script Contacts.app | ⚠️ the *osascript* approach is blocked, but Contacts itself is allowed | **replace osascript with the native Contacts framework** (`CNContactStore`) via a Node native addon (e.g. `node-mac-contacts`) + the `com.apple.security.personal-information.addressbook` entitlement + an `NSContactsUsageDescription` string. Then it keeps working in the MAS build with the standard system permission prompt. (Or just remove it — history-based suggestions still work.) |

**Net:** the core mail client is sandbox-clean. Three features must go or be
reworked: Apple Mail/Mailspring import (remove), Contacts autocomplete (remove),
vault export (rework to bookmarks, or remove).

> The cleanest way to do this without losing the features from the notarized
> build is a compile-time flag, e.g. `process.env.MAS_BUILD`, that skips
> registering `registerContactHandlers`, the import IPC, and the vault sync when
> set — and pass it in the `mas` build script. Ask and I'll wire it.

### Prerequisites (you must obtain these — I can't)

- [ ] **Apple Developer Program** membership ($99/yr), Team ID noted.
- [ ] Certificates: **Apple Distribution** and **Mac Installer Distribution**
      (older accounts: "3rd Party Mac Developer Application" + "…Installer").
- [ ] **App ID** `com.mail.app` registered at developer.apple.com with
      capabilities: **App Sandbox**, **App Groups** (`TEAMID.com.mail.app`),
      **Keychain Sharing** if used.
- [ ] A **Mac App Store provisioning profile** for that App ID → save as
      `resources/embedded.provisionprofile`.
- [ ] An **App Store Connect** app record (name "mail_", bundle id `com.mail.app`,
      SKU, primary language).
- [ ] A **privacy policy URL** (required for any app that handles account data).

### Config already prepared in this repo

- `resources/entitlements.mas.plist` — sandbox + network client + user-selected
  files + app group. **Replace `TEAMID`** with your Team ID.
- `resources/entitlements.mas.inherit.plist` — helper-process inheritance.
- `electron-builder.yml` → `mas` and `masDev` targets wired.

### Build & upload

```sh
# 1. gate out the sandbox-incompatible features (see the flag note above)
# 2. local development MAS build to smoke-test on your own Mac:
npx electron-builder --mac masDev
# 3. store build (signed with Apple Distribution + installer cert):
npx electron-builder --mac mas
# 4. upload the resulting .pkg with Transporter.app (App Store) or:
xcrun altool --upload-app -f "dist/mas/mail_-0.1.8.pkg" \
  -u "you@example.com" -p "@keychain:AC_PASSWORD"
```

Then in **App Store Connect**: attach the build, fill metadata (see
`docs/appstore-metadata.md`), add screenshots, answer the privacy questionnaire,
submit for review.

### Review-risk notes (mail clients specifically)

- **Minimum functionality / not a web wrapper.** mail_ is a real native-shell
  client with local storage and offline data — fine, but the reviewer must be
  able to *use* it. Provide a **working demo IMAP account** in App Review notes
  (host, user, app-password) so they don't need their own.
- **Sign-in must not dead-end.** Adding an account must succeed or fail
  gracefully; no blank screens on bad credentials.
- **No private API / no reading other apps' data** — that's why import & Contacts
  scripting must be removed.
- **Accurate privacy labels** — declare exactly what's collected. mail_ stores
  everything **on-device**; the only network egress is to the mail/CalDAV/cloud
  servers the *user* configures. Nothing goes to you. Say that.
- **Encryption compliance:** uses HTTPS/TLS → answer "Yes" to encryption, then
  it qualifies for the standard exemption (no export docs needed).

---

## Path C — native rewrite (Swift / SwiftUI)

The same *look* is fully reproducible natively (iA Writer fonts, the paper
tokens, the three-pane layout, mono metadata). But this is a **from-scratch
rebuild**, not a port — React → SwiftUI and Node → Swift share no code.

**What carries over:** the design, the product/UX decisions, the QA plan, the
architecture lessons. **What gets rewritten:** essentially all code.

**Native building blocks (all first-party or mature):**

| Concern | Electron today | Native replacement |
|---|---|---|
| UI | React + Tailwind | SwiftUI (+ AppKit where needed) |
| IMAP/SMTP | ImapFlow / Nodemailer | **MailCore2** (mature ObjC/C lib) |
| DB + search | better-sqlite3 + FTS5 | **GRDB.swift** (SQLite + FTS5) |
| Calendar | hand-rolled CalDAV | **EventKit** (native, easier + better) |
| Contacts | osascript (blocked) | **CNContactStore** (native, allowed) |
| Keychain | Electron safeStorage | **Keychain Services** |
| Cloud/WebDAV | fetch | URLSession |

**Trade-offs:**

- ✅ Cleanest App Store citizen; native permissions for Contacts/Calendar just work.
- ✅ ~a few MB instead of Electron's ~150 MB; better memory/battery/perf.
- ✅ **The only path that can ever reach the iPhone/iPad App Store** — a shared
  SwiftUI codebase can target iOS/iPadOS. Electron never can.
- ❌ Weeks–months of work; you re-implement everything (though not re-*design* it).

**Pick native if** you want true native quality and/or a real iOS future. **Pick
Electron + MAS if** you just want *this* Mac app in the store with the least work.

---

## Where things stand

**Code side — done ✅**

- Entitlements (`resources/entitlements.mas*.plist`) incl. the Contacts
  entitlement, and `mas`/`masDev` build targets.
- `__MAS_BUILD__` build flag (electron-vite) with `npm run build:mas` /
  `build:mas-dev` scripts.
- **Apple Mail / Mailspring import** — gated out of the MAS build (returns a
  clear "unavailable in the App Store" message; the button is hidden).
- **Contacts autocomplete** — now uses the **native Contacts framework**
  (`node-mac-contacts` → `CNContactStore`) in the MAS build; osascript remains
  only in the Developer-ID build. `NSContactsUsageDescription` added.
- **Vault export** — writes go through **security-scoped bookmarks** in the MAS
  build (`withVaultAccess`); the folder picker stores the bookmark.
- Regression test #21 pins all of the above so it can't silently un-gate.

**You still need (can't be done from code):**

- ⬜ Developer Program, certs (Apple Distribution + Mac Installer Distribution),
  App ID `com.mail.app` with App Sandbox + App Groups + Contacts, a MAS
  provisioning profile → `resources/embedded.provisionprofile`.
- ⬜ Replace `TEAMID` in `resources/entitlements.mas.plist` with your Team ID.
- ⬜ App Store Connect record + privacy policy URL.
- ⬜ Metadata + screenshots (draft in `docs/appstore-metadata.md`).
- ⬜ `electron-rebuild` will compile `node-mac-contacts` for Electron's ABI in
  your build env (postinstall already runs `install-app-deps`).

Then: `npm run build:mas` → upload the `.pkg` via Transporter → submit.
