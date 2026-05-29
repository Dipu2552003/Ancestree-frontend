import type { Node, Edge } from '@xyflow/react'
import type { EdgeData } from '@/types'
import { computeGenerations } from './computeGenerations'

const H      = 220   // horizontal gap between adjacent nodes
const V      = 260   // vertical gap between generations
const BASE_Y = 300

type Pos = { x: number; y: number }

export function defaultLayout(nodes: Node[], edges: Edge[]): Node[] {
  if (nodes.length === 0) return nodes

  // ── Relationship maps ─────────────────────────────────────────────────
  const nodeMap    = new Map(nodes.map(n => [n.id, n]))
  const d          = (id: string) => nodeMap.get(id)!.data as Record<string, unknown>
  const childrenOf = new Map<string, string[]>()
  const parentsOf  = new Map<string, string[]>()
  const spousesOf  = new Map<string, string[]>()

  for (const n of nodes) {
    childrenOf.set(n.id, [])
    parentsOf.set(n.id, [])
    spousesOf.set(n.id, [])
  }
  console.log('Nodes:', nodes)
  for (const e of edges) {
    if (!nodeMap.has(e.source) || !nodeMap.has(e.target)) continue
    const rel = (e.data as unknown as EdgeData)?.relType
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

  const gens   = computeGenerations(nodes, edges)
  const genOf  = (id: string) => gens.get(id) ?? 0
  const selfId = nodes.find(n => (n.data as Record<string, unknown>).isSelf)?.id ?? nodes[0].id
  const Y      = (g: number) => BASE_Y + g * V

  // ── Group by generation ───────────────────────────────────────────────
  const byGen = new Map<number, string[]>()
  for (const n of nodes) {
    const g = genOf(n.id)
    if (!byGen.has(g)) byGen.set(g, [])
    byGen.get(g)!.push(n.id)
  }
  // Youngest generation first (most-positive gen number first)
  const genNums = [...byGen.keys()].sort((a, b) => b - a)

  const pos = new Map<string, Pos>()

  // ── Pass 1: Bottom-up placement ───────────────────────────────────────
  // For each generation (youngest → oldest):
  //   a) Couples with placed shared children → placed H apart, centered over child midpoint
  //   b) Single parents with placed children → centered over child midpoint
  //   c) Remaining nodes (leaves / no placed children) → sequential from right edge

  for (const g of genNums) {
    const ids       = byGen.get(g)!
    const seenPairs = new Set<string>()

    // Collect couples that have at least one placed shared child
    type CoupleInfo = { leftId: string; rightId: string; centerX: number }
    const couples: CoupleInfo[] = []

    for (const id of ids) {
      for (const spouseId of spousesOf.get(id)!) {
        if (genOf(spouseId) !== g) continue
        const key = [id, spouseId].sort().join('|')
        if (seenPairs.has(key)) continue
        seenPairs.add(key)

        const myKids     = new Set(childrenOf.get(id)!)
        const sharedKids = childrenOf.get(spouseId)!.filter(c => myKids.has(c) && pos.has(c))
        if (sharedKids.length === 0) continue

        const xs      = sharedKids.map(c => pos.get(c)!.x)
        const centerX = (Math.min(...xs) + Math.max(...xs)) / 2

        // Gender ordering: male on left
        const gA = d(id).gender as string | undefined
        let leftId = id, rightId = spouseId
        if (gA === 'female') { leftId = spouseId; rightId = id }
        else if (gA !== 'male') {
          const gB = d(spouseId).gender as string | undefined
          if (gB === 'male')      { leftId = spouseId; rightId = id }
          else if (id > spouseId) { leftId = spouseId; rightId = id }
        }
        couples.push({ leftId, rightId, centerX })
      }
    }

    // Place couples left-to-right in order of their children's centre
    couples.sort((a, b) => a.centerX - b.centerX)

    let rightEdge = -Infinity
    for (const { leftId, rightId, centerX } of couples) {
      if (pos.has(leftId) && pos.has(rightId)) continue
      // Never overlap previously placed nodes — snap right if needed
      const cx = rightEdge === -Infinity ? centerX : Math.max(centerX, rightEdge + H)
      if (!pos.has(leftId))  pos.set(leftId,  { x: cx - H / 2, y: Y(genOf(leftId)) })
      if (!pos.has(rightId)) pos.set(rightId, { x: cx + H / 2, y: Y(genOf(rightId)) })
      rightEdge = cx + H / 2
    }

    // Single parents with placed children
    for (const id of ids) {
      if (pos.has(id)) continue
      const placed = childrenOf.get(id)!.filter(c => pos.has(c))
      if (placed.length === 0) continue
      const xs = placed.map(c => pos.get(c)!.x)
      const cx = (Math.min(...xs) + Math.max(...xs)) / 2
      const x  = rightEdge === -Infinity ? cx : Math.max(cx, rightEdge + H)
      pos.set(id, { x, y: Y(g) })
      rightEdge = x
    }

    // Remaining nodes: leaves / childless — sequential from right edge
    let leafX = rightEdge === -Infinity ? 0 : rightEdge + H
    for (const id of ids) {
      if (pos.has(id)) continue
      pos.set(id, { x: leafX, y: Y(g) })
      leafX += H
    }
  }

  // ── Pass 2: Collision resolution per generation ───────────────────────
  for (const g of genNums) {
    const sorted = [...(byGen.get(g) ?? []).filter(id => pos.has(id))]
      .sort((a, b) => pos.get(a)!.x - pos.get(b)!.x)

    for (let i = 1; i < sorted.length; i++) {
      const prev = pos.get(sorted[i - 1])!
      const cur  = pos.get(sorted[i])!
      if (cur.x - prev.x < H) {
        const need = H - (cur.x - prev.x)
        for (let j = i; j < sorted.length; j++) {
          const p = pos.get(sorted[j])!
          pos.set(sorted[j], { x: p.x + need, y: p.y })
        }
      }
    }
  }

  // ── Pass 3: Re-centre sibling rows under their parents ────────────────
  // After collision resolution a parent couple may have shifted. Re-centre
  // each sibling group under its parents by shifting the children (and all
  // their descendants) as a unit. Process oldest → youngest so ancestor
  // adjustments cascade downward correctly.

  const seenRecentre = new Set<string>()

  function shiftSubtree(rootId: string, dx: number) {
    const visited = new Set<string>()
    const queue   = [rootId]
    while (queue.length) {
      const cur = queue.shift()!
      if (visited.has(cur)) continue
      visited.add(cur)
      const p = pos.get(cur)
      if (p) pos.set(cur, { x: p.x + dx, y: p.y })
      for (const c of childrenOf.get(cur) ?? []) {
        if (!visited.has(c)) queue.push(c)
      }
    }
  }

  for (const g of [...genNums].reverse()) {   // oldest first
    for (const id of byGen.get(g)!) {
      for (const spouseId of spousesOf.get(id)!) {
        if (genOf(spouseId) !== g) continue
        const key = [id, spouseId].sort().join('|')
        if (seenRecentre.has(key)) continue
        seenRecentre.add(key)

        const myKids     = new Set(childrenOf.get(id)!)
        const sharedKids = childrenOf.get(spouseId)!.filter(c => myKids.has(c) && pos.has(c))
        if (sharedKids.length === 0) continue

        const parentMid  = (pos.get(id)!.x + pos.get(spouseId)!.x) / 2
        const xs         = sharedKids.map(c => pos.get(c)!.x)
        const childMid   = (Math.min(...xs) + Math.max(...xs)) / 2
        const shift      = parentMid - childMid
        if (Math.abs(shift) < 1) continue

        for (const kid of sharedKids) shiftSubtree(kid, shift)
      }
    }
  }

  // ── Pass 4: Final collision resolution after re-centering ─────────────
  for (const g of genNums) {
    const sorted = [...(byGen.get(g) ?? []).filter(id => pos.has(id))]
      .sort((a, b) => pos.get(a)!.x - pos.get(b)!.x)

    for (let i = 1; i < sorted.length; i++) {
      const prev = pos.get(sorted[i - 1])!
      const cur  = pos.get(sorted[i])!
      if (cur.x - prev.x < H) {
        const need = H - (cur.x - prev.x)
        for (let j = i; j < sorted.length; j++) {
          const p = pos.get(sorted[j])!
          pos.set(sorted[j], { x: p.x + need, y: p.y })
        }
      }
    }
  }

  // ── Centre entire graph on self ───────────────────────────────────────
  const selfX = pos.get(selfId)?.x ?? 0
  for (const [id, p] of pos) {
    pos.set(id, { x: p.x - selfX, y: p.y })
  }

  return nodes.map(n => ({ ...n, position: pos.get(n.id) ?? { x: 0, y: 0 } }))
}
