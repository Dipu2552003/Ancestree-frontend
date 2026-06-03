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

// ── Shared types ──────────────────────────────────────────────────

export type ConflictType =
  | 'double_parent'
  | 'double_spouse'
  | 'parent_sibling_paradox'
  | 'cycle'
  | 'secondary_duplicate'
  | 'claimed_orphan'

export interface SearchResult {
  id:          string
  full_name:   string
  family_name: string
  birth_year:  number | null
  node_state:  string
  photo_url:   string | null
}

export interface MergeConflict {
  type:             ConflictType
  severity:         'warning' | 'error'
  message:          string
  affected_persons: string[]
  resolution_options: never[]
}

export interface PotentialMatch {
  id:             string
  full_name:      string
  birth_year:     number | null
  native_village: string | null
  gotra:          string | null
  gender:         string | null
  photo_url:      string | null
  family_name:    string
  family_id:      string
  member_count:   number
  match_score:    number
  matched_fields: string[]
}

export interface PossibleMatchNotificationDetails {
  new_person_name:           string
  new_person_birth_year:     number | null
  new_person_native_village: string | null
  new_person_gotra:          string | null
  new_person_photo_url:      string | null
  canonical_person_id:       string
  canonical_person_name:     string
  canonical_family_id:       string
  canonical_family_name:     string
  match_score:               number
  matched_fields:            string[]
}

export interface AppNotification {
  id:                string
  user_id:           string
  type:              'merge_request_received' | 'merge_request_accepted' | 'merge_request_rejected' | 'family_name_changed' | 'claim_suggestion' | 'possible_match_found'
  merge_record_id:   string | null
  related_person_id: string | null
  message:           string
  is_read:           boolean
  created_at:        string
  merge_status:      'proposed' | 'confirmed' | 'rejected' | 'reversed' | null
  details:           PossibleMatchNotificationDetails | null
}

export interface SentMergeRequest {
  id:                    string
  status:                'proposed' | 'confirmed' | 'rejected' | 'reversed'
  canonical_person_name: string
  canonical_family_name: string
  merged_person_name:    string
  created_at:            string
  merged_at:             string | null
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
    // Re-issues a JWT with the correct familyId after a merge transfers the user
    // to a different family.  Call this whenever the graph loads empty.
    refreshToken: () =>
      req<{ token: string }>('/api/auth/refresh-token', { method: 'POST' }),
  },

  graph: {
    fetch: (perspectiveId?: string) => req<{
      nodes: import('@xyflow/react').Node[]
      edges: import('@xyflow/react').Edge[]
      meta: { totalNodes: number }
    }>(perspectiveId ? `/api/graph?perspective=${encodeURIComponent(perspectiveId)}` : '/api/graph'),
  },

  persons: {
    create: (b: {
      full_name: string
      gender?: string
      birth_year?: number
      is_alive?: boolean
    }) => req<{ id: string; person_code: string; potential_matches: PotentialMatch[] }>('/api/persons', {
      method: 'POST', body: JSON.stringify(b),
    }),

    update: (id: string, b: {
      full_name?: string
      first_name?: string | null
      middle_name?: string | null
      last_name?: string | null
      name_native?: string | null
      nickname?: string | null
      gender?: string | null
      gotra?: string | null
      religion?: string | null
      birth_date?: string | null
      birth_year?: number | null
      birth_place?: string | null
      is_alive?: boolean
      death_date?: string | null
      death_year?: number | null
      death_place?: string | null
      phone?: string | null
      whatsapp?: string | null
      email?: string | null
      current_address?: string | null
      current_city?: string | null
      current_state?: string | null
      current_country?: string | null
      current_pincode?: string | null
      native_village?: string | null
      native_tehsil?: string | null
      native_district?: string | null
      native_state?: string | null
      native_country?: string | null
      occupation?: string | null
      occupation_detail?: string | null
      education?: string | null
      bio?: string | null
      photo_url?: string | null
    }) => req<{ id: string; potential_matches?: PotentialMatch[] }>(`/api/persons/${id}`, {
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

  search: {
    persons: (q: string) =>
      req<{ results: SearchResult[] }>(`/api/search?q=${encodeURIComponent(q)}`),
  },

  merges: {
    getById: (id: string) =>
      req<{
        id: string; status: string
        canonical_person_id: string; canonical_person_name: string
        canonical_family_id: string; canonical_family_name: string
        merged_person_id: string; merged_person_name: string
        merged_family_id: string; merged_family_name: string
        created_at: string
      }>(`/api/merges/${id}`),

    create: (b: { new_person_id: string; canonical_person_id: string }) =>
      req<{ merge_record_id: string }>('/api/merges', {
        method: 'POST', body: JSON.stringify(b),
      }),
    listSent: () =>
      req<{ requests: SentMergeRequest[] }>('/api/merges/sent'),
    accept: (mergeRecordId: string) =>
      req<{ canonical_person_id: string; conflicts: MergeConflict[] }>(
        `/api/merges/${mergeRecordId}/accept`, { method: 'POST' },
      ),
    reject: (mergeRecordId: string) =>
      req<{ success: boolean }>(`/api/merges/${mergeRecordId}/reject`, { method: 'POST' }),
  },

  notifications: {
    list: () =>
      req<{ notifications: AppNotification[]; unread_count: number }>('/api/notifications'),
    markRead: (id: string) =>
      req<{ success: boolean }>(`/api/notifications/${id}/read`, { method: 'POST' }),
    markAllRead: () =>
      req<{ success: boolean }>('/api/notifications/read-all', { method: 'POST' }),
  },
}
