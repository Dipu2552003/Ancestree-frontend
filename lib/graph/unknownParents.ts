import type { Node, Edge } from '@xyflow/react'
import type { EdgeData, PersonData } from '@/types'

/**
 * Unknown-parent injection — keeps parentless sibling groups from floating.
 *
 * A sibling added to an anchor that has NO parents is linked only by a
 * SIBLING_OF edge. That edge is never drawn (see edgeUtils — SIBLING_OF is
 * layout-only), so the siblings sit next to each other with no connecting line
 * and read as "floating".
 *
 * Fix: for each SIBLING_OF-connected group whose members ALL lack a parent,
 * inject one UI-only "Unknown" father node and PARENT_OF edges down to every
 * member. The group then renders as a normal parent→children family bracket.
 *
 * This is a render-only abstraction: the node + edges exist solely in the
 * display pipeline (downstream of rawNodes/rawEdges). The action layer reads
 * rawNodes/rawEdges, so nothing here ever reaches the backend.
 */

export const UNKNOWN_PARENT_PREFIX = '__unknown_parent__'

export function isUnknownParentId(id: string): boolean {
  return id.startsWith(UNKNOWN_PARENT_PREFIX)
}

export function injectUnknownParents(
  nodes: Node[],
  edges: Edge[],
): { nodes: Node[]; edges: Edge[] } {
  const relOf = (e: Edge) => (e.data as unknown as EdgeData)?.relType

  const sibEdges = edges.filter(e => relOf(e) === 'SIBLING_OF')
  if (sibEdges.length === 0) return { nodes, edges }

  // Anyone with a real PARENT_OF parent disqualifies their whole group.
  const hasParent = new Set<string>()
  for (const e of edges) if (relOf(e) === 'PARENT_OF') hasParent.add(e.target)

  const nodeById = new Map(nodes.map(n => [n.id, n]))

  // SIBLING_OF adjacency → connected components via BFS.
  const adj = new Map<string, Set<string>>()
  for (const e of sibEdges) {
    if (!nodeById.has(e.source) || !nodeById.has(e.target)) continue
    if (!adj.has(e.source)) adj.set(e.source, new Set())
    if (!adj.has(e.target)) adj.set(e.target, new Set())
    adj.get(e.source)!.add(e.target)
    adj.get(e.target)!.add(e.source)
  }

  const seen = new Set<string>()
  const newNodes = [...nodes]
  const newEdges = [...edges]

  for (const start of adj.keys()) {
    if (seen.has(start)) continue

    const members: string[] = []
    const queue = [start]
    seen.add(start)
    while (queue.length) {
      const cur = queue.shift()!
      members.push(cur)
      for (const nb of adj.get(cur) ?? []) {
        if (!seen.has(nb)) { seen.add(nb); queue.push(nb) }
      }
    }

    // If any member already has a parent, the group is anchored — skip it.
    if (members.some(m => hasParent.has(m))) continue

    const sorted    = [...members].sort()
    const parentId  = `${UNKNOWN_PARENT_PREFIX}${sorted[0]}`
    const sample    = nodeById.get(sorted[0])!.data as unknown as PersonData
    const animDelay = Math.min(
      ...members.map(m => (nodeById.get(m)!.data as unknown as PersonData).animDelay ?? 0),
    )

    newNodes.push({
      id: parentId,
      type: 'unknownParent',
      position: { x: 0, y: 0 },   // layout engine overwrites
      data: {
        fullName: 'Unknown',
        gender: 'male',
        isAlive: true,
        isDeceased: false,
        nodeState: 'proxy',
        isSelf: false,
        relationshipToSelf: '',
        animDelay,
        isPerspectiveView: sample.isPerspectiveView,
      } as unknown as PersonData,
    } as unknown as Node)

    for (const m of members) {
      newEdges.push({
        id: `${parentId}__po__${m}`,
        source: parentId,
        target: m,
        type: 'sketchEdge',
        data: { relType: 'PARENT_OF', subType: 'biological' } as EdgeData,
      } as unknown as Edge)
    }
  }

  return { nodes: newNodes, edges: newEdges }
}
