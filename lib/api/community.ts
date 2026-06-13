import { req } from './client'

export interface CommunityInfo {
  id:           string
  name:         string
  slug:         string
  description:  string | null
  member_count: number
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
  getInfo: (slug: string) =>
    req<CommunityInfo>(`/api/community/${encodeURIComponent(slug)}`),

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
