#!/usr/bin/env bash
#
# mail_ installer for macOS (Apple Silicon).
#
# mail_ is distributed unsigned (no paid Apple Developer ID), so a freshly
# downloaded build carries a quarantine flag that makes Gatekeeper refuse to
# open it ("mail_ is damaged and can't be opened"). This script installs the
# app into /Applications and strips that flag so it launches cleanly.
#
# Usage:
#   ./install.sh                     # auto-find a .dmg/.zip next to this script,
#                                    #   in the current dir, or in ~/Downloads
#   ./install.sh path/to/mail_.dmg   # install from an explicit .dmg or .zip
#   ./install.sh --uninstall         # remove /Applications/mail_.app
#
set -euo pipefail

APP_NAME="mail_.app"
DEST="/Applications/${APP_NAME}"

red()   { printf '\033[31m%s\033[0m\n' "$*"; }
green() { printf '\033[32m%s\033[0m\n' "$*"; }
dim()   { printf '\033[2m%s\033[0m\n' "$*"; }

require_macos() {
  if [[ "$(uname)" != "Darwin" ]]; then
    red "mail_ only runs on macOS."; exit 1
  fi
  if [[ "$(uname -m)" != "arm64" ]]; then
    red "These builds are Apple Silicon (arm64) only. Build from source for Intel:"
    dim "  npm install && npm run build:mac"
    exit 1
  fi
}

uninstall() {
  if [[ -d "$DEST" ]]; then
    rm -rf "$DEST"
    green "Removed $DEST"
  else
    dim "Nothing to remove — $DEST is not installed."
  fi
  exit 0
}

# Locate an installable artifact: explicit arg, else first match in this script's
# dir, the current dir, or ~/Downloads (newest wins).
find_artifact() {
  local explicit="${1:-}"
  if [[ -n "$explicit" ]]; then
    [[ -e "$explicit" ]] || { red "Not found: $explicit"; exit 1; }
    echo "$explicit"; return
  fi
  local here; here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  local candidate
  candidate="$(ls -t \
    "$here"/mail*-*.dmg "$here"/mail*-*.zip \
    ./mail*-*.dmg ./mail*-*.zip \
    "$HOME/Downloads"/mail*-*.dmg "$HOME/Downloads"/mail*-*.zip \
    2>/dev/null | head -n1 || true)"
  if [[ -z "$candidate" ]]; then
    red "No mail_ .dmg or .zip found."
    dim "Download the latest from the GitHub release, then run this script again,"
    dim "or pass the path explicitly:  ./install.sh ~/Downloads/mail-space-0.1.8.dmg"
    exit 1
  fi
  echo "$candidate"
}

install_from_zip() {
  local zip="$1" tmp
  tmp="$(mktemp -d)"
  dim "Unzipping…"
  ditto -x -k "$zip" "$tmp"
  local app
  app="$(find "$tmp" -maxdepth 2 -name "$APP_NAME" -type d | head -n1)"
  [[ -n "$app" ]] || { red "No $APP_NAME inside the zip."; exit 1; }
  rm -rf "$DEST"
  ditto "$app" "$DEST"
  rm -rf "$tmp"
}

install_from_dmg() {
  local dmg="$1" mount
  dim "Mounting $dmg…"
  mount="$(hdiutil attach -nobrowse -noverify -readonly "$dmg" | grep -o '/Volumes/.*' | head -n1)"
  [[ -n "$mount" ]] || { red "Could not mount the dmg."; exit 1; }
  local app="$mount/$APP_NAME"
  if [[ ! -d "$app" ]]; then
    hdiutil detach "$mount" >/dev/null 2>&1 || true
    red "No $APP_NAME inside the dmg."; exit 1
  fi
  rm -rf "$DEST"
  ditto "$app" "$DEST"
  hdiutil detach "$mount" >/dev/null 2>&1 || true
}

main() {
  case "${1:-}" in
    --uninstall|-u) require_macos; uninstall ;;
    --help|-h)
      sed -n '2,15p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
      exit 0 ;;
  esac

  require_macos
  local artifact; artifact="$(find_artifact "${1:-}")"
  green "Installing mail_ from: $artifact"

  case "$artifact" in
    *.zip) install_from_zip "$artifact" ;;
    *.dmg) install_from_dmg "$artifact" ;;
    *) red "Unsupported file: $artifact (need .dmg or .zip)"; exit 1 ;;
  esac

  # The crucial bit for an unsigned app: clear the quarantine flag so Gatekeeper
  # doesn't refuse to open it. (Equivalent to right-click → Open the first time.)
  dim "Clearing Gatekeeper quarantine…"
  xattr -cr "$DEST" 2>/dev/null || true

  green "Installed → $DEST"
  dim "Launching…"
  open "$DEST"
  green "Done. mail_ is in your Applications folder and running."
}

main "$@"
