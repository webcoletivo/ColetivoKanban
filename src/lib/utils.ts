import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function formatDateTime(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function isOverdue(date: Date | string): boolean {
  return new Date(date) < new Date()
}

export function isDueToday(date: Date | string): boolean {
  const d = new Date(date)
  const today = new Date()
  return (
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()
  )
}

export function generatePosition(prevPosition?: number, nextPosition?: number): number {
  // Case 1: First item in empty list
  if (prevPosition === undefined && nextPosition === undefined) {
    return 65536
  }

  // Case 2: Moving to start (no prev, only next)
  if (prevPosition === undefined) {
    // If next is 0 or negative (shouldn't happen often but possible), return next - 65536
    // Otherwise divide by 2
    return (nextPosition! <= 0) ? nextPosition! - 65536 : nextPosition! / 2
  }

  // Case 3: Moving to end (no next, only prev)
  if (nextPosition === undefined) {
    return prevPosition + 65536
  }

  // Case 4: Inserting between two items
  // If difference is too small, we might need a rebalance, but for now simple average
  return (prevPosition + nextPosition) / 2
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

/**
 * Converts a UTC ISO string to local datetime-local input format (YYYY-MM-DDTHH:mm)
 * This ensures the datetime-local input shows the correct local time
 */
export function toLocalDateTimeString(isoString: string): string {
  const date = new Date(isoString)
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

/**
 * Generates a URL for an asset (image/file).
 * Handles both legacy full URLs and new storage keys.
 * Uses the proxy endpoint for storage keys.
 */
export function getAssetUrl(keyOrUrl: string | null | undefined, updatedAt?: string | Date): string | undefined {
  if (!keyOrUrl) return undefined

  let url: string
  if (keyOrUrl.startsWith('http') || keyOrUrl.startsWith('/')) {
    url = keyOrUrl
  } else {
    url = `/api/files/inline?key=${keyOrUrl}`
  }

  if (updatedAt) {
    const version = new Date(updatedAt).getTime()
    return `${url}${url.includes('?') ? '&' : '?'}v=${version}`
  }

  return url
}
