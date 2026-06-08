import { req } from './client'
import type { PotentialMatch } from './types'

export const persons = {
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
    bio_mother_name?: string | null
    bio_father_name?: string | null
  }) => req<{ id: string; potential_matches?: PotentialMatch[] }>(`/api/persons/${id}`, {
    method: 'PATCH', body: JSON.stringify(b),
  }),

  delete: (id: string) => req<{ success: boolean }>(`/api/persons/${id}`, {
    method: 'DELETE',
  }),

  generateInvite: (id: string) =>
    req<{ invite_token: string }>(`/api/persons/${id}/invite`, { method: 'POST' }),

  /** Atomic re-mother for Flow E Phase 3. new_mother_id: null = "Unknown". */
  reparent: (fatherId: string, changes: { child_id: string; new_mother_id: string | null }[]) =>
    req<{ updated: number; skipped: number }>(`/api/persons/${fatherId}/reparent`, {
      method: 'POST', body: JSON.stringify({ changes }),
    }),
}
