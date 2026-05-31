/**
 * Family tree layout engine — Reingold-Tilford style, adapted for couple units.
 *
 * RULES (single source of truth for all views):
 *  1. Generations are rows — all nodes at gen G share the same Y.
 *  2. A married couple is one logical "unit"; solo nodes are their own unit.
 *  3. A unit is always horizontally centered above its children.
 *  4. Siblings are contiguous — no unrelated node is interleaved between them.
 *  5. Minimum horizontal gap (H_GAP) is enforced between every adjacent node.
 *  6. Conflict between subtrees is resolved by comparing left/right contours
 *     (Reingold-Tilford), pushing the right subtree the minimum amount needed.
 *  7. Disconnected / relative nodes are appended to the far right of their row.
 *  8. The graph is centered on the perspective anchor (self / mother / spouse).
 */

import type { Node, Edge } from '@xyflow/react'
import type { EdgeData } from '@/types'
import { computeGenerations } from './computeGenerations'

export type PerspectiveType = 'self' | 'mother' | 'spouse'

// ── Constants ────────────────────────────────────────────────────────────────
const NODE_W = 110   // node card width  (px)
const H_GAP  = 40    // min gap between adjacent node cards
const STEP   = NODE_W + H_GAP   // 150 px per slot
const V      = 260   // vertical distance between generations
const BASE_Y = 300   // y of generation 0

type Pos = { x: number; y: number }

// ── Couple unit ───────────────────────────────────────────────────────────────
interface CoupleUnit {
  left:     string          // left person id (male or first added)
  right:    string | null   // spouse id; null for solo nodes
  children: string[]        // ordered child ids (shared by the couple)
  // Reingold-Tilford scratch
  x:        number          // final absolute x (center of unit)
  prelim:   number
  mod:      number
  shift:    number
  change:   number
  parent:   CoupleUnit | null
  index:    number          // position among siblings
  gen:      number
}

