import type { Node, Edge } from '@xyflow/react'
import type { PersonData } from '@/types'

export interface NeighborInfo {
  id:        string
  name:      string
  photoUrl:  string | null
  gender:    string | null
  birthYear: number | null
}

export interface PersonSnapshot {
  id:        string
  name:      string
  photoUrl:  string | null
  gender:    string | null
  birthYear: number | null
  parents:   NeighborInfo[]
  spouses:   NeighborInfo[]
  children:  NeighborInfo[]
}

/** Walks the supplied nodes/edges and returns the direct parents, spouses,
 *  and children of `personId`. Pure — same logic regardless of which side of
 *  a merge the snapshot represents. Used by the merge preview modal to
 *  visualise both halves of an impending merge. */
export function extractDirectRelations(
  personId: string,
  nodes:    Node[],
  edges:    Edge[],
): PersonSnapshot {
  const nodeMap = new Map(nodes.map(n => [n.id, n.data as unknown as PersonData]))
  const self    = nodeMap.get(personId)

  const asNeighbor = (id: string): NeighborInfo | null => {
    const d = nodeMap.get(id)
    if (!d) return null
    return {
      id,
      name:      d.fullName ?? '',
      photoUrl:  d.photoUrl ?? null,
      gender:    d.gender ?? null,
      birthYear: d.birthYear ?? null,
    }
  }

  const parents:  NeighborInfo[] = []
  const spouses:  NeighborInfo[] = []
  const children: NeighborInfo[] = []

  for (const e of edges) {
    const rel = (e.data as { relType?: string } | undefined)?.relType
    if (rel === 'PARENT_OF') {
      if (e.target === personId) {
        const n = asNeighbor(e.source); if (n) parents.push(n)
      }
      if (e.source === personId) {
        const n = asNeighbor(e.target); if (n) children.push(n)
      }
    }
    if (rel === 'SPOUSE_OF') {
      const otherId = e.source === personId ? e.target : e.target === personId ? e.source : null
      if (otherId) {
        const n = asNeighbor(otherId); if (n) spouses.push(n)
      }
    }
  }

  const dedupe = (arr: NeighborInfo[]): NeighborInfo[] => {
    const seen = new Set<string>()
    return arr.filter(n => (seen.has(n.id) ? false : (seen.add(n.id), true)))
  }

  return {
    id:        personId,
    name:      self?.fullName ?? '',
    photoUrl:  self?.photoUrl ?? null,
    gender:    self?.gender ?? null,
    birthYear: self?.birthYear ?? null,
    parents:   dedupe(parents),
    spouses:   dedupe(spouses),
    children:  dedupe(children),
  }
}
