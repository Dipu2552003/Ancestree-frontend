// Session helpers that read the logged-in user record from localStorage.
//
// The "user" key is set on login (see lib/api/auth.ts → setUser) and contains
// the JSON-encoded user record. This module exists to keep raw localStorage
// reads out of component code — there's no validation/refresh logic here, just
// a typed read.

export function getSelfPersonId(): string | null {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('user') : null
    if (!raw) return null
    return (JSON.parse(raw) as { person_id?: string }).person_id ?? null
  } catch { return null }
}
