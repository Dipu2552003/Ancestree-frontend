import { req } from './client'

// Family admins — community feature. Clicking the family badge opens the
// admin list; family admins can promote other claimed (owned) nodes.

export interface FamilyAdmin {
  user_id:      string
  display_name: string
  person_id:    string | null
  full_name:    string | null
  photo_url:    string | null
  joined_at:    string
}

export interface FamilyAdminsResponse {
  family_name: string
  admins:      FamilyAdmin[]
  /** True when the requester is an admin of this family and may promote. */
  can_manage:  boolean
}

export const family = {
  admins: (familyId: string) =>
    req<FamilyAdminsResponse>(`/api/family/${familyId}/admins`),

  addAdmin: (familyId: string, personId: string) =>
    req<{ success: boolean; user_id: string; full_name: string }>(
      `/api/family/${familyId}/admins`,
      { method: 'POST', body: JSON.stringify({ person_id: personId }) },
    ),
}
