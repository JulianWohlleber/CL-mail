export interface AccountCredentials {
  imapHost: string
  imapPort: number
  smtpHost: string
  smtpPort: number
  username: string
  password: string
  authType: 'password' | 'oauth2'
  oauth2?: {
    accessToken: string
    refreshToken: string
    clientId: string
    clientSecret: string
    expires: number
  }
  tls: boolean
}

export interface Account {
  id: string
  email: string
  displayName: string
  credentials: AccountCredentials
  color: string
  enabled: boolean
  lastSync: number | null
  createdAt: number
}

export type AccountSummary = Omit<Account, 'credentials'>
