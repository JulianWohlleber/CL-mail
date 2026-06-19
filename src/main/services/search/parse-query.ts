/**
 * Parse a user-facing search box into structured filters.
 *
 * Recognized operators:
 *   from:<term>          — match against the from address/name
 *   to:<term>            — match against to_list
 *   subject:<term>       — restrict to the subject column
 *   has:attachment       — only threads with attachments
 *   has:unread           — only unread threads (is:unread is an alias)
 *   has:starred          — only starred threads
 *
 * Anything not recognized as an operator becomes the free-text FTS query.
 * Quoting (e.g. `subject:"q3 review"`) is supported.
 *
 * Sprint #6.
 */

export interface ParsedQuery {
  /** Final FTS5 MATCH string. Empty when only structural filters are set. */
  fts?: string
  hasAttachment?: boolean
  unread?: boolean
  starred?: boolean
}

const OPERATORS = ['from', 'to', 'subject', 'has', 'is'] as const

export function parseSearchQuery(raw: string): ParsedQuery {
  const result: ParsedQuery = {}
  const ftsParts: string[] = []

  // Tokenize while preserving quoted phrases.
  const tokens: string[] = []
  let i = 0
  while (i < raw.length) {
    const ch = raw[i]
    if (ch === ' ' || ch === '\t') { i++; continue }
    if (ch === '"') {
      const end = raw.indexOf('"', i + 1)
      if (end < 0) { tokens.push(raw.slice(i + 1)); break }
      tokens.push(raw.slice(i + 1, end))
      i = end + 1
      continue
    }
    let j = i
    while (j < raw.length && raw[j] !== ' ' && raw[j] !== '\t') j++
    tokens.push(raw.slice(i, j))
    i = j
  }

  for (const t of tokens) {
    const colon = t.indexOf(':')
    if (colon > 0) {
      const op = t.slice(0, colon).toLowerCase()
      const arg = t.slice(colon + 1).trim()
      if ((OPERATORS as readonly string[]).includes(op)) {
        applyOperator(op, arg, ftsParts, result)
        continue
      }
    }
    if (t) ftsParts.push(ftsEscape(t))
  }

  if (ftsParts.length > 0) result.fts = ftsParts.join(' ')
  return result
}

function applyOperator(op: string, arg: string, ftsParts: string[], result: ParsedQuery): void {
  switch (op) {
    case 'from':
      if (arg) ftsParts.push(`from_address:${ftsEscape(arg)}* OR from_name:${ftsEscape(arg)}*`)
      break
    case 'to':
      // NOTE: the messages_fts table only indexes subject/body_text/from_name/
      // from_address — there is NO to_list column. A column-filter against a
      // non-existent FTS column raises "fts5: no such column" and fails the
      // whole query, so we push the term as a plain FTS term instead. (To make
      // `to:` recipient-scoped we'd need to add to_list to the FTS schema +
      // triggers and reindex — tracked, not done here.)
      if (arg) ftsParts.push(ftsEscape(arg))
      break
    case 'subject':
      if (arg) ftsParts.push(`subject:${ftsEscape(arg)}*`)
      break
    case 'has':
    case 'is':
      if (arg === 'attachment' || arg === 'attachments') result.hasAttachment = true
      else if (arg === 'unread') result.unread = true
      else if (arg === 'read') result.unread = false
      else if (arg === 'starred' || arg === 'star') result.starred = true
      break
  }
}

/**
 * Escape user input for the FTS5 query language. FTS5 treats unquoted strings
 * with non-alphanumeric characters as syntax errors. Wrapping in double quotes
 * is the safest universal escape.
 */
function ftsEscape(s: string): string {
  if (/^[A-Za-z0-9_]+$/.test(s)) return s
  return `"${s.replace(/"/g, '""')}"`
}
