export type NodeState = 'proxy' | 'invited' | 'claimed'

export interface PersonData {
  fullName: string
  firstName?: string
  middleName?: string
  lastName?: string
  nickname?: string
  gender?: string
  gotra?: string
  religion?: string

  birthDate?: string
  birthYear?: number
  birthPlace?: string
  isAlive: boolean
  isDeceased: boolean
  deathDate?: string
  deathYear?: number
  deathPlace?: string

  phone?: string
  whatsapp?: string
  email?: string

  currentAddress?: string
  currentCity?: string
  currentState?: string
  currentCountry?: string
  currentPincode?: string

  nativeVillage?: string
  nativeTehsil?: string
  nativeDistrict?: string
  nativeState?: string
  nativeCountry?: string

  occupation?: string
  occupationDetail?: string
  education?: string
  bio?: string

  photoUrl?: string
  photoThumbnailUrl?: string
  nodeState: NodeState
  isSelf: boolean
  isViewerNode?: boolean
  /** True when this node is a *duplicate render* of another node in the same
   *  tree (used for cousin/intra-family marriages so the spouse line doesn't
   *  cross the canvas). The original person's data is mirrored here; selecting
   *  this node should behave as if the user clicked the real one. */
  isGhost?: boolean
  /** The canonical person ID this ghost mirrors. */
  realPersonId?: string
  /** The partner (anchor) on whose side this ghost is rendered. */
  ghostAnchorId?: string
  relationshipToSelf: string
  canEdit?: boolean
  canEditProfile?: boolean
  canDelete?: boolean
  canInvite?: boolean
  animDelay?: number
  nodeRole?: 'self' | 'spouse' | 'family'
  isMatchHighlight?: boolean
  isSelected?: boolean
}

/** Minimal data about "my" node stored before navigating to exploration mode */
export interface MyPersonInfo {
  fullName:      string
  gender?:       string | null
  birthYear?:    number | null
  nativeVillage?: string | null
  gotra?:        string | null
  photoUrl?:     string | null
}

/** Stored in sessionStorage when navigating to explore / review another tree */
export interface PendingMatchData {
  myPersonId:           string
  myPersonName:         string
  myBirthYear?:         number | null
  myNativeVillage?:     string | null
  myGotra?:             string | null
  myGender?:            string | null
  myPhotoUrl?:          string | null
  matchScore:           number
  matchedFields:        string[]
  canonicalPersonId:    string
  canonicalFamilyName:  string
  canonicalPersonName:  string
  /** 'explore' = initiated from DuplicateFoundModal; 'review' = from notification */
  mode:                 'explore' | 'review'
  mergeRecordId?:       string  // only for 'review' mode
}

export interface SavePayload {
  fullName: string
  firstName?: string | null
  middleName?: string | null
  lastName?: string | null
  nickname?: string | null
  gender?: string | null
  gotra?: string | null
  religion?: string | null

  birthDate?: string | null
  birthYear?: number | null
  birthPlace?: string | null
  isDeceased: boolean
  isAlive: boolean
  deathDate?: string | null
  deathYear?: number | null
  deathPlace?: string | null

  phone?: string | null
  whatsapp?: string | null
  email?: string | null

  currentAddress?: string | null
  currentCity?: string | null
  currentState?: string | null
  currentCountry?: string | null
  currentPincode?: string | null

  nativeVillage?: string | null
  nativeTehsil?: string | null
  nativeDistrict?: string | null
  nativeState?: string | null
  nativeCountry?: string | null

  occupation?: string | null
  occupationDetail?: string | null
  education?: string | null
  bio?: string | null

  photoUrl?: string | null
  photoThumbnailUrl?: string | null
}

export type SpouseSubType =
  | 'married' | 'partner' | 'divorced' | 'widowed' | 'separated' | 'annulled' | 'unknown'

export interface EdgeData {
  relType: 'PARENT_OF' | 'SPOUSE_OF' | 'SIBLING_OF'
  /** SPOUSE_OF: status; PARENT_OF: biological/adopted/step; SIBLING_OF: full/half */
  subType?: string | null
  /** Derived: a SPOUSE_OF marriage that is current (married/partner). */
  isActive?: boolean
  animDelay?: number
  sharedChildren?: string[]
  /** Family-bracket member IDs (all parents in the couple group, left-to-right).
   *  When >2, the bracket renders a single horizontal bar under everyone. */
  members?: string[]
  /** Gotra of the source (parent/anchor) node — stamped by buildDisplayEdges.
   *  Used by SketchEdge / FamilyEdge when gotraMode === 'edge'. */
  sourceGotra?: string | null
}
