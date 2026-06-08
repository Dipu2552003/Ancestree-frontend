import type { Node, Edge } from '@xyflow/react'
import type { EdgeData } from '@/types'

/**
 * Visibility computation — decides which person IDs participate in the
 * rendered graph BEFORE layout runs.  Two responsibilities:
 *
 *  1. (Active today) Collapsed couples hide their descendant subtree.
 *     Filtering this out upfront stops the layout engine from parking those
 *     hidden people in its "unplaced" fallback (the floating side-cards bug).
 *
 *  2. (Foundation only) Generation bounds — `maxGenUp` / `maxGenDown` — let
 *     a future lazy-render mode show e.g. only ±5 generations around self,
 *     fetching deeper subtrees on demand.  Defaults to Infinity, so the
 *     parameters are inert until the lazy-render UI is wired up.
 *
 * Self's own ancestor line is never hidden: a couple whose subtree contains
 * self refuses to collapse, matching the rule in `layoutEngine.ts`.
 */

export interface VisibilityOptions {
  /** Max generations above self to include. Reserved for lazy-render. */
  maxGenUp?:   number
  /** Max generations below self to include. Reserved for lazy-render. */
  maxGenDown?: number
}

const relTypeOf = (e: Edge) =>
  (e.data as unknown as EdgeData | undefined)?.relType

interface RelMaps {
  childrenOf: Map<string, string[]>
  parentsOf:  Map<string, string[]>
  spousesOf:  Map<string, string[]>
}

function buildRelMaps(nodes: Node[], edges: Edge[]): RelMaps {
  const childrenOf = new Map<string, string[]>()
  const parentsOf  = new Map<string, string[]>()
  const spousesOf  = new Map<string, string[]>()
  for (const n of nodes) {
    childrenOf.set(n.id, [])
    parentsOf.set(n.id, [])
    spousesOf.set(n.id, [])
  }
  for (const e of edges) {
    const rel = relTypeOf(e)
    if (rel === 'PARENT_OF') {
      childrenOf.get(e.source)?.push(e.target)
      parentsOf.get(e.target)?.push(e.source)
    } else if (rel === 'SPOUSE_OF') {
      spousesOf.get(e.source)?.push(e.target)
      spousesOf.get(e.target)?.push(e.source)
    }
  }
  return { childrenOf, parentsOf, spousesOf }
}

/** Shared (intersection) children of two parents — matches the strict
 *  2-parent couple semantics used in the layout engine. */
function sharedChildren(
  leftId: string, rightId: string,
  childrenOf: Map<string, string[]>,
): string[] {
  const lk = new Set(childrenOf.get(leftId)  ?? [])
  const rk = new Set(childrenOf.get(rightId) ?? [])
  return [...lk].filter(c => rk.has(c))
}

/** True if `needleId` appears anywhere in the subtree rooted at the couple
 *  (the couple's shared children, their descendants, and their spouses). */
function subtreeContains(
  leftId: string, rightId: string, needleId: string,
  maps: RelMaps,
): boolean {
  if (leftId === needleId || rightId === needleId) return true
  const { childrenOf, spousesOf } = maps
  const seen  = new Set<string>()
  const queue = sharedChildren(leftId, rightId, childrenOf)
  while (queue.length) {
    const id = queue.shift()!
    if (id === needleId) return true
    if (seen.has(id)) continue
    seen.add(id)
    for (const c of childrenOf.get(id) ?? []) queue.push(c)
    for (const s of spousesOf.get(id)  ?? []) {
      if (s === needleId) return true
      if (!seen.has(s)) seen.add(s)
    }
  }
  return false
}

/** All descendants of the couple plus their spouses.  The couple's two
 *  members themselves are NOT included — they remain visible as the
 *  collapsed-couple card. */
function descendantsAndSpouses(
  leftId: string, rightId: string,
  maps: RelMaps,
): Set<string> {
  const { childrenOf, spousesOf } = maps
  const hidden = new Set<string>()
  const queue  = sharedChildren(leftId, rightId, childrenOf)
  while (queue.length) {
    const id = queue.shift()!
    if (hidden.has(id)) continue
    hidden.add(id)
    for (const c of childrenOf.get(id) ?? []) queue.push(c)
    for (const s of spousesOf.get(id)  ?? []) hidden.add(s)
  }
  return hidden
}

/**
 * Returns the set of person IDs that should participate in the layout.
 *
 * Algorithm: BFS outward from self via PARENT_OF / SPOUSE_OF edges, never
 * crossing into a person who is hidden by a collapsed couple's subtree.
 * Optional generation bounds prune the BFS at the boundary.
 *
 * The caller hands `collapsedUnitKeys` in the same `[idA, idB].sort().join('|')`
 * format used by the rest of the codebase.
 */
export function computeVisibleSet(
  nodes: Node[],
  edges: Edge[],
  collapsedUnitKeys: Set<string>,
  options: VisibilityOptions = {},
): Set<string> {
  if (nodes.length === 0) return new Set()

  const selfId =
    nodes.find(n => (n.data as Record<string, unknown>).isSelf)?.id ?? nodes[0].id

  const maps = buildRelMaps(nodes, edges)
  const nodeIds = new Set(nodes.map(n => n.id))

  // ── Hidden set: union of descendant subtrees of each effectively-collapsed
  //    couple.  A couple is "effectively collapsed" only if it's in
  //    collapsedUnitKeys AND its subtree does not contain self (self's direct
  //    lineage refuses to fold, matching layoutEngine). ──────────────────────
  const hidden = new Set<string>()
  for (const key of collapsedUnitKeys) {
    const [a, b] = key.split('|')
    if (!a || !b || !nodeIds.has(a) || !nodeIds.has(b)) continue
    if (subtreeContains(a, b, selfId, maps)) continue
    for (const id of descendantsAndSpouses(a, b, maps)) hidden.add(id)
  }

  // ── BFS from self, blocked by hidden set and (future) generation bounds ──
  const maxUp   = options.maxGenUp   ?? Infinity
  const maxDown = options.maxGenDown ?? Infinity

  const visible = new Set<string>([selfId])
  const queue: Array<{ id: string; gen: number }> = [{ id: selfId, gen: 0 }]

  const visit = (neighbour: string, nextGen: number) => {
    if (hidden.has(neighbour))  return
    if (visible.has(neighbour)) return
    if (nextGen < 0 && -nextGen > maxUp)   return
    if (nextGen > 0 &&  nextGen > maxDown) return
    visible.add(neighbour)
    queue.push({ id: neighbour, gen: nextGen })
  }

  while (queue.length) {
    const { id, gen } = queue.shift()!
    for (const p of maps.parentsOf.get(id)  ?? []) visit(p, gen - 1)
    for (const c of maps.childrenOf.get(id) ?? []) visit(c, gen + 1)
    for (const s of maps.spousesOf.get(id)  ?? []) visit(s, gen)
  }

  return visible
}

/** Filter nodes + edges down to a visible set.  An edge is kept only when
 *  BOTH endpoints are visible — anything pointing into the hidden region is
 *  dropped before the layout engine sees it. */
export function filterGraphToVisible<
  N extends { id: string },
  E extends { source: string; target: string },
>(
  nodes: N[],
  edges: E[],
  visible: Set<string>,
): { nodes: N[]; edges: E[] } {
  return {
    nodes: nodes.filter(n => visible.has(n.id)),
    edges: edges.filter(e => visible.has(e.source) && visible.has(e.target)),
  }
}
