// ── Shared API response types ─────────────────────────────────────

export type ConflictType =
  | 'double_parent'
  | 'double_spouse'
  | 'parent_sibling_paradox'
  | 'cycle'
  | 'secondary_duplicate'
  | 'claimed_orphan'

export interface SearchResult {
  id:            string
  full_name:     string
  family_name:   string
  birth_year:    number | null
  node_state:    string
  photo_url:     string | null
  /** True when this person belongs to the requester's own family. */
  is_own_family: boolean
  /** First-recorded PARENT_OF source (prefers male), null if no parent linked. */
  father_name:    string | null
  native_village: string | null
  current_city:   string | null
}

export interface MergeConflict {
  type:             ConflictType
  severity:         'warning' | 'error'
  message:          string
  affected_persons: string[]
}

export interface PotentialMatch {
  id:             string
  full_name:      string
  birth_year:     number | null
  native_village: string | null
  current_city:   string | null
  gotra:          string | null
  gender:         string | null
  photo_url:      string | null
  father_name:    string | null
  family_name:    string
  family_id:      string
  member_count:   number
  match_score:    number
  matched_fields: string[]
}

/** A possible duplicate found in the SAME family when adding a node. */
export interface SameTreeMatch {
  id:             string
  full_name:      string
  birth_year:     number | null
  gotra:          string | null
  gender:         string | null
  photo_url:      string | null
  father_name:    string | null
  match_score:    number
  matched_fields: string[]
}

export interface PossibleMatchNotificationDetails {
  new_person_name:           string
  new_person_birth_year:     number | null
  new_person_native_village: string | null
  new_person_gotra:          string | null
  new_person_photo_url:      string | null
  canonical_person_id:       string
  canonical_person_name:     string
  canonical_family_id:       string
  canonical_family_name:     string
  match_score:               number
  matched_fields:            string[]
}

export interface AppNotification {
  id:                string
  user_id:           string
  type:              'merge_request_received' | 'merge_request_accepted' | 'merge_request_rejected' | 'family_name_changed' | 'claim_suggestion' | 'possible_match_found'
  merge_record_id:   string | null
  related_person_id: string | null
  message:           string
  is_read:           boolean
  created_at:        string
  merge_status:      'proposed' | 'confirmed' | 'rejected' | 'reversed' | null
  details:           PossibleMatchNotificationDetails | null
}

export interface SentMergeRequest {
  id:                    string
  status:                'proposed' | 'confirmed' | 'rejected' | 'reversed'
  canonical_person_name: string
  canonical_family_name: string
  merged_person_name:    string
  created_at:            string
  merged_at:             string | null
}
