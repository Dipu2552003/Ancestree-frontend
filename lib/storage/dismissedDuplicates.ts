// Tracks which "possible duplicate" suggestions the user has dismissed.
//
// When the backend's fuzzy matcher detects a likely duplicate of a newly-
// created person, the graph page pops a modal. Once the user closes that
// modal, we record the person id so it never re-pops — even across reloads
// — until the user clears the entry server-side.
//
// Stored as a JSON array of person ids in localStorage under DISMISSED_DUP_KEY.

const DISMISSED_DUP_KEY = 'dismissedDupSuggestions'

export function isDupDismissed(personId: string): boolean {
  if (typeof window === 'undefined') return false
  try {
    const raw = localStorage.getItem(DISMISSED_DUP_KEY)
    return raw ? (JSON.parse(raw) as string[]).includes(personId) : false
  } catch { return false }
}

export function markDupDismissed(personId: string) {
  if (typeof window === 'undefined') return
  try {
    const raw = localStorage.getItem(DISMISSED_DUP_KEY)
    const arr: string[] = raw ? JSON.parse(raw) : []
    if (!arr.includes(personId)) {
      arr.push(personId)
      localStorage.setItem(DISMISSED_DUP_KEY, JSON.stringify(arr))
    }
  } catch { /* ignore */ }
}
