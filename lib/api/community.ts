import { req } from './client'

export interface CommunityInfo {
  id:           string
  name:         string
  slug:         string
  description:  string | null
  member_count: number
  member_limit?: number
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
      community: { id: string; name: string; slug: string }
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
    email: string; password: string; display_name: string; invite_code?: string
  }) =>
    req<CommunitySession>(`/api/community/${encodeURIComponent(slug)}/signup`, {
      method: 'POST', body: JSON.stringify(b),
    }),
}
