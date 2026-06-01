import type { Node, Edge } from '@xyflow/react'
import type { EdgeData, PersonData } from '@/types'

export function applyCoupleFold(
  nodes: Node[],
  edges: Edge[],
  expandedCouples: Set<string>,
): { nodes: Node[]; edges: Edge[] } {
  if (nodes.length === 0) return { nodes, edges }

  const nodeMap = new Map(nodes.map(n => [n.id, n]))
  const d = (id: string) => (nodeMap.get(id)?.data ?? {}) as unknown as PersonData

  // ── Step 1: Find all spouse pairs ────────────────────────────────────────
  const spousePairs = new Map<string, { leftId: string; rightId: string }>()

  for (const edge of edges) {
    const isFamilyEdge = edge.type === 'familyEdge'
    const relType = (edge.data as unknown as EdgeData)?.relType
    if (!isFamilyEdge && relType !== 'SPOUSE_OF') continue

    const pairKey = [edge.source, edge.target].sort().join('|')
    if (spousePairs.has(pairKey)) continue

    const sn = nodeMap.get(edge.source)
    const tn = nodeMap.get(edge.target)
    if (!sn || !tn) continue

    const leftId = sn.position.x <= tn.position.x ? edge.source : edge.target
    const rightId = leftId === edge.source ? edge.target : edge.source
    spousePairs.set(pairKey, { leftId, rightId })
  }

  // ── Step 2: Decide which couples collapse (skip self node, skip expanded) ─
  const collapsedMap = new Map<string, { coupleId: string; leftId: string; rightId: string }>()

  for (const [pairKey, { leftId, rightId }] of spousePairs) {
    if (expandedCouples.has(pairKey)) continue
    // Never collapse the self node — always show it as an individual
    if (d(leftId).isSelf || d(rightId).isSelf) continue
    collapsedMap.set(pairKey, { coupleId: `couple_${pairKey}`, leftId, rightId })
  }

  // ── Step 3: Build personId → coupleId remap ──────────────────────────────
  const personToCoupleId = new Map<string, string>()
  for (const { coupleId, leftId, rightId } of collapsedMap.values()) {
    personToCoupleId.set(leftId, coupleId)
    personToCoupleId.set(rightId, coupleId)
  }
  const collapsedPersonIds = new Set(personToCoupleId.keys())
  const remap = (id: string) => personToCoupleId.get(id) ?? id

  // ── Step 4: Build result nodes ───────────────────────────────────────────
  const resultNodes: Node[] = []
  const addedCoupleIds = new Set<string>()

  for (const node of nodes) {
    if (!collapsedPersonIds.has(node.id)) {
      // Check if this expanded node is the right-half of an expanded couple
      const expandedKey = [...expandedCouples].find(key => {
        const pair = spousePairs.get(key)
        return pair && (pair.leftId === node.id || pair.rightId === node.id)
      })
      if (expandedKey) {
        const pair = spousePairs.get(expandedKey)!
        resultNodes.push({
          ...node,
          data: {
            ...node.data,
            coupleKey: expandedKey,
            isRightOfCouple: node.id === pair.rightId,
          },
        })
      } else {
        resultNodes.push(node)
      }
      continue
    }

    // This person is in a collapsed couple — emit the CoupleNode once
    const coupleId = personToCoupleId.get(node.id)!
    if (addedCoupleIds.has(coupleId)) continue
    addedCoupleIds.add(coupleId)

    const pairEntry = [...collapsedMap.entries()].find(([, v]) => v.coupleId === coupleId)!
    const { leftId, rightId } = pairEntry[1]
    const leftNode = nodeMap.get(leftId)!
    const rightNode = nodeMap.get(rightId)!

    const animDelay = Math.min(
      ((leftNode.data as Record<string, unknown>).animDelay as number) ?? 0,
      ((rightNode.data as Record<string, unknown>).animDelay as number) ?? 0,
    )

    resultNodes.push({
      id: coupleId,
      type: 'coupleNode',
      position: { x: leftNode.position.x, y: leftNode.position.y },
      data: { person1: leftNode.data, person2: rightNode.data, pairKey: pairEntry[0], animDelay },
    } as Node)
  }

  // ── Step 5: Remap edges ──────────────────────────────────────────────────
  const resultEdges: Edge[] = []
  const addedEdgeIds = new Set<string>()

  function pushEdge(e: Edge) {
    if (addedEdgeIds.has(e.id)) return
    addedEdgeIds.add(e.id)
    resultEdges.push(e)
  }

  for (const edge of edges) {
    const isFamilyEdge = edge.type === 'familyEdge'
    const relType = (edge.data as unknown as EdgeData)?.relType
    const pairKey = [edge.source, edge.target].sort().join('|')

    // SPOUSE_OF — drop if collapsed
    if (relType === 'SPOUSE_OF' && collapsedMap.has(pairKey)) continue

    if (isFamilyEdge) {
      if (collapsedMap.has(pairKey)) {
        // Collapsed couple → emit one edge per shared child
        const { coupleId } = collapsedMap.get(pairKey)!
        const children = (edge.data as unknown as { sharedChildren: string[] })?.sharedChildren ?? []
        const animDelay = (edge.data as unknown as { animDelay: number })?.animDelay ?? 0

        for (const childId of children) {
          const target = remap(childId)
          pushEdge({
            id: `cpl-${coupleId}->${target}`,
            source: coupleId,
            target,
            type: 'sketchEdge',
            sourceHandle: 'bottom',
            targetHandle: 'top',
            data: { relType: 'PARENT_OF', animDelay } as unknown as EdgeData,
          } as Edge)
        }
        continue
      }
      // Expanded couple → keep familyEdge as-is
      pushEdge(edge)
      continue
    }

    // Regular edges — remap collapsed node IDs
    const newSource = remap(edge.source)
    const newTarget = remap(edge.target)
    if (newSource === newTarget) continue

    pushEdge({
      ...edge,
      id: `r_${newSource}_${newTarget}_${relType ?? edge.type}`,
      source: newSource,
      target: newTarget,
    })
  }

  return { nodes: resultNodes, edges: resultEdges }
}
