// Build-time flag injected by electron-vite (see electron.vite.config.ts).
// true in the Mac App Store build, false otherwise. Used to tree-shake
// sandbox-incompatible code paths (Apple Mail/Mailspring import, osascript
// Contacts) out of the MAS bundle.
declare const __MAS_BUILD__: boolean
