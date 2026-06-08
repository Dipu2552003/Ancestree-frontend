import { req } from './client'

export const invite = {
  lookup: (token: string) =>
    req<{
      full_name:               string
      family_name:             string
      birth_year:              number | null
      photo_url:               string | null
      inviter_full_name:       string | null
      inviter_father_name:     string | null
      inviter_native_village:  string | null
      inviter_current_city:    string | null
    }>(
      `/api/invite/lookup?token=${encodeURIComponent(token)}`,
    ),

  claim: (token: string) =>
    req<{ success: boolean; person_id: string; family_id: string; full_name: string; token: string }>(
      '/api/invite/claim', { method: 'POST', body: JSON.stringify({ token }) },
    ),

  signupAndClaim: (b: { email: string; password: string; display_name: string; invite_token: string }) =>
    req<{ token: string; user: Record<string, unknown> }>(
      '/api/invite/signup-and-claim', { method: 'POST', body: JSON.stringify(b) },
    ),
}
