// Derivation helpers used by callers to convert the graph's raw edges + nodes
// into the shape the wizard needs. Exported up through SecondSpouseWizard.tsx
// for backwards-compatible imports.

import type { Edge } from '@xyflow/react'
import type { EdgeData } from '@/types'
import type { ExistingChild, ExistingSpouse } from './types'

// Find every child of the anchor + figure out who the other parent (mother)
// of each is, so Phase 3 can offer re-mother options. The "other parent" is
// the source of the PARENT_OF edge that points to the child but isn't the
// anchor.
export function deriveChildrenFromEdges(
  anchorId: string,
  edges: Edge[],
  nodes: { id: string; data: { fullName?: string; photoUrl?: string | null } }[],
): ExistingChild[] {
  const nodeMap = new Map(nodes.map(n => [n.id, n.data]))
  const childIds = edges
    .filter(e => (e.data as unknown as EdgeData)?.relType === 'PARENT_OF' && e.source === anchorId)
    .map(e => e.target)

  return childIds.map(childId => {
    const otherParent = edges.find(e =>
      (e.data as unknown as EdgeData)?.relType === 'PARENT_OF' &&
      e.target === childId &&
      e.source !== anchorId,
    )
    const motherId   = otherParent?.source ?? null
    const motherName = motherId ? (nodeMap.get(motherId)?.fullName ?? null) : null
    const childData  = nodeMap.get(childId)
    return {
      personId:           childId,
      fullName:           childData?.fullName ?? '',
      photoUrl:           childData?.photoUrl ?? null,
      currentMotherId:    motherId,
      currentMotherName:  motherName,
    }
  })
}

// Active SPOUSE_OF rels on the anchor. The treatment of `isActive`:
// `false` excludes the rel; undefined defaults to active (legacy rows).
export function deriveActiveSpousesFromEdges(
  anchorId: string,
  edges: Edge[],
  nodes: { id: string; data: { fullName?: string; isAlive?: boolean } }[],
): ExistingSpouse[] {
  const nodeMap = new Map(nodes.map(n => [n.id, n.data]))
  return edges
    .filter(e => {
      const d = e.data as unknown as EdgeData | undefined
      if (d?.relType !== 'SPOUSE_OF') return false
      if (e.source !== anchorId && e.target !== anchorId) return false
      return d?.isActive !== false
    })
    .map(e => {
      const otherId = e.source === anchorId ? e.target : e.source
      const other   = nodeMap.get(otherId)
      return {
        relationshipId: e.id,
        personId:       otherId,
        fullName:       other?.fullName ?? '',
        isAlive:        other?.isAlive ?? true,
        subType:        (e.data as unknown as EdgeData)?.subType ?? 'married',
      }
    })
}