// ── Main export ───────────────────────────────────────────────────────────────
export function layoutEngine(
  nodes: Node[],
  edges: Edge[],
  perspective: PerspectiveType = 'self',
): Node[] {
  if (nodes.length === 0) return nodes

  // ── Relationship maps ────────────────────────────────────────────────────
  const nodeMap    = new Map(nodes.map(n => [n.id, n]))
  const d          = (id: string) => (nodeMap.get(id)?.data ?? {}) as Record<string, unknown>
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

  const gens  = computeGenerations(nodes, edges)
  const genOf = (id: string) => gens.get(id) ?? 0
  const selfId = nodes.find(n => (n.data as Record<string, unknown>).isSelf)?.id ?? nodes[0].id

  // ── Resolve perspective anchor ───────────────────────────────────────────
  // The anchor is the node the graph is horizontally centered on.
  function resolveAnchor(): string {
    if (perspective === 'mother') {
      const parents = parentsOf.get(selfId) ?? []
      const maaId =
        parents.find(p => d(p).gender === 'female') ??
        parents.find(p => p !== (parents.find(q => d(q).gender === 'male') ?? '')) ??
        (() => {
          const papaId = parents.find(p => d(p).gender === 'male') ?? parents[0]
          if (!papaId) return undefined
          const papaSpouses = spousesOf.get(papaId) ?? []
          return papaSpouses.find(s => d(s).gender === 'female') ?? papaSpouses[0]
        })()
      return maaId ?? selfId
    }
    if (perspective === 'spouse') {
      const spouses = spousesOf.get(selfId) ?? []
      return spouses[0] ?? selfId
    }
    return selfId
  }
  const anchorId = resolveAnchor()

  // ── Build couple units ────────────────────────────────────────────────────
  const unitOf    = new Map<string, CoupleUnit>()
  const allUnits: CoupleUnit[] = []
  const seenPairs = new Set<string>()

  function makeUnit(left: string, right: string | null, gen: number): CoupleUnit {
    const u: CoupleUnit = {
      left, right, children: [],
      x: 0, prelim: 0, mod: 0, shift: 0, change: 0,
      parent: null, index: 0, gen,
    }
    allUnits.push(u)
    unitOf.set(left, u)
    if (right) unitOf.set(right, u)
    return u
  }

  for (const n of nodes) {
    if (unitOf.has(n.id)) continue
    const g       = genOf(n.id)
    const spouses = (spousesOf.get(n.id) ?? []).filter(s => genOf(s) === g)

    if (spouses.length === 0) {
      makeUnit(n.id, null, g)
    } else {
      const spouse = spouses[0]
      if (unitOf.has(spouse)) {
        if (!unitOf.has(n.id)) makeUnit(n.id, null, g)
      } else {
        const key = [n.id, spouse].sort().join('|')
        if (!seenPairs.has(key)) {
          seenPairs.add(key)
          const gA = d(n.id).gender as string | undefined
          const gB = d(spouse).gender as string | undefined
          let left = n.id, right = spouse
          if (gA === 'female' && gB !== 'female')  { left = spouse; right = n.id }
          else if (gB === 'male' && gA !== 'male') { left = spouse; right = n.id }
          makeUnit(left, right, g)
        }
      }
    }
  }

  // Assign shared children to each couple unit
  for (const u of allUnits) {
    const leftKids  = new Set(childrenOf.get(u.left) ?? [])
    const rightKids = u.right ? new Set(childrenOf.get(u.right) ?? []) : new Set<string>()
    const shared    = u.right
      ? [...leftKids].filter(c => rightKids.has(c))
      : [...leftKids]
    u.children = shared.sort((a, b) => a.localeCompare(b))
  }

  // ── Wire unit parent↔children links ──────────────────────────────────────
  const unitChildren = new Map<CoupleUnit, CoupleUnit[]>()
  for (const u of allUnits) unitChildren.set(u, [])

  for (const child of allUnits) {
    const ids = child.right ? [child.left, child.right] : [child.left]
    let placed = false
    for (const id of ids) {
      for (const pid of parentsOf.get(id) ?? []) {
        const pu = unitOf.get(pid)
        if (!pu || pu === child) continue
        if (pu.children.some(c => ids.includes(c))) {
          const list = unitChildren.get(pu)!
          if (!list.includes(child)) {
            list.push(child)
            child.parent = pu
            placed = true
          }
          break
        }
      }
      if (placed) break
    }
  }

  // Sort sibling units and assign indexes for stable layout
  for (const [, list] of unitChildren) {
    list.sort((a, b) => a.left.localeCompare(b.left))
    list.forEach((u, i) => { u.index = i })
  }

  // ── Reingold-Tilford layout ───────────────────────────────────────────────

  function unitWidth(u: CoupleUnit): number { return u.right ? STEP * 2 : STEP }
  function unitHalfWidth(u: CoupleUnit): number { return unitWidth(u) / 2 }

  function rightContour(u: CoupleUnit, modAcc: number, depth: number, contour: Map<number, number>) {
    const val = u.prelim + modAcc + unitWidth(u)
    if (!contour.has(depth) || contour.get(depth)! < val) contour.set(depth, val)
    for (const c of unitChildren.get(u) ?? []) rightContour(c, modAcc + u.mod, depth + 1, contour)
  }

  function leftContour(u: CoupleUnit, modAcc: number, depth: number, contour: Map<number, number>) {
    const val = u.prelim + modAcc
    if (!contour.has(depth) || contour.get(depth)! > val) contour.set(depth, val)
    for (const c of unitChildren.get(u) ?? []) leftContour(c, modAcc + u.mod, depth + 1, contour)
  }

  function firstWalk(u: CoupleUnit) {
    const kids = unitChildren.get(u) ?? []
    for (const child of kids) firstWalk(child)

    if (kids.length === 0) {
      if (u.index === 0) {
        u.prelim = 0
      } else {
        // Place to the right of the previous sibling's full right contour, not just its own width.
        const siblings = unitChildren.get(u.parent!) ?? []
        let minPrelim = 0
        for (let i = 0; i < u.index; i++) {
          const leftSib = siblings[i]
          const rc = new Map<number, number>()
          rightContour(leftSib, 0, 0, rc)
          const rightEdge = Math.max(...rc.values(), leftSib.prelim + unitWidth(leftSib))
          minPrelim = Math.max(minPrelim, rightEdge + H_GAP)
        }
        u.prelim = minPrelim
      }
      return
    }

    // Internal: center over children, then resolve conflicts with left siblings
    const firstKid = kids[0]
    const lastKid  = kids[kids.length - 1]
    const kidMid   = (firstKid.prelim + lastKid.prelim + unitWidth(lastKid)) / 2
    const half     = unitHalfWidth(u)

    if (u.index > 0) {
      const prev = (unitChildren.get(u.parent!) ?? [])[u.index - 1]
      u.prelim = prev.prelim + unitWidth(prev) + H_GAP
      u.mod    = u.prelim + half - kidMid
    } else {
      u.prelim = Math.max(0, kidMid - half)
      u.mod    = u.prelim + half - kidMid
    }

    resolveConflicts(u)
  }

  function resolveConflicts(u: CoupleUnit) {
    if (!u.parent || u.index === 0) return
    const siblings = unitChildren.get(u.parent) ?? []
    let totalShift = 0

    for (let i = u.index - 1; i >= 0; i--) {
      const leftSib = siblings[i]
      const rc = new Map<number, number>()
      const lc = new Map<number, number>()
      rightContour(leftSib, 0, 0, rc)
      leftContour(u, 0, 0, lc)

      let needed = 0
      for (const [depth, lcVal] of lc) {
        const rcVal = rc.get(depth)
        if (rcVal !== undefined) needed = Math.max(needed, rcVal - lcVal + H_GAP)
      }
      totalShift = Math.max(totalShift, needed)
    }

    if (totalShift > 0) {
      u.prelim += totalShift
      u.mod    += totalShift
      // Distribute the shift evenly across the gap between siblings
      const numGaps = u.index
      const inc = totalShift / numGaps
      for (let k = 1; k < u.index; k++) {
        siblings[k].shift  += inc
        siblings[k].change -= inc
      }
      u.change += inc
    }
  }

  function secondWalk(u: CoupleUnit, modAcc: number) {
    u.x = u.prelim + modAcc
    modAcc += u.mod
    // Propagate shift/change from apportion
    let shiftAcc = 0
    for (const child of unitChildren.get(u) ?? []) {
      shiftAcc    += child.change
      child.shift += shiftAcc
      child.prelim += child.shift
      child.mod    += child.shift
    }
    for (const child of unitChildren.get(u) ?? []) secondWalk(child, modAcc)
  }

  // ── Layout each connected component (forest roots) ────────────────────────
  const roots = allUnits.filter(u => !u.parent)

  // Reset scratch state before layout
  for (const u of allUnits) {
    u.prelim = 0; u.mod = 0; u.shift = 0; u.change = 0; u.x = 0
  }

  // Compute bounds per root tree
  const treeBounds: Array<{ root: CoupleUnit; minX: number; maxX: number }> = []

  for (const root of roots) {
    firstWalk(root)
    secondWalk(root, 0)

    let minX = Infinity, maxX = -Infinity
    const queue = [root]
    const seen  = new Set<CoupleUnit>()
    while (queue.length) {
      const u = queue.shift()!
      if (seen.has(u)) continue
      seen.add(u)
      minX = Math.min(minX, u.x)
      maxX = Math.max(maxX, u.x + unitWidth(u))
      for (const c of unitChildren.get(u) ?? []) queue.push(c)
    }
    treeBounds.push({ root, minX, maxX })
  }

  // Place trees left-to-right with a gap
  const TREE_GAP = STEP * 2
  let cursor = 0
  const treeOffset = new Map<CoupleUnit, number>()
  for (const { root, minX, maxX } of treeBounds) {
    treeOffset.set(root, cursor - minX)
    cursor += (maxX - minX) + TREE_GAP
  }

  // ── Convert unit positions → per-person pixel positions ──────────────────
  const pos = new Map<string, Pos>()

  for (const { root } of treeBounds) {
    const offset = treeOffset.get(root) ?? 0
    const queue  = [root]
    const seen   = new Set<CoupleUnit>()
    while (queue.length) {
      const u = queue.shift()!
      if (seen.has(u)) continue
      seen.add(u)

      const absX = u.x + offset
      const y    = BASE_Y + u.gen * V

      if (u.right) {
        pos.set(u.left,  { x: absX,         y })
        pos.set(u.right, { x: absX + STEP,   y })
      } else {
        pos.set(u.left, { x: absX, y })
      }

      for (const c of unitChildren.get(u) ?? []) queue.push(c)
    }
  }

  // ── Append any still-unplaced nodes (truly disconnected) ──────────────────
  const unplaced = nodes.filter(n => !pos.has(n.id))
  const byGen    = new Map<number, string[]>()
  for (const n of unplaced) {
    const g = genOf(n.id)
    if (!byGen.has(g)) byGen.set(g, [])
    byGen.get(g)!.push(n.id)
  }
  for (const [g, ids] of byGen) {
    let rightmost = -Infinity
    for (const [id, p] of pos) {
      if (genOf(id) === g) rightmost = Math.max(rightmost, p.x)
    }
    let x = rightmost === -Infinity ? 0 : rightmost + STEP
    for (const id of ids) {
      pos.set(id, { x, y: BASE_Y + g * V })
      x += STEP
    }
  }

  // ── Centre graph on the perspective anchor ────────────────────────────────
  const anchorPos = pos.get(anchorId)
  const anchorX   = anchorPos ? anchorPos.x + NODE_W / 2 : 0

  return nodes.map(n => {
    const p = pos.get(n.id) ?? { x: 0, y: BASE_Y }
    return { ...n, position: { x: p.x - anchorX, y: p.y } }
  })
}
