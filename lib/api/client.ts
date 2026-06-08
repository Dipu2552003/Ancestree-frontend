const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

// ── token helpers ─────────────────────────────────────────────────
export function setToken(t: string) {
  if (typeof window !== 'undefined') localStorage.setItem('at', t)
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('at')
}

export function clearToken() {
  if (typeof window !== 'undefined') localStorage.removeItem('at')
}

// ── core fetch wrapper ────────────────────────────────────────────
export async function req<T>(path: string, init: RequestInit = {}): Promise<T> {
  const t = getToken()
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(t ? { Authorization: `Bearer ${t}` } : {}),
      ...(init.headers as Record<string, string> ?? {}),
    },
  })
  const body = await res.json().catch(() => ({ error: res.statusText }))
  if (!res.ok) throw new Error(body.error ?? res.statusText)
  return body as T
}

// ── Graph depth defaults ──────────────────────────────────────────
// Initial generations loaded above/below the perspective person. The "Load
// more" chip on the canvas bumps the relevant depth by DEPTH_LOAD_STEP and
// re-fetches. The backend clamps to what actually exists and reports back
// `hasMoreAncestors` / `hasMoreDescendants` so the chip hides at the root.
export const ANCESTOR_DEPTH_DEFAULT   = 10
export const DESCENDANT_DEPTH_DEFAULT = 10
export const DEPTH_LOAD_STEP          = 5
