export type NodeState = 'proxy' | 'invited' | 'claimed'
export type RelationshipType = 'PARENT_OF' | 'SPOUSE_OF' | 'SIBLING_OF'

export interface Person {
  id: string
  fullName: string
  nameNative?: string
  birthYear?: number
  deathYear?: number
  isAlive: boolean
  photoUrl?: string
  bio?: string
  nodeState: NodeState
  isSelf: boolean
  isDeceased: boolean
  generation: number
  relationshipToSelf: string
  canEdit?: boolean
  canInvite?: boolean
}

export interface Relationship {
  id: string
  fromPersonId: string
  toPersonId: string
  relType: RelationshipType
  subType?: string
  isActive: boolean
}

export interface FamilyGraph {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  nodes: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  edges: any[]
  meta: {
    totalPersons: number
    generations: number
    selfNodeId: string
  }
}
