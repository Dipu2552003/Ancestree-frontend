// Frontend mirror of the backend delete rule (persons.service.ts R-A1):
// a person can be removed only if doing so doesn't break the tree apart —
// i.e. they are not the bridge between parts of the family. Edge nodes pass
// (top ancestors, leaf children, childless spouses — and a parent whose
// children stay connected through the other parent).
//
// Used to grey out the trash button before the backend ever gets asked, and
// to tell the confirm popup when children will remain via the other parent.

import type { Node, Edge } from '@xyflow/react'
import type { PersonData, EdgeData } from '@/types'
import { isGhostNodeId, realIdFromGhost } from './ghostNodes'

export interface DeleteCheck {
  /** False when the person bridges parts of the tree. */
  deletable: boolean
  /** Other-parent name when the person has children that stay connected
   *  through them — the confirm popup mentions it. */
  childrenStayWith: string | null
}

const isPseudoId = (id: string) =>
  id.startsWith('couple_') || id.startsWith('__load_more') || isGhostNodeId(id)

const toRealId = (id: string) => (isGhostNodeId(id) ? realIdFromGhost(id) : id)

function countComponents(ids: Set<string>, pairs: [string, string][]): number {
  const adj = new Map<string, string[]>()
  for (const [a, b] of pairs) {
    if (!ids.has(a) || !ids.has(b)) continue
    if (!adj.has(a)) adj.set(a, [])
    if (!adj.has(b)) adj.set(b, [])
    adj.get(a)!.push(b)
    adj.get(b)!.push(a)
  }
  const seen = new Set<string>()
  let components = 0
  for (const start of ids) {
    if (seen.has(start)) continue
    components++
    const stack = [start]
    seen.add(start)
    while (stack.length > 0) {
      const cur = stack.pop()!
      for (const next of adj.get(cur) ?? []) {
        if (!seen.has(next)) { seen.add(next); stack.push(next) }
      }
    }
  }
  return components
}

export function checkDeletable(nodeId: string, nodes: Node[], edges: Edge[]): DeleteCheck {
  const targetId = toRealId(nodeId)

  const all = new Set(nodes.filter(n => !isPseudoId(n.id)).map(n => n.id))
  const pairs: [string, string][] = edges
    .map(e => [toRealId(e.source), toRealId(e.target)] as [string, string])
    .filter(([a, b]) => a !== b)

  let deletable = true
  if (all.has(targetId)) {
    const remaining = new Set(all)
    remaining.delete(targetId)
    if (remaining.size > 0) {
      // Compare component counts (not strict connectivity) so an already-split
      // graph doesn't block every delete. Removing an edge node keeps the
      // count; removing a bridge raises it.
      deletable = countComponents(remaining, pairs) <= countComponents(all, pairs)
    }
  }

  // When deletable and the person has children, find the other parent the
  // children remain linked to (the "spouse keeps the kids connected" case).
  let childrenStayWith: string | null = null
  if (deletable) {
    const childIds = edges
      .filter(e => (e.data as EdgeData | undefined)?.relType === 'PARENT_OF' && toRealId(e.source) === targetId)
      .map(e => toRealId(e.target))
    for (const childId of childIds) {
      const otherParentId = edges.find(e =>
        (e.data as EdgeData | undefined)?.relType === 'PARENT_OF' &&
        toRealId(e.target) === childId &&
        toRealId(e.source) !== targetId,
      )?.source
      if (otherParentId) {
        const parent = nodes.find(n => toRealId(n.id) === toRealId(otherParentId))
        childrenStayWith = (parent?.data as PersonData | undefined)?.fullName ?? null
        break
      }
    }
  }

  return { deletable, childrenStayWith }
}
