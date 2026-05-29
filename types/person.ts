export type NodeState = 'proxy' | 'invited' | 'claimed'

export interface PersonData {
  fullName: string
  nickname?: string
  gender?: string
  birthYear?: number
  birthPlace?: string
  deathYear?: number
  isAlive: boolean
  isDeceased: boolean
  nodeState: NodeState
  isSelf: boolean
  relationshipToSelf: string
  canEdit?: boolean
  canDelete?: boolean
  canInvite?: boolean
  photoUrl?: string
  animDelay?: number
  gotra?: string
  nativeVillage?: string
  currentCity?: string
  currentCountry?: string
  occupation?: string
  bio?: string
  education?: string
}

export interface SavePayload {
  fullName: string
  nickname?: string | null
  gender?: string | null
  birthYear?: number | null
  birthPlace?: string | null
  isDeceased: boolean
  isAlive: boolean
  deathYear?: number | null
  photoUrl?: string | null
  gotra?: string | null
  nativeVillage?: string | null
  currentCity?: string | null
  currentCountry?: string | null
  occupation?: string | null
  bio?: string | null
  education?: string | null
}

export interface EdgeData {
  relType: 'PARENT_OF' | 'SPOUSE_OF' | 'SIBLING_OF'
  animDelay?: number
  sharedChildren?: string[]
}
