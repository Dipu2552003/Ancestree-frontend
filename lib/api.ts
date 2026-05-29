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
async function req<T>(path: string, init: RequestInit = {}): Promise<T> {
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

// ── API surface ───────────────────────────────────────────────────
export const api = {
  auth: {
    signup: (b: { email: string; password: string; display_name: string }) =>
      req<{ token: string; user: Record<string, unknown> }>('/api/auth/signup', {
        method: 'POST', body: JSON.stringify(b),
      }),
    login: (b: { email: string; password: string }) =>
      req<{ token: string; user: Record<string, unknown> }>('/api/auth/login', {
        method: 'POST', body: JSON.stringify(b),
      }),
  },

  graph: {
    fetch: () => req<{
      nodes: import('@xyflow/react').Node[]
      edges: import('@xyflow/react').Edge[]
      meta: { totalNodes: number }
    }>('/api/graph'),
  },

  persons: {
    create: (b: {
      full_name: string
      gender?: string
      birth_year?: number
      is_alive?: boolean
    }) => req<{ id: string; person_code: string }>('/api/persons', {
      method: 'POST', body: JSON.stringify(b),
    }),

    update: (id: string, b: {
      full_name?: string
      nickname?: string | null
      gender?: string | null
      birth_year?: number | null
      birth_place?: string | null
      death_year?: number | null
      is_alive?: boolean
      photo_url?: string | null
      gotra?: string | null
      native_village?: string | null
      current_city?: string | null
      current_country?: string | null
      occupation?: string | null
      bio?: string | null
      education?: string | null
    }) => req<{ id: string }>(`/api/persons/${id}`, {
      method: 'PATCH', body: JSON.stringify(b),
    }),

    delete: (id: string) => req<{ success: boolean }>(`/api/persons/${id}`, {
      method: 'DELETE',
    }),

    generateInvite: (id: string) =>
      req<{ invite_token: string }>(`/api/persons/${id}/invite`, { method: 'POST' }),
  },

  invite: {
    lookup: (token: string) =>
      req<{ full_name: string; family_name: string; birth_year: number | null; photo_url: string | null }>(
        `/api/invite/lookup?token=${encodeURIComponent(token)}`
      ),
    claim: (token: string) =>
      req<{ success: boolean; person_id: string; family_id: string; full_name: string; token: string }>(
        '/api/invite/claim', { method: 'POST', body: JSON.stringify({ token }) }
      ),
    signupAndClaim: (b: { email: string; password: string; display_name: string; invite_token: string }) =>
      req<{ token: string; user: Record<string, unknown> }>(
        '/api/invite/signup-and-claim', { method: 'POST', body: JSON.stringify(b) }
      ),
  },

  relationships: {
    create: (b: {
      from_person_id: string
      to_person_id: string
      rel_type: 'PARENT_OF' | 'SPOUSE_OF' | 'SIBLING_OF'
      sub_type?: string
    }) => req<{ id: string }>('/api/relationships', {
      method: 'POST', body: JSON.stringify(b),
    }),
  },
}
