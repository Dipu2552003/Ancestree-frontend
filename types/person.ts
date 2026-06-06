export type NodeState = 'proxy' | 'invited' | 'claimed'

export interface PersonData {
  fullName: string
  firstName?: string
  middleName?: string
  lastName?: string
  nameNative?: string
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
  nodeState: NodeState
  isSelf: boolean
  isViewerNode?: boolean
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
  nameNative?: string | null
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
}

export interface EdgeData {
  relType: 'PARENT_OF' | 'SPOUSE_OF' | 'SIBLING_OF'
  animDelay?: number
  sharedChildren?: string[]
}
