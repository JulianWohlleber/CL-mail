# Installing mail_

mail_ ships as an unsigned macOS app (no paid Apple Developer ID). That's fine —
it just means macOS Gatekeeper needs one extra nudge the first time. All three
methods below handle that.

> **Requirements:** macOS on Apple Silicon (M1 or newer). Intel Macs need to
> [build from source](#build-from-source).

---

## Method 1 — DMG (simplest)

1. Download **`mail-space-<version>.dmg`** from the
   [latest release](https://github.com/JulianWohlleber/CL-mail/releases/latest).
2. Open it and drag **mail_** into **Applications**.
3. **First launch:** right-click `mail_` in Applications → **Open** → **Open**
   in the dialog. (A normal double-click shows "can't be opened" because the
   app isn't notarized — right-click → Open is the standard one-time bypass.)

After the first launch it opens normally forever.

---

## Method 2 — install script (handles Gatekeeper for you)

The script copies the app to `/Applications`, strips the quarantine flag, and
launches it — so you skip the right-click dance.

```sh
# 1. Download the .dmg (or .zip) from the latest release into ~/Downloads
# 2. Download install.sh from the release (or the scripts/ folder of the repo)
# 3. Run it — it auto-finds the .dmg/.zip in ~/Downloads:
chmod +x install.sh
./install.sh
```

Or point it at a specific file:

```sh
./install.sh ~/Downloads/mail-space-0.1.8.dmg
```

Uninstall:

```sh
./install.sh --uninstall      # removes /Applications/mail_.app
```

---

## Method 3 — build from source

Needs Node 18+ and Xcode command-line tools.

```sh
git clone https://github.com/JulianWohlleber/CL-mail.git
cd CL-mail
npm install
npm run build:mac             # runs the regression suite, then builds
```

The signed-for-this-machine app and installers land in `dist/`:

- `dist/mac-arm64/mail_.app` — ready to copy to `/Applications`
- `dist/mail-space-<version>.dmg` — the installer
- `dist/mail-space-<version>-arm64.zip` — zipped app

A locally-built app has no quarantine flag, so it launches without the
Gatekeeper prompt.

---

## "mail_ is damaged and can't be opened"

This is Gatekeeper reacting to the quarantine flag on a downloaded unsigned
app — **the app is not actually damaged.** Clear the flag:

```sh
xattr -cr /Applications/mail_.app
open /Applications/mail_.app
```

(The install script does exactly this for you.)

---

## First-run permission prompts

On first sync macOS may ask for **Keychain** access (mail_ stores account
passwords in the system keychain). Choose **Always Allow** so it doesn't ask
again. Contacts and Calendar access are **off by default** and only requested
if you opt in from **Settings → Privacy**.

## Uninstall

```sh
rm -rf /Applications/mail_.app
# optional: remove local data (accounts, cached mail, drafts)
rm -rf "$HOME/Library/Application Support/mail-space"
```
