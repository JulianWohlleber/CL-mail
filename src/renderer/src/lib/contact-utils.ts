import type { Address } from '@shared/types/mail'

export function getInitials(name: string): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function formatAddress(addr: Address): string {
  if (addr.name && addr.name !== addr.address) {
    return addr.name
  }
  return addr.address
}

export function formatAddressList(addrs: Address[]): string {
  if (addrs.length === 0) return ''
  if (addrs.length === 1) return formatAddress(addrs[0])
  if (addrs.length === 2) return `${formatAddress(addrs[0])} & ${formatAddress(addrs[1])}`
  return `${formatAddress(addrs[0])} & ${addrs.length - 1} others`
}

const AVATAR_COLORS = [
  '#E74C3C', '#E67E22', '#F1C40F', '#2ECC71',
  '#1ABC9C', '#3498DB', '#9B59B6', '#E91E63',
  '#00BCD4', '#FF5722', '#607D8B', '#795548'
]

export function getAvatarColor(email: string): string {
  let hash = 0
  for (let i = 0; i < email.length; i++) {
    hash = email.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}
