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

export interface CommunityMember {
  id:           string          // user id
  email:        string
  display_name: string | null
  role:         'owner' | 'admin' | 'member'
  joined_at:    string
  person_id:    string | null   // their own node — deep-link target
  person_name:  string | null
  photo_url:    string | null
  family_id:    string | null
}

export interface CommunityFamily {
  id:               string
  name:             string
  name_prefix:      string
  created_at:       string
  person_count:     number
  member_count:     number
  view_person_id:   string | null   // representative node to open on click
  view_person_name: string | null
  /** Distinct lineages (family heads) inside this cluster; largest first. */
  heads:            { person_id: string; name: string; count: number }[]
}

export interface CommunityHome {
  id:             string
  name:           string | null
  city:           string | null
  state:          string | null
  country:        string | null
  created_at:     string
  /** The home head — clicking a home opens this person's perspective view. */
  head_person_id: string | null
  head_name:      string | null
  members:        { person_id: string; name: string; photo_url: string | null }[]
}

export interface CommunityHealth {
  /** Both uniqueness indexes are in place (one-account-one-node is enforced). */
  ownership_constraint_active: boolean
  /** Accounts that own more than one active node. */
  duplicate_owners: {
    user_id: string; display_name: string | null; email: string
    node_count: number; node_names: string[]; node_ids: string[]
  }[]
  /** Nodes linked by more than one account. */
  duplicate_person_links: {
    person_id: string; full_name: string; user_count: number; emails: string[]
  }[]
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

  /** Public: the community's field rulebook + enum option catalogs, used to
   *  tailor the node editor (which fields show, dropdown values, constants). */
  fieldConfig: (slug: string) =>
    req<import('@/lib/community/fieldConfig').FieldConfig>(
      `/api/community/${encodeURIComponent(slug)}/field-config`,
    ),

  /** Admin: set which fields show and how (settings.fields). */
  updateFieldConfig: (slug: string, fields: Record<string, unknown>) =>
    req<import('@/lib/community/fieldConfig').FieldConfig>(
      `/api/community/${encodeURIComponent(slug)}/field-config`,
      { method: 'PUT', body: JSON.stringify({ fields }) },
    ),

  /** Admin: replace the dropdown values for one enum field. */
  setFieldOptions: (
    slug: string, key: string,
    options: { value: string; label?: string | null }[],
  ) =>
    req<import('@/lib/community/fieldConfig').FieldConfig>(
      `/api/community/${encodeURIComponent(slug)}/field-options/${encodeURIComponent(key)}`,
      { method: 'PUT', body: JSON.stringify({ options }) },
    ),

  /** Admin-only: update community settings (name, description, site_url…). */
  update: (slug: string, b: {
    name?: string; description?: string; site_url?: string | null; member_limit?: number
  }) =>
    req<CommunityInfo>(`/api/community/${encodeURIComponent(slug)}`, {
      method: 'PATCH', body: JSON.stringify(b),
    }),

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

  /** Admin-only: every member/signup (newest first) with photo + node link. */
  members: (slug: string) =>
    req<{ members: CommunityMember[] }>(
      `/api/community/${encodeURIComponent(slug)}/members`,
    ),

  /** Admin-only: every family in the community with counts + a node to open. */
  families: (slug: string) =>
    req<{ families: CommunityFamily[] }>(
      `/api/community/${encodeURIComponent(slug)}/families`,
    ),

  /** Admin-only: data-health report — 1:1 ownership issues + whether the
   *  ownership constraint is live (see migration 028). */
  health: (slug: string) =>
    req<CommunityHealth>(`/api/community/${encodeURIComponent(slug)}/health`),

  /** Admin: un-claim a node (revoke ownership) without deleting it. */
  revokeOwnership: (slug: string, personId: string) =>
    req<{ success: boolean; revoked: boolean }>(
      `/api/community/${encodeURIComponent(slug)}/nodes/${encodeURIComponent(personId)}/revoke-ownership`,
      { method: 'POST' },
    ),

  /** Admin: delete an already-un-claimed node in this community. */
  deleteNode: (slug: string, personId: string) =>
    req<{ success: boolean }>(
      `/api/community/${encodeURIComponent(slug)}/nodes/${encodeURIComponent(personId)}`,
      { method: 'DELETE' },
    ),

  /** Admin: delete a user — revoke all access + anonymise the account (the node
   *  is kept). Not undoable. */
  deleteUser: (slug: string, userId: string) =>
    req<{ success: boolean }>(
      `/api/community/${encodeURIComponent(slug)}/users/${encodeURIComponent(userId)}`,
      { method: 'DELETE' },
    ),

  /** Admin-only: promote/demote a member (owner can grant admin). */
  setMemberRole: (slug: string, userId: string, role: 'admin' | 'member') =>
    req<{ success: true }>(
      `/api/community/${encodeURIComponent(slug)}/members/${encodeURIComponent(userId)}`,
      { method: 'PUT', body: JSON.stringify({ role }) },
    ),

  /** Admin-only: remove a member from the community. */
  removeMember: (slug: string, userId: string) =>
    req<{ success: true }>(
      `/api/community/${encodeURIComponent(slug)}/members/${encodeURIComponent(userId)}`,
      { method: 'DELETE' },
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

  // ── Homes — who lives together, independent of lineage (admin only) ──────────

  /** Admin: every home in the community with members + head. */
  homes: (slug: string) =>
    req<{ homes: CommunityHome[] }>(`/api/community/${encodeURIComponent(slug)}/homes`),

  /** Admin: create a home from a set of people + a city. */
  createHome: (slug: string, b: { name?: string; city: string; state?: string; country?: string; person_ids: string[] }) =>
    req<{ id: string }>(
      `/api/community/${encodeURIComponent(slug)}/homes`,
      { method: 'POST', body: JSON.stringify(b) },
    ),

  /** Admin: rename / change a home's location. */
  updateHome: (slug: string, id: string, b: { name?: string; city?: string; state?: string; country?: string }) =>
    req<{ success: boolean }>(
      `/api/community/${encodeURIComponent(slug)}/homes/${encodeURIComponent(id)}`,
      { method: 'PATCH', body: JSON.stringify(b) },
    ),

  /** Admin: delete a home (members are detached, not deleted). */
  deleteHome: (slug: string, id: string) =>
    req<{ success: boolean }>(
      `/api/community/${encodeURIComponent(slug)}/homes/${encodeURIComponent(id)}`,
      { method: 'DELETE' },
    ),

  /** Admin: add people to a home (each moves out of any prior home). */
  addHomeMembers: (slug: string, id: string, person_ids: string[]) =>
    req<{ success: boolean }>(
      `/api/community/${encodeURIComponent(slug)}/homes/${encodeURIComponent(id)}/members`,
      { method: 'POST', body: JSON.stringify({ person_ids }) },
    ),

  /** Admin: remove one person from a home. */
  removeHomeMember: (slug: string, id: string, personId: string) =>
    req<{ success: boolean }>(
      `/api/community/${encodeURIComponent(slug)}/homes/${encodeURIComponent(id)}/members/${encodeURIComponent(personId)}`,
      { method: 'DELETE' },
    ),

  /** Admin: search community people by name (used to add someone to a home). */
  searchPersons: (slug: string, q: string) =>
    req<{ results: { id: string; full_name: string; photo_url: string | null; current_city: string | null; gotra: string | null }[] }>(
      `/api/community/${encodeURIComponent(slug)}/persons?q=${encodeURIComponent(q)}`,
    ),
}
