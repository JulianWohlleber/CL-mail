import Database from 'better-sqlite3'
import { mkdirSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'

interface MessageRow {
  id: string
  thread_id: string
  from_address: string
  from_name: string
  to_list: string
  cc_list: string
  subject: string
  body_text: string
  body_html: string
  date: number
  flags: string
  unread: number
  starred: number
  has_attachments: number
}

interface ThreadRow {
  id: string
  subject: string
  account_id: string
  folder_id: string
  last_message_date: number
  message_count: number
}

interface AccountRow {
  id: string
  email: string
  vault_path: string | null
}

export class VaultSync {
  private db: Database.Database

  constructor(db: Database.Database) {
    this.db = db
  }

  /** Sync all threads for accounts that have a vault configured */
  syncAll(): void {
    const accounts = this.db
      .prepare('SELECT id, email, vault_path FROM accounts WHERE vault_path IS NOT NULL')
      .all() as AccountRow[]

    for (const account of accounts) {
      if (!account.vault_path) continue
      this.syncAccount(account)
    }
  }

  /** Sync a single thread to its account's vault */
  syncThread(threadId: string): void {
    const thread = this.db
      .prepare('SELECT t.*, a.vault_path, a.email as account_email FROM threads t JOIN accounts a ON t.account_id = a.id WHERE t.id = ?')
      .get(threadId) as any

    if (!thread?.vault_path) return

    const messages = this.db
      .prepare('SELECT * FROM messages WHERE thread_id = ? ORDER BY date ASC')
      .all(threadId) as MessageRow[]

    if (messages.length === 0) return

    const folder = this.db
      .prepare('SELECT name, role FROM folders WHERE id = ?')
      .get(thread.folder_id) as { name: string; role: string } | undefined

    this.writeThreadFile(thread.vault_path, thread, messages, folder, thread.account_email)
  }

  /** Sync all threads for one account */
  private syncAccount(account: AccountRow): void {
    if (!account.vault_path) return

    const mailDir = join(account.vault_path, 'Mail')
    mkdirSync(mailDir, { recursive: true })

    const threads = this.db
      .prepare('SELECT * FROM threads WHERE account_id = ? ORDER BY last_message_date DESC')
      .all(account.id) as ThreadRow[]

    for (const thread of threads) {
      const messages = this.db
        .prepare('SELECT * FROM messages WHERE thread_id = ? ORDER BY date ASC')
        .all(thread.id) as MessageRow[]

      if (messages.length === 0) continue

      const folder = this.db
        .prepare('SELECT name, role FROM folders WHERE id = ?')
        .get(thread.folder_id) as { name: string; role: string } | undefined

      this.writeThreadFile(account.vault_path, thread, messages, folder, account.email)
    }
  }

  private writeThreadFile(
    vaultPath: string,
    thread: ThreadRow,
    messages: MessageRow[],
    folder: { name: string; role: string } | undefined,
    accountEmail: string
  ): void {
    const mailDir = join(vaultPath, 'Mail')
    mkdirSync(mailDir, { recursive: true })

    // Create a safe filename from subject
    const safeSubject = (thread.subject || 'No Subject')
      .replace(/[/\\:*?"<>|#%&{}$!'@+`=]/g, '-')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 100)

    // Use date prefix for sorting
    const date = new Date(thread.last_message_date)
    const datePrefix = date.toISOString().slice(0, 10)
    const filename = `${datePrefix} ${safeSubject}.md`
    const filepath = join(mailDir, filename)

    // Build markdown content
    const md = this.buildMarkdown(thread, messages, folder, accountEmail)
    writeFileSync(filepath, md, 'utf-8')
  }

  private buildMarkdown(
    thread: ThreadRow,
    messages: MessageRow[],
    folder: { name: string; role: string } | undefined,
    accountEmail: string
  ): string {
    const firstMsg = messages[0]
    const lastMsg = messages[messages.length - 1]
    const firstDate = new Date(firstMsg.date)
    const lastDate = new Date(lastMsg.date)

    // Collect all participants
    const participants = new Set<string>()
    for (const msg of messages) {
      participants.add(msg.from_address)
      try {
        const toList = JSON.parse(msg.to_list || '[]')
        for (const to of toList) {
          if (to.address) participants.add(to.address)
        }
      } catch { /* ignore */ }
    }

    // YAML frontmatter
    const lines: string[] = [
      '---',
      `title: "${thread.subject.replace(/"/g, '\\"')}"`,
      `account: ${accountEmail}`,
      `folder: ${folder?.role || 'unknown'}`,
      `date: ${firstDate.toISOString()}`,
      `last_updated: ${lastDate.toISOString()}`,
      `message_count: ${messages.length}`,
      `participants:`,
      ...Array.from(participants).map(p => `  - ${p}`),
      `tags:`,
      `  - mail`,
      `  - ${folder?.role || 'inbox'}`,
      '---',
      '',
      `# ${thread.subject}`,
      '',
    ]

    // Each message as a section
    for (const msg of messages) {
      const msgDate = new Date(msg.date)
      const dateStr = msgDate.toLocaleString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })

      const fromLabel = msg.from_name && msg.from_name !== msg.from_address
        ? `${msg.from_name} <${msg.from_address}>`
        : msg.from_address

      let toLabel = ''
      try {
        const toList = JSON.parse(msg.to_list || '[]')
        toLabel = toList.map((t: any) => t.name ? `${t.name} <${t.address}>` : t.address).join(', ')
      } catch { /* ignore */ }

      const isMe = msg.from_address === accountEmail
      const direction = isMe ? 'sent' : 'received'

      lines.push(`## ${direction === 'sent' ? '→' : '←'} ${fromLabel}`)
      lines.push(`*${dateStr}*  `)
      if (toLabel) lines.push(`To: ${toLabel}  `)
      lines.push('')

      // Use plain text body, fall back to stripping HTML
      const body = msg.body_text || this.stripHtml(msg.body_html || '')
      lines.push(body.trim())
      lines.push('')
      lines.push('---')
      lines.push('')
    }

    return lines.join('\n')
  }

  private stripHtml(html: string): string {
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<\/li>/gi, '\n')
      .replace(/<li>/gi, '- ')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\n{3,}/g, '\n\n')
  }
}
