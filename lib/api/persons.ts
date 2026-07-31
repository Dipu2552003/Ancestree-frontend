import { req } from './client'
import type { PotentialMatch, SameTreeMatch } from './types'

export const persons = {
  create: (b: {
    full_name: string
    first_name?: string
    last_name?: string
    gender?: string
    birth_year?: number
    is_alive?: boolean
    gotra?: string
  }) => req<{ id: string; person_code: string; potential_matches: PotentialMatch[]; same_tree_matches?: SameTreeMatch[] }>('/api/persons', {
    method: 'POST', body: JSON.stringify(b),
  }),

  update: (id: string, b: {
    full_name?: string
    first_name?: string | null
    middle_name?: string | null
    last_name?: string | null
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
    current_district?: string | null
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
    photo_thumbnail_url?: string | null
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

  /** Manual sibling order — ALL of the parent's children, eldest first. */
  reorderChildren: (parentId: string, orderedChildIds: string[]) =>
    req<{ updated: number }>(`/api/persons/${parentId}/children/reorder`, {
      method: 'POST', body: JSON.stringify({ ordered_child_ids: orderedChildIds }),
    }),

  /**
   * Admin bulk edit over a set of person ids, recorded as one undoable operation.
   *   scope 'bloodline' — a paternal line (gotra/village only).
   *   scope 'selection' — a hand-picked set (gotra/village + current location).
   */
  bulkUpdate: (b: {
    person_ids: string[]
    scope: 'bloodline' | 'selection'
    gotra?: string
    native_village?: string
    current_city?: string
    current_district?: string
    current_state?: string
    current_country?: string
  }) => req<{ updated: number; family_id: string; fields: string[] }>('/api/persons/bulk-update', {
    method: 'POST', body: JSON.stringify(b),
  }),
}
