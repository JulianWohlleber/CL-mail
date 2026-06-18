export interface SearchQuery {
  text: string
  from?: string
  to?: string
  subject?: string
  hasAttachment?: boolean
  isUnread?: boolean
  isStarred?: boolean
  after?: number
  before?: number
  folder?: string
  label?: string
  accountId?: string
  limit?: number
  offset?: number
}

export interface SearchResult {
  threadId: string
  messageId: string
  subject: string
  snippet: string
  from: { name: string; address: string }
  date: number
  rank: number
  highlights: string[]
}

export interface SearchSuggestion {
  type: 'contact' | 'folder' | 'label' | 'operator'
  value: string
  label: string
}
