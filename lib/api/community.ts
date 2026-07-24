import { req } from './client'
import type { MergeConflict } from './types'

export interface CommunityMerge {
  id:                    string
  status:                'proposed' | 'confirmed' | 'rejected' | 'reversed'
  created_at:            string
  merged_at:             string | null
  canonical_person_id:   string
  canonical_person_name: string
  canonical_family_id:   string
  canonical_family_name: string
  merged_person_id:      string
  merged_person_name:    string
  merged_family_id:      string
  merged_family_name:    string
  initiated_by_name:     string
}

export interface CommunityInfo {
  id:           string
  name:         string
  slug:         string
  description:  string | null
  member_count: number
  member_limit?: number
  /** Custom website host for this community; null = use the current origin. */
  site_url?:    string | null
}

export interface CommunityInviteInfo {
  community_name:  string
  community_slug:  string
  role:            string
  invited_email:   string | null
}

export type CommunitySession = {
  token: string
  user: {
    id:           string
    email:        string
    display_name: string
    person_id:    string
    family_id:    string
  }
}

export const community = {
  list: () =>
    req<{ communities: CommunityInfo[] }>('/api/community'),

  getInfo: (slug: string) =>
    req<CommunityInfo>(`/api/community/${encodeURIComponent(slug)}`),

  create: (
    b: {
      name: string; slug: string; description?: string; member_limit?: number
      owner: { email: string; password: string; display_name: string }
    },
    adminKey: string,
  ) =>
    req<{
      token: string
      community: { id: string; name: string; slug: string; join_code: string }
      user: { id: string; email: string; display_name: string; person_id: string; family_id: string; community_id: string }
    }>('/api/community', {
      method: 'POST',
      body: JSON.stringify(b),
      headers: { 'x-platform-key': adminKey },
    }),

  validateInvite: (slug: string, code: string) =>
    req<CommunityInviteInfo>(
      `/api/community/${encodeURIComponent(slug)}/invite/${encodeURIComponent(code)}`,
    ),

  login: (slug: string, b: { email: string; password: string }) =>
    req<CommunitySession>(`/api/community/${encodeURIComponent(slug)}/login`, {
      method: 'POST', body: JSON.stringify(b),
    }),

  signup: (slug: string, b: {
    email: string; password: string; display_name: string; invite_code: string
  }) =>
    req<CommunitySession>(`/api/community/${encodeURIComponent(slug)}/signup`, {
      method: 'POST', body: JSON.stringify(b),
    }),

  getJoinCode: (slug: string) =>
    req<{ join_code: string; community_slug: string; site_url: string | null }>(
      `/api/community/${encodeURIComponent(slug)}/join-code`,
    ),

  resetJoinCode: (slug: string) =>
    req<{ join_code: string; community_slug: string }>(
      `/api/community/${encodeURIComponent(slug)}/join-code/reset`,
      { method: 'POST' },
    ),

  /** The requester's own membership — used to reveal owner-only tools. */
  me: (slug: string) =>
    req<{ role: 'owner' | 'admin' | 'member' | null; is_owner: boolean }>(
      `/api/community/${encodeURIComponent(slug)}/me`,
    ),

  /** Total person nodes across every tree in the community. */
  stats: (slug: string) =>
    req<{ total_persons: number }>(
      `/api/community/${encodeURIComponent(slug)}/stats`,
    ),

  /** Owner-only: every merge request between trees in the community. */
  listMerges: (slug: string, status: 'proposed' | 'all' = 'all') =>
    req<{ merges: CommunityMerge[] }>(
      `/api/community/${encodeURIComponent(slug)}/merges?status=${status}`,
    ),

  /** Owner-only: merge two community persons in one step (no approval round). */
  forceMerge: (slug: string, b: {
    merged_person_id: string; canonical_person_id: string
    keep_data?: 'canonical' | 'merged'
  }) =>
    req<{ merge_record_id: string; canonical_person_id: string; conflicts: MergeConflict[] }>(
      `/api/community/${encodeURIComponent(slug)}/merges/force`,
      { method: 'POST', body: JSON.stringify(b) },
    ),
}
