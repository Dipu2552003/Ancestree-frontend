import type { Node, Edge } from '@xyflow/react'
import type { PersonData, EdgeData } from '@/types'

// ── Collapse helpers ──────────────────────────────────────────────────────────

/** Builds a map from each collapsed person ID → their couple node ID. */
export function buildCollapseMap(edges: Edge[], collapsedUnitKeys: Set<string>): Map<string, string> {
  const map = new Map<string, string>()
  for (const e of edges) {
    const rel = (e.data as unknown as EdgeData)?.relType
    if (rel !== 'SPOUSE_OF') continue
    const key = [e.source, e.target].sort().join('|')
    if (!collapsedUnitKeys.has(key)) continue
    const coupleId = `couple_${key}`
    map.set(e.source, coupleId)
    map.set(e.target, coupleId)
  }
  return map
}

/**
 * Rewrites edges so collapsed person IDs are replaced by their couple node ID.
 * Removes SPOUSE_OF within a collapsed unit and PARENT_OF from a collapsed parent
 * to their (now hidden) children.
 */
export function remapEdgesForCollapse(edges: Edge[], collapseMap: Map<string, string>): Edge[] {
  if (collapseMap.size === 0) return edges
  const collapsedPersonIds = new Set(collapseMap.keys())
  const result: Edge[] = []
  const seen = new Set<string>()

  for (const e of edges) {
    const rel = (e.data as unknown as EdgeData)?.relType

    // SPOUSE_OF within same collapsed unit → drop
    if (rel === 'SPOUSE_OF') {
      const sc = collapseMap.get(e.source)
      const tc = collapseMap.get(e.target)
      if (sc && tc && sc === tc) continue
    }

    // PARENT_OF where source is a collapsed person → children are hidden, drop
    if (rel === 'PARENT_OF' && collapsedPersonIds.has(e.source)) continue

    const src = collapseMap.get(e.source) ?? e.source
    const tgt = collapseMap.get(e.target) ?? e.target
    if (src === tgt) continue

    const id = `r_${src}_${tgt}`
    if (seen.has(id)) continue
    seen.add(id)
    result.push({ ...e, id, source: src, target: tgt })
  }
  return result
}

export function bfsDelays(nodes: Node[], edges: Edge[]): Map<string, number> {
  const selfId = nodes.find(n => (n.data as Record<string, unknown>).isSelf)?.id
  if (!selfId) return new Map(nodes.map(n => [n.id, 0]))

  const adj = new Map<string, string[]>()
  for (const n of nodes) adj.set(n.id, [])
  for (const e of edges) {
    const rel = (e.data as unknown as EdgeData)?.relType
    if (rel === 'PARENT_OF' || rel === 'SPOUSE_OF') {
      adj.get(e.source)?.push(e.target)
      adj.get(e.target)?.push(e.source)
    }
  }

  const delays = new Map<string, number>([[selfId, 0]])
  const queue: Array<{ id: string; depth: number }> = [{ id: selfId, depth: 0 }]
  while (queue.length > 0) {
    const { id, depth } = queue.shift()!
    for (const nb of adj.get(id) ?? []) {
      if (!delays.has(nb)) {
        delays.set(nb, (depth + 1) * 140)
        queue.push({ id: nb, depth: depth + 1 })
      }
    }
  }
  const maxDelay = Math.max(0, ...[...delays.values()])
  for (const n of nodes) {
    if (!delays.has(n.id)) delays.set(n.id, maxDelay + 140)
  }
  return delays
}

export function buildDisplayEdges(nodes: Node[], edges: Edge[]): Edge[] {
  const posMap   = new Map(nodes.map(n => [n.id, n.position]))
  const delayMap = new Map(nodes.map(n => [n.id, ((n.data as unknown as PersonData).animDelay ?? 0)]))
  const parentsOf  = new Map<string, string[]>()
  const childrenOf = new Map<string, string[]>()

  const edgeDelay = (a: string, b: string) =>
    Math.max(delayMap.get(a) ?? 0, delayMap.get(b) ?? 0) + 70

  for (const e of edges) {
    const rel = (e.data as unknown as EdgeData)?.relType
    if (rel === 'PARENT_OF') {
      if (!parentsOf.has(e.target))  parentsOf.set(e.target, [])
      if (!childrenOf.has(e.source)) childrenOf.set(e.source, [])
      parentsOf.get(e.target)!.push(e.source)
      childrenOf.get(e.source)!.push(e.target)
    }
  }

  const coveredParentIds = new Set<string>()
  const coveredSpouseIds = new Set<string>()
  const familyEdges: Edge[] = []
  const processedPairs = new Set<string>()

  for (const e of edges) {
    const rel = (e.data as unknown as EdgeData)?.relType
    if (rel !== 'SPOUSE_OF') continue

    const pairKey = [e.source, e.target].sort().join('|')
    if (processedPairs.has(pairKey)) continue
    processedPairs.add(pairKey)

    const myKids     = new Set(childrenOf.get(e.source) ?? [])
    const sharedKids = (childrenOf.get(e.target) ?? []).filter(c => myKids.has(c))
    if (sharedKids.length === 0) continue

    familyEdges.push({
      id: `family-${pairKey}`,
      source: e.source,
      target: e.target,
      type: 'familyEdge',
      data: { sharedChildren: sharedKids, animDelay: edgeDelay(e.source, e.target) },
    } as Edge)

    coveredSpouseIds.add(e.id)
    for (const kid of sharedKids) {
      for (const parentId of (parentsOf.get(kid) ?? [])) {
        const pe = edges.find(x =>
          x.source === parentId && x.target === kid &&
          (x.data as unknown as EdgeData)?.relType === 'PARENT_OF'
        )
        if (pe) coveredParentIds.add(pe.id)
      }
    }
  }

  const result: Edge[] = [...familyEdges]

  for (const e of edges) {
    const rel = (e.data as unknown as EdgeData)?.relType
    if (rel === 'SIBLING_OF')        continue
    if (coveredSpouseIds.has(e.id))  continue
    if (coveredParentIds.has(e.id))  continue

    const d = edgeDelay(e.source, e.target)
    if (rel === 'PARENT_OF') {
      result.push({ ...e, sourceHandle: 'bottom', targetHandle: 'top', data: { ...(e.data as unknown as EdgeData), animDelay: d } })
    } else if (rel === 'SPOUSE_OF') {
      const sp = posMap.get(e.source)
      const tp = posMap.get(e.target)
      result.push(sp && tp && sp.x <= tp.x
        ? { ...e, sourceHandle: 'right-s', targetHandle: 'left',  data: { ...(e.data as unknown as EdgeData), animDelay: d } }
        : { ...e, sourceHandle: 'left-s',  targetHandle: 'right', data: { ...(e.data as unknown as EdgeData), animDelay: d } }
      )
    } else {
      result.push({ ...e, data: { ...(e.data as unknown as EdgeData), animDelay: d } })
    }
  }

  return result
}
