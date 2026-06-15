import { req } from './client'
import type { SearchResult } from './types'

export const search = {
  /** Default scope is 'all' — search across every family. Pass 'own' to
   *  restrict to the requester's own family, or 'external' to exclude it. */
  persons: (q: string, scope: 'own' | 'external' | 'all' = 'all') =>
    req<{ results: SearchResult[] }>(
      `/api/search?q=${encodeURIComponent(q)}&scope=${scope}`,
    ),

  /** Public, unauthenticated search of public family trees (landing page). */
  publicPersons: (q: string) =>
    req<{ results: SearchResult[] }>(
      `/api/search/public?q=${encodeURIComponent(q)}`,
    ),
}
