import { ipcMain } from 'electron'
import Database from 'better-sqlite3'
import { IPC } from '@shared/ipc-channels'
import { searchMacContacts as searchMacContactsBackend } from '../services/contacts/mac-contacts'

interface ContactResult {
  name: string
  address: string
  source: 'inbox' | 'contacts'
  frequency: number
}

// macOS Contacts lookup — backend chosen by build (native CNContactStore in the
// App Store build, osascript in the Developer-ID build). See mac-contacts.ts.
async function searchMacContacts(query: string): Promise<ContactResult[]> {
  const hits = await searchMacContactsBackend(query)
  return hits.map((h) => ({ name: h.name, address: h.address, source: 'contacts' as const, frequency: 0 }))
}

export function registerContactHandlers(db: Database.Database): void {
  ipcMain.handle(IPC.CONTACTS_SUGGEST, async (_event, query: string) => {
    const q = (query || '').trim().toLowerCase()
    if (!q || q.length < 1) return []

    const merged = new Map<string, ContactResult>()

    // 1. Search from_address/from_name across ALL messages
    try {
      const fromResults = db.prepare(`
        SELECT from_name as name, from_address as address, COUNT(*) as freq
        FROM messages
        WHERE from_address LIKE ? OR from_name LIKE ?
        GROUP BY LOWER(from_address)
        ORDER BY freq DESC
        LIMIT 30
      `).all(`%${q}%`, `%${q}%`) as Array<{ name: string; address: string; freq: number }>

      for (const c of fromResults) {
        if (!c.address) continue
        merged.set(c.address.toLowerCase(), {
          name: c.name || c.address,
          address: c.address,
          source: 'inbox',
          frequency: c.freq
        })
      }
    } catch (e) {
      console.error('[Contacts] DB query error (from):', e)
    }

    // 2. Search to_list and cc_list JSON fields
    try {
      const recipientRows = db.prepare(`
        SELECT to_list, cc_list FROM messages
        WHERE to_list LIKE ? OR cc_list LIKE ?
        LIMIT 300
      `).all(`%${q}%`, `%${q}%`) as Array<{ to_list: string; cc_list: string }>

      for (const row of recipientRows) {
        for (const jsonStr of [row.to_list, row.cc_list]) {
          try {
            const addrs = JSON.parse(jsonStr || '[]')
            for (const a of addrs) {
              if (!a.address) continue
              const key = a.address.toLowerCase()
              if (!key.includes(q) && !(a.name || '').toLowerCase().includes(q)) continue
              const existing = merged.get(key)
              if (existing) {
                existing.frequency++
                if (!existing.name || existing.name === existing.address) {
                  existing.name = a.name || existing.name
                }
              } else {
                merged.set(key, {
                  name: a.name || a.address,
                  address: a.address,
                  source: 'inbox',
                  frequency: 1
                })
              }
            }
          } catch {
            // skip malformed JSON
          }
        }
      }
    } catch (e) {
      console.error('[Contacts] DB query error (recipients):', e)
    }

    // 3. Search macOS Contacts (targeted search, not full load).
    // Gated by a setting because the first call triggers a permission prompt.
    let macContactsEnabled = false
    try {
      const row = db.prepare("SELECT value FROM settings WHERE key = 'macContactsEnabled'").get() as { value: string } | undefined
      if (row?.value) {
        try { macContactsEnabled = JSON.parse(row.value) === true } catch { macContactsEnabled = row.value === 'true' }
      }
    } catch { /* ignore */ }

    if (macContactsEnabled && q.length >= 2) {
      try {
        const macContacts = await searchMacContacts(q)
        for (const mc of macContacts) {
          const key = mc.address.toLowerCase()
          const existing = merged.get(key)
          if (existing) {
            if (mc.name && (!existing.name || existing.name === existing.address)) {
              existing.name = mc.name
            }
            existing.source = 'contacts'
          } else {
            merged.set(key, { ...mc })
          }
        }
      } catch {
        // macOS Contacts unavailable
      }
    }

    return Array.from(merged.values())
      .sort((a, b) => b.frequency - a.frequency || a.name.localeCompare(b.name))
      .slice(0, 15)
  })
}
