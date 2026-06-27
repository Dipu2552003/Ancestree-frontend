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

// ── Cold-start handling ───────────────────────────────────────────
// The backend (Render) spins down after inactivity, so the FIRST request after
// idle triggers a cold start that can take ~30-60s to respond. We give
// cold-start-prone GET requests a generous timeout: long enough that a slow
// wake-up still completes, but bounded so a genuinely dead server surfaces a
// retry prompt instead of hanging the UI forever.
export const COLD_START_TIMEOUT_MS = 75_000

/** Thrown when a request is aborted by its timeout (see `req`'s `timeoutMs`). */
export class RequestTimeoutError extends Error {
  constructor(message = 'The server took too long to respond.') {
    super(message)
    this.name = 'RequestTimeoutError'
  }
}

/** True for errors that mean the backend was unreachable / still waking up
 *  (timeout or network failure) rather than a real server response such as a
 *  404. Lets callers offer a "Try again" instead of a terminal error. */
export function isColdStartError(err: unknown): boolean {
  // fetch() rejects with a TypeError on network failure (server down/refused).
  return err instanceof RequestTimeoutError || err instanceof TypeError
}

// ── core fetch wrapper ────────────────────────────────────────────
export async function req<T>(
  path: string,
  init: RequestInit = {},
  opts: { timeoutMs?: number } = {},
): Promise<T> {
  const t = getToken()
  const controller = new AbortController()
  const timer = opts.timeoutMs
    ? setTimeout(() => controller.abort(), opts.timeoutMs)
    : null

  let res: Response
  try {
    res = await fetch(`${BASE}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(t ? { Authorization: `Bearer ${t}` } : {}),
        ...(init.headers as Record<string, string> ?? {}),
      },
    })
  } catch (err) {
    // An abort from our timeout reads as "server didn't wake in time".
    if (controller.signal.aborted) throw new RequestTimeoutError()
    throw err
  } finally {
    if (timer) clearTimeout(timer)
  }

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
