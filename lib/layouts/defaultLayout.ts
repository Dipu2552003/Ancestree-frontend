import type { Node, Edge } from '@xyflow/react'

const H      = 220
const V      = 260
const BASE_Y = 300

type Pos = { x: number; y: number }

function sortCoupleAdjacent(
  ids: string[],
  pos: Map<string, Pos>,
  spousesOf: Map<string, string[]>,
): string[] {
  const byX    = [...ids].sort((a, b) => (pos.get(a)?.x ?? 0) - (pos.get(b)?.x ?? 0))
  const inSet  = new Set(ids)
  const seen   = new Set<string>()
  const result: string[] = []

  for (const id of byX) {
    if (seen.has(id)) continue
    seen.add(id)
    result.push(id)
    const spouse = (spousesOf.get(id) ?? []).find(s => inSet.has(s) && !seen.has(s))
    if (spouse) { seen.add(spouse); result.push(spouse) }
  }
  return result
}

export function defaultLayout(nodes: Node[], edges: Edge[]): Node[] {
  if (nodes.length === 0) return nodes

  const nodeMap = new Map(nodes.map(n => [n.id, n]))
  const d = (id: string) => nodeMap.get(id)!.data as Record<string, unknown>

  const childrenOf = new Map<string, string[]>()
  const parentsOf  = new Map<string, string[]>()
  const spousesOf  = new Map<string, string[]>()
  for (const n of nodes) {
    childrenOf.set(n.id, [])
    parentsOf.set(n.id, [])
    spousesOf.set(n.id, [])
  }
  for (const e of edges) {
    if (!nodeMap.has(e.source) || !nodeMap.has(e.target)) continue
    const rel = (e.data as Record<string, unknown>)?.relType as string
    if (rel === 'PARENT_OF') {
      childrenOf.get(e.source)!.push(e.target)
      parentsOf.get(e.target)!.push(e.source)
    } else if (rel === 'SPOUSE_OF') {
      const s = spousesOf.get(e.source)!
      const t = spousesOf.get(e.target)!
      if (!s.includes(e.target)) s.push(e.target)
      if (!t.includes(e.source)) t.push(e.source)
    }
  }

  const genOf  = (id: string) => (d(id).generation ?? 0) as number
  const selfId = nodes.find(n => (n.data as Record<string, unknown>).isSelf)?.id ?? nodes[0].id
  const Y      = (g: number) => BASE_Y + g * V

  const byGen = new Map<number, string[]>()
  for (const n of nodes) {
    const g = genOf(n.id)
    if (!byGen.has(g)) byGen.set(g, [])
    byGen.get(g)!.push(n.id)
  }
  const genNums = [...byGen.keys()].sort((a, b) => b - a)

  const pos = new Map<string, Pos>()

  // Pass 1: leaf nodes placed sequentially
  let cursor = 0
  for (const g of genNums) {
    for (const id of byGen.get(g)!) {
      if (childrenOf.get(id)!.length === 0) {
        pos.set(id, { x: cursor * H, y: Y(g) })
        cursor++
      }
    }
  }

  // Pass 2a: couple-aware parent placement
  const processedPairs = new Set<string>()
  for (const g of genNums) {
    for (const id of byGen.get(g)!) {
      if (pos.has(id)) continue
      for (const spouseId of spousesOf.get(id)!) {
        if (pos.has(spouseId)) continue
        const pairKey = [id, spouseId].sort().join('|')
        if (processedPairs.has(pairKey)) continue
        processedPairs.add(pairKey)

        const myKids     = new Set(childrenOf.get(id)!)
        const sharedKids = childrenOf.get(spouseId)!.filter(c => myKids.has(c))
        const placed     = sharedKids.filter(c => pos.has(c))
        if (placed.length === 0) continue

        const xs          = placed.map(c => pos.get(c)!.x)
        const childCenter = (Math.min(...xs) + Math.max(...xs)) / 2
        const halfSpan    = Math.max(H / 2, (Math.max(...xs) - Math.min(...xs)) / 2)

        const gA = d(id).gender as string | undefined
        let leftId = id, rightId = spouseId
        if (gA === 'female') { leftId = spouseId; rightId = id }
        else if (gA !== 'male') {
          const gB = d(spouseId).gender as string | undefined
          if (gB === 'male') { leftId = spouseId; rightId = id }
          else if (gB !== 'female' && id > spouseId) { leftId = spouseId; rightId = id }
        }

        pos.set(leftId,  { x: childCenter - halfSpan, y: Y(genOf(leftId)) })
        pos.set(rightId, { x: childCenter + halfSpan, y: Y(genOf(rightId)) })
      }
    }
  }

  // Pass 2b: single parents centered over their children
  for (const g of genNums) {
    for (const id of byGen.get(g)!) {
      if (pos.has(id)) continue
      const placed = childrenOf.get(id)!.filter(c => pos.has(c))
      if (placed.length > 0) {
        const xs = placed.map(c => pos.get(c)!.x)
        pos.set(id, { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: Y(g) })
      }
    }
  }

  // Pass 3: orphans / nodes not yet placed
  for (const n of nodes) {
    if (pos.has(n.id)) continue
    const g      = genOf(n.id)
    const placed = parentsOf.get(n.id)!.filter(p => pos.has(p))
    const x      = placed.length > 0
      ? placed.reduce((s, p) => s + pos.get(p)!.x, 0) / placed.length
      : cursor++ * H
    pos.set(n.id, { x, y: Y(g) })
  }

  // Pass 4: collision resolution per generation (couple-aware)
  for (const g of genNums) {
    const sorted = sortCoupleAdjacent(
      (byGen.get(g) ?? []).filter(id => pos.has(id)),
      pos, spousesOf,
    )
    for (let i = 1; i < sorted.length; i++) {
      const prev = pos.get(sorted[i - 1])!
      const cur  = pos.get(sorted[i])!
      if (cur.x - prev.x < H) {
        pos.set(sorted[i], { x: prev.x + H, y: cur.y })
      }
    }
  }

  // Pass 5: re-center sibling groups after collision resolution
  const siblingsDone = new Set<string>()
  for (const g of genNums) {
    for (const id of byGen.get(g)!) {
      for (const spouseId of spousesOf.get(id)!) {
        const pairKey = [id, spouseId].sort().join('|')
        if (siblingsDone.has(pairKey)) continue
        siblingsDone.add(pairKey)

        const myKids     = new Set(childrenOf.get(id)!)
        const sharedKids = childrenOf.get(spouseId)!.filter(c => myKids.has(c))
        if (sharedKids.length === 0) continue

        const parentCenter  = (pos.get(id)!.x + pos.get(spouseId)!.x) / 2
        const siblingXs     = sharedKids.map(c => pos.get(c)!.x)
        const siblingCenter = (Math.min(...siblingXs) + Math.max(...siblingXs)) / 2
        const shift = parentCenter - siblingCenter
        if (Math.abs(shift) < 1) continue

        for (const kid of sharedKids) {
          const p = pos.get(kid)!
          pos.set(kid, { x: p.x + shift, y: p.y })
        }
      }
    }
  }

  // Pass 6: final collision resolution after re-centering
  for (const g of genNums) {
    const sorted = sortCoupleAdjacent(
      (byGen.get(g) ?? []).filter(id => pos.has(id)),
      pos, spousesOf,
    )
    for (let i = 1; i < sorted.length; i++) {
      const prev = pos.get(sorted[i - 1])!
      const cur  = pos.get(sorted[i])!
      if (cur.x - prev.x < H) {
        pos.set(sorted[i], { x: prev.x + H, y: cur.y })
      }
    }
  }

  // Center entire graph on self
  const selfX = pos.get(selfId)?.x ?? 0
  for (const [id, p] of pos) {
    pos.set(id, { x: p.x - selfX, y: p.y })
  }

  return nodes.map(n => ({ ...n, position: pos.get(n.id) ?? { x: 0, y: 0 } }))
}
