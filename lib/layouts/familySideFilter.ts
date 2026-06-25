import type { Node, Edge } from '@xyflow/react'
import type { EdgeData, PersonData } from '@/types'

/**
 * For married women the graph can be viewed from two angles:
 *  'sasural' — husband's paternal family (ससुराल)
 *  'mayka'   — her own birth family       (मायका)
 *
 * For all other users (men, unmarried women) only the papa-side
 * view is computed and `isMarriedWoman` is returned as false.
 *
 * BFS rules (apply to every anchor node):
 *  DOWN (children) — all children are blood (addFull), including married daughters.
 *                    A married daughter's children are therefore visible.
 *                    Her husband's family is still sealed (SPOUSE_OF rule below).
 *  UP   (parents)  — couple rule when both parents are new:
 *                      male parent  → blood (addFull)
 *                      female parent → married-in (addSealed)
 *                    solo parent (co-parent already in set) → blood.
 *  SPOUSE_OF links — always addSealed (visible, BFS never traverses).
 *
 * addSealed = rendered but BFS never processes it.
 */
export type WomanView = 'sasural' | 'mayka'

export function filterGraphBySide(
  nodes: Node[],
  edges: Edge[],
  womanView: WomanView = 'sasural',
): { nodes: Node[]; edges: Edge[]; isMarriedWoman: boolean } {
  if (nodes.length === 0) return { nodes, edges, isMarriedWoman: false }

  const nodeMap = new Map(nodes.map(n => [n.id, n]))
  const d = (id: string) => (nodeMap.get(id)?.data ?? {}) as unknown as PersonData

  const parentsOf  = new Map<string, string[]>()
  const childrenOf = new Map<string, string[]>()
  const spousesOf  = new Map<string, string[]>()
  const siblingsOf = new Map<string, string[]>()
  for (const n of nodes) {
    parentsOf.set(n.id, [])
    childrenOf.set(n.id, [])
    spousesOf.set(n.id, [])
    siblingsOf.set(n.id, [])
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
    } else if (rel === 'SIBLING_OF') {
      const s = siblingsOf.get(e.source)!
      const t = siblingsOf.get(e.target)!
      if (!s.includes(e.target)) s.push(e.target)
      if (!t.includes(e.source)) t.push(e.source)
    }
  }

  const selfId = nodes.find(n => d(n.id).isSelf)?.id
  if (!selfId) return { nodes, edges, isMarriedWoman: false }

  const selfParents = parentsOf.get(selfId) ?? []
  const papaId = selfParents.find(p => d(p).gender === 'male') ?? selfParents[0]
  let maaId: string | undefined =
    selfParents.find(p => d(p).gender === 'female') ??
    (selfParents.length > 1 ? selfParents.find(p => p !== papaId) : undefined)
  if (!maaId && papaId) {
    const papaSpouses = spousesOf.get(papaId) ?? []
    maaId =
      papaSpouses.find(s => d(s).gender === 'female') ??
      (papaSpouses.length > 0 ? papaSpouses[0] : undefined)
  }

  const includedNodes = new Set<string>()
  const spouseNodes   = new Set<string>()
  const queue: string[] = []

  const addFull = (id: string) => {
    if (includedNodes.has(id)) return
    includedNodes.add(id)
    queue.push(id)
  }

  const addSealed = (id: string) => {
    if (includedNodes.has(id)) return
    includedNodes.add(id)
    spouseNodes.add(id)
  }

  // Detect married woman: self is female and has at least one spouse
  const selfGender  = d(selfId).gender as string | undefined
  const selfSpouses = spousesOf.get(selfId) ?? []
  const husband     = selfGender === 'female'
    ? (selfSpouses.find(s => d(s).gender === 'male') ?? (selfSpouses.length > 0 ? selfSpouses[0] : undefined))
    : undefined
  const isMarriedWoman = !!husband

  // Seed
  if (isMarriedWoman && womanView === 'sasural') {
    // Sasural — husband's paternal tree; self is sealed (visible but not BFS root)
    addSealed(selfId)
    addFull(husband!)
  } else {
    // Mayka (birth family) for married women, OR papa-side for everyone else
    addFull(selfId)
    if (maaId) addSealed(maaId)
  }

  // BFS
  while (queue.length > 0) {
    const cur = queue.shift()!

    // Children — all are traversed fully. Married daughters' children are
    // now visible; their spouse's family stays sealed via the spouse rule below.
    for (const cid of childrenOf.get(cur) ?? []) {
      addFull(cid)
    }

    // Siblings via SIBLING_OF — same: traverse all, including married sisters.
    // Spouse family is restricted by the sealed-spouse rule, not by stopping here.
    for (const sid of siblingsOf.get(cur) ?? []) {
      if (includedNodes.has(sid)) continue
      addFull(sid)
    }

    // Parents — couple rule only when both parents are new
    const parentIds = parentsOf.get(cur) ?? []
    const handled   = new Set<string>()

    for (const pid of parentIds) {
      if (handled.has(pid) || includedNodes.has(pid)) {
        handled.add(pid)
        continue
      }

      const coParent = parentIds.find(
        other =>
          other !== pid &&
          !handled.has(other) &&
          !includedNodes.has(other) &&
          (spousesOf.get(pid) ?? []).includes(other),
      )

      if (coParent) {
        handled.add(pid)
        handled.add(coParent)

        const pg  = d(pid).gender as string | undefined
        const cpg = d(coParent).gender as string | undefined

        let blood: string, marriedIn: string
        if (pg === 'female' && cpg !== 'female') {
          blood = coParent; marriedIn = pid
        } else {
          blood = pid; marriedIn = coParent
        }

        addFull(blood)
        addSealed(marriedIn)
      } else {
        handled.add(pid)
        addFull(pid)
      }
    }

    // Same-generation spouses — always sealed
    for (const sid of spousesOf.get(cur) ?? []) {
      addSealed(sid)
    }
  }

  const resultNodes = nodes
    .filter(n => includedNodes.has(n.id))
    .map(n => ({
      ...n,
      data: {
        ...n.data,
        nodeRole: d(n.id).isSelf
          ? 'self'
          : spouseNodes.has(n.id) ? 'spouse' : 'family',
      },
    }))

  const resultEdges = edges.filter(
    e => includedNodes.has(e.source) && includedNodes.has(e.target),
  )

  return { nodes: resultNodes, edges: resultEdges, isMarriedWoman }
}
