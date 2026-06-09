// Co-located helpers used by the NotificationPanel sub-components.
//
// `getSelfPersonId` is re-exported from lib/storage/session.ts so all callers
// share a single implementation.
//
// `timeAgo` formats an ISO timestamp into a short human-readable string used
// in InboxRow + SentRow. Falls back to a localised date once it's been
// more than 30 days.

export { getSelfPersonId } from '@/lib/storage'

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}d ago`
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}
