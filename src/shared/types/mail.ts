export interface Address {
  name: string
  address: string
}

export interface Attachment {
  id: string
  messageId: string
  filename: string
  contentType: string
  size: number
  contentId?: string
  localPath?: string
}

export interface Message {
  id: string
  accountId: string
  threadId: string
  folderId: string
  uid: number
  messageIdHeader: string
  inReplyTo?: string
  references: string[]
  from: Address
  to: Address[]
  cc: Address[]
  bcc: Address[]
  subject: string
  snippet: string
  bodyHtml: string
  bodyText: string
  date: number
  flags: string[]
  hasAttachments: boolean
  attachments: Attachment[]
  size: number
  unread: boolean
  starred: boolean
}

export interface Thread {
  id: string
  accountId: string
  subject: string
  snippet: string
  lastMessageDate: number
  participants: Address[]
  messageCount: number
  unread: boolean
  starred: boolean
  hasAttachments: boolean
  /** True if the user has sent at least one message in this thread. */
  answeredByMe?: boolean
  snoozedUntil?: number
  labels: string[]
  folderId: string
  messages?: Message[]
}

export interface Folder {
  id: string
  accountId: string
  name: string
  role: FolderRole
  imapPath: string
  unreadCount: number
  totalCount: number
  children?: Folder[]
}

export type FolderRole =
  | 'inbox'
  | 'sent'
  | 'drafts'
  | 'trash'
  | 'archive'
  | 'spam'
  | 'starred'
  | 'all'
  | 'custom'

export interface MailListOptions {
  accountId?: string
  folderId?: string
  threadId?: string
  label?: string
  unreadOnly?: boolean
  starredOnly?: boolean
  limit?: number
  offset?: number
  sortBy?: 'date' | 'from' | 'subject'
  sortOrder?: 'asc' | 'desc'
}
