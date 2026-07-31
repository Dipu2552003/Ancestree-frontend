import { req, COLD_START_TIMEOUT_MS } from './client'
import type { SearchResult } from './types'

export interface SearchFilters {
  gender?: 'male' | 'female'
  /** Inclusive age bounds (years). Excludes people with an unknown birth year. */
  ageMin?: number
  ageMax?: number
}

export const search = {
  /** Default scope is 'all' — search across every family. Pass 'own' to
   *  restrict to the requester's own family, or 'external' to exclude it.
   *  Optional gender/age filters narrow the query server-side (before its cap). */
  persons: (q: string, scope: 'own' | 'external' | 'all' = 'all', filters: SearchFilters = {}) => {
    const qs = new URLSearchParams({ q, scope })
    if (filters.gender) qs.set('gender', filters.gender)
    if (filters.ageMin != null) qs.set('age_min', String(filters.ageMin))
    if (filters.ageMax != null) qs.set('age_max', String(filters.ageMax))
    return req<{ results: SearchResult[] }>(
      `/api/search?${qs.toString()}`,
      {},
      { timeoutMs: COLD_START_TIMEOUT_MS },
    )
  },

  /** Public, unauthenticated search of public family trees (landing page). */
  publicPersons: (q: string) =>
    req<{ results: SearchResult[] }>(
      `/api/search/public?q=${encodeURIComponent(q)}`,
      {},
      { timeoutMs: COLD_START_TIMEOUT_MS },
    ),
}
