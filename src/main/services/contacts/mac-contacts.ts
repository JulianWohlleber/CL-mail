import { exec } from 'child_process'

export interface MacContact {
  name: string
  address: string
}

/**
 * Query macOS Contacts. Two backends:
 *
 *  • App Store build (__MAS_BUILD__): the NATIVE Contacts framework via the
 *    `node-mac-contacts` addon (wraps CNContactStore). This is the ONLY
 *    App-Store-allowed path — it needs the `com.apple.security.personal-
 *    information.addressbook` entitlement + an NSContactsUsageDescription and
 *    triggers the standard system permission prompt. osascript is forbidden in
 *    the sandbox.
 *
 *  • Developer-ID build: osascript against Contacts.app. No native dependency,
 *    works today outside the sandbox.
 *
 * Both fail soft (return []) so recipient autocomplete silently falls back to
 * mail-history suggestions if Contacts is unavailable or access is denied.
 */
export async function searchMacContacts(query: string): Promise<MacContact[]> {
  const q = (query || '').trim()
  if (!q) return []
  return __MAS_BUILD__ ? searchViaNative(q) : searchViaOsascript(q)
}

// ── Native (CNContactStore via node-mac-contacts) ───────────────────────────

let nativeModule: any | undefined // undefined = not tried, null = unavailable
function loadNative(): any | null {
  if (nativeModule !== undefined) return nativeModule
  try {
    // Lazy + guarded so a missing/uncompiled addon never crashes the app.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    nativeModule = require('node-mac-contacts')
  } catch {
    nativeModule = null
  }
  return nativeModule
}

async function searchViaNative(query: string): Promise<MacContact[]> {
  const mod = loadNative()
  if (!mod) return []
  try {
    if (typeof mod.getAuthStatus === 'function' && mod.getAuthStatus() !== 'Authorized') {
      const granted = typeof mod.requestAccess === 'function' ? await mod.requestAccess() : false
      if (!granted) return []
    }
    // getContactsByName is a targeted name lookup (fast, doesn't load the whole
    // address book each keystroke). It matches names, which is the common
    // autocomplete case.
    const matched: any[] =
      (typeof mod.getContactsByName === 'function'
        ? mod.getContactsByName(query, ['emailAddresses'])
        : mod.getAllContacts?.(['emailAddresses'])) || []

    const ql = query.toLowerCase()
    const seen = new Set<string>()
    const out: MacContact[] = []
    for (const c of matched) {
      const name =
        [c.firstName, c.lastName].filter(Boolean).join(' ') ||
        c.fullName ||
        c.organizationName ||
        ''
      for (const raw of c.emailAddresses || []) {
        const address = String(raw).trim()
        if (!address.includes('@')) continue
        // getContactsByName already filtered by name; still keep an email-substring
        // path when we fell back to getAllContacts.
        if (
          typeof mod.getContactsByName !== 'function' &&
          !name.toLowerCase().includes(ql) &&
          !address.toLowerCase().includes(ql)
        ) {
          continue
        }
        const key = address.toLowerCase()
        if (seen.has(key)) continue
        seen.add(key)
        out.push({ name, address })
      }
    }
    return out
  } catch {
    return []
  }
}

// ── osascript (Developer-ID build only) ─────────────────────────────────────

function searchViaOsascript(query: string): Promise<MacContact[]> {
  return new Promise((resolve) => {
    const escaped = query.replace(/'/g, "'\"'\"'").replace(/\\/g, '\\\\')
    const script = `tell application "Contacts"
  set output to ""
  set matchingPeople to (every person whose name contains "${escaped}")
  repeat with p in matchingPeople
    set pName to name of p
    repeat with e in emails of p
      set output to output & pName & tab & value of e & linefeed
    end repeat
  end repeat
  set matchingEmails to (every person whose value of emails contains "${escaped}")
  repeat with p in matchingEmails
    set pName to name of p
    repeat with e in emails of p
      set output to output & pName & tab & value of e & linefeed
    end repeat
  end repeat
  return output
end tell`
    exec(`osascript -e '${script}'`, { timeout: 8000 }, (err, stdout) => {
      if (err) return resolve([])
      const seen = new Set<string>()
      const out: MacContact[] = []
      for (const line of stdout.split('\n').filter(Boolean)) {
        const [name = '', addrRaw = ''] = line.split('\t')
        const address = addrRaw.trim()
        if (!address.includes('@')) continue
        const key = address.toLowerCase()
        if (seen.has(key)) continue
        seen.add(key)
        out.push({ name, address })
      }
      resolve(out)
    })
  })
}
