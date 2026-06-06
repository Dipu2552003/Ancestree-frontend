import type { Node, Edge } from '@xyflow/react'
import type { PersonData, EdgeData } from '@/types'

// ── Collapse helpers ──────────────────────────────────────────────────────────

/** Builds a map from each collapsed person ID → their couple node ID.
 *  Multi-spouse anchors are skipped: they belong to an extended unit, not a
 *  1:1 couple, and collapsing one of their pair-keys would corrupt edges. */
export function buildCollapseMap(edges: Edge[], collapsedUnitKeys: Set<string>): Map<string, string> {
  const spouseCount = new Map<string, number>()
  for (const e of edges) {
    if ((e.data as unknown as EdgeData)?.relType !== 'SPOUSE_OF') continue
    spouseCount.set(e.source, (spouseCount.get(e.source) ?? 0) + 1)
    spouseCount.set(e.target, (spouseCount.get(e.target) ?? 0) + 1)
  }
  const isMultiSpouse = (id: string) => (spouseCount.get(id) ?? 0) >= 2

  const map = new Map<string, string>()
  for (const e of edges) {
    const rel = (e.data as unknown as EdgeData)?.relType
    if (rel !== 'SPOUSE_OF') continue
    const key = [e.source, e.target].sort().join('|')
    if (!collapsedUnitKeys.has(key)) continue
    if (isMultiSpouse(e.source) || isMultiSpouse(e.target)) continue
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

  // ── Adoption rule ───────────────────────────────────────────────────────────
  // When a child has at least one 'adopted' PARENT_OF edge, the 'biological'
  // edges to that child are hidden from the layout. The biological data is
  // still in the DB — useful for the child's own records — but the visible
  // tree shows only the adoptive parents.
  const adoptedChildIds = new Set<string>()
  for (const e of edges) {
    const d = e.data as unknown as EdgeData | undefined
    if (d?.relType === 'PARENT_OF' && d?.subType === 'adopted') {
      adoptedChildIds.add(e.target)
    }
  }
  const isHiddenBioEdge = (e: Edge): boolean => {
    const d = e.data as unknown as EdgeData | undefined
    return d?.relType === 'PARENT_OF'
      && d?.subType === 'biological'
      && adoptedChildIds.has(e.target)
  }

  for (const e of edges) {
    const rel = (e.data as unknown as EdgeData)?.relType
    if (rel === 'PARENT_OF') {
      // Skip hidden biological-to-adopted-child edges entirely so they don't
      // contribute to the couple-bracket or the children-of map.
      if (isHiddenBioEdge(e)) continue
      if (!parentsOf.has(e.target))  parentsOf.set(e.target, [])
      if (!childrenOf.has(e.source)) childrenOf.set(e.source, [])
      parentsOf.get(e.target)!.push(e.source)
      childrenOf.get(e.source)!.push(e.target)
    }
  }

  // ── Group SPOUSE_OF edges by person → spouses (every marriage) ──────────────
  // We include ALL spouse statuses (married, divorced, widowed, separated, …)
  // because the user wants every wife clustered visually under one bracket —
  // active or not. This mirrors the layout engine, which also groups regardless
  // of status. Pass B below still uses the active filter for single-couple
  // brackets, so a lone divorced couple won't get drawn as an active bracket.
  const allSpousesOf = new Map<string, Array<{ spouseId: string; edgeId: string }>>()
  for (const e of edges) {
    const data = e.data as unknown as EdgeData | undefined
    if (data?.relType !== 'SPOUSE_OF') continue
    for (const personId of [e.source, e.target]) {
      if (!allSpousesOf.has(personId)) allSpousesOf.set(personId, [])
    }
    allSpousesOf.get(e.source)!.push({ spouseId: e.target, edgeId: e.id })
    allSpousesOf.get(e.target)!.push({ spouseId: e.source, edgeId: e.id })
  }

  const coveredParentIds = new Set<string>()
  const coveredSpouseIds = new Set<string>()
  const familyEdges: Edge[] = []
  const processedPairs = new Set<string>()
  const processedAnchors = new Set<string>()

  // ── Pass A: multi-spouse anchor → ONE combined bracket ──────────────────
  // For Nanmalji + Wife1 + Wife2: build a single FamilyEdge spanning leftmost
  // to rightmost member, with all kids of any (anchor, wifeN) pair pooled. The
  // renderer draws a common horizontal bar below all three cards.
  for (const [anchorId, spouseList] of allSpousesOf) {
    if (spouseList.length < 2) continue
    if (processedAnchors.has(anchorId)) continue

    // Pool kids from EVERY member (anchor + each spouse). We use union (not
    // intersection) because real-world data often records only one parent
    // edge per child — typically PARENT_OF(mother, kid) without the matching
    // PARENT_OF(father, kid). Strict intersection would empty the bracket and
    // fall back to spaghetti arrows.
    const memberIdsForKids = [anchorId, ...spouseList.map(s => s.spouseId)]
    const allKids = new Set<string>()
    for (const m of memberIdsForKids) {
      for (const k of (childrenOf.get(m) ?? [])) allKids.add(k)
    }
    if (allKids.size === 0) continue

    // Sort all members by x so the bar spans leftmost → rightmost.
    const memberIds = [anchorId, ...spouseList.map(s => s.spouseId)]
    const membersSorted = memberIds.slice().sort((a, b) =>
      (posMap.get(a)?.x ?? 0) - (posMap.get(b)?.x ?? 0),
    )

    const sharedKids = [...allKids]
    const animDelay  = Math.max(
      ...membersSorted.map(id => delayMap.get(id) ?? 0),
    ) + 70

    familyEdges.push({
      id: `family-multi-${anchorId}`,
      source: membersSorted[0],
      target: membersSorted[membersSorted.length - 1],
      type:   'familyEdge',
      data: {
        sharedChildren: sharedKids,
        members:        membersSorted,
        animDelay,
      },
    } as Edge)

    // Mark each (anchor, spouseN) pair as already handled.
    for (const { spouseId, edgeId } of spouseList) {
      processedPairs.add([anchorId, spouseId].sort().join('|'))
      coveredSpouseIds.add(edgeId)
      processedAnchors.add(spouseId)
    }
    processedAnchors.add(anchorId)

    // Mark every PARENT_OF feeding these kids as covered (won't render solo).
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

  // ── Pass B: existing single-couple bracket logic ─────────────────────────
  for (const e of edges) {
    const data = e.data as unknown as EdgeData | undefined
    const rel  = data?.relType
    if (rel !== 'SPOUSE_OF') continue

    // Only the active (married|partner|widowed) marriage gets a family bracket.
    // Inactive marriages (divorced/separated/annulled/unknown) fall through to
    // the per-edge renderer below — a dotted line, plus straight PARENT_OF lines
    // for each child of that mother.
    const subType = data?.subType ?? 'married'
    const renderAsCouple =
      data?.isActive !== false &&
      (subType === 'married' || subType === 'partner' || subType === 'widowed')
    if (!renderAsCouple) continue

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
      // Hidden biological-to-adopted-child edge → drop (data lives in DB only).
      if (isHiddenBioEdge(e)) continue
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
