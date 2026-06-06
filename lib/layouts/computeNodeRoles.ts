import type { Node, Edge } from '@xyflow/react'
import type { EdgeData, PersonData } from '@/types'

export type NodeRole = 'primary' | 'sideBranch' | 'extended'

/**
 * Tags every node as:
 *  primary   — self + all direct ancestors + their spouses
 *  sideBranch — children of primary nodes who are NOT on the primary path
 *  extended  — descendants of sideBranch nodes (and their spouses)
 */
export function computeNodeRoles(nodes: Node[], edges: Edge[]): Map<string, NodeRole> {
  const roles = new Map<string, NodeRole>()
  if (nodes.length === 0) return roles

  const d = (id: string) => (nodes.find(n => n.id === id)?.data ?? {}) as unknown as PersonData

  const childrenOf  = new Map<string, string[]>()
  const parentsOf   = new Map<string, string[]>()
  const spousesOf   = new Map<string, string[]>()
  for (const n of nodes) {
    childrenOf.set(n.id, [])
    parentsOf.set(n.id, [])
    spousesOf.set(n.id, [])
  }
  for (const e of edges) {
    const rel = (e.data as unknown as EdgeData)?.relType
    if (rel === 'PARENT_OF') {
      childrenOf.get(e.source)?.push(e.target)
      parentsOf.get(e.target)?.push(e.source)
    } else if (rel === 'SPOUSE_OF') {
      spousesOf.get(e.source)?.push(e.target)
      spousesOf.get(e.target)?.push(e.source)
    }
  }

  const selfId = nodes.find(n => d(n.id).isSelf)?.id
  if (!selfId) {
    for (const n of nodes) roles.set(n.id, 'extended')
    return roles
  }

  // Step 1+2 combined: BFS UP via PARENT_OF and ACROSS via SPOUSE_OF until
  // fixpoint. This marks the whole ancestor-AND-in-law chain as primary so the
  // viewed perspective sees their spouse's family fully expanded, not collapsed.
  //
  // For Joshana viewing her own tree:
  //   Joshana → primary
  //   Mahendra (spouse)              → primary
  //   Mahendra's parents             → primary  (key: walk up via PARENT_OF)
  //   Their spouses                  → primary  (key: walk across via SPOUSE_OF)
  //   ...and so on up to Nanmalji + his wives.
  const primary = new Set<string>([selfId])
  const q = [selfId]
  while (q.length) {
    const cur = q.shift()!
    for (const pid of parentsOf.get(cur) ?? []) {
      if (!primary.has(pid)) { primary.add(pid); q.push(pid) }
    }
    for (const sid of spousesOf.get(cur) ?? []) {
      if (!primary.has(sid)) { primary.add(sid); q.push(sid) }
    }
  }
  for (const id of primary) roles.set(id, 'primary')

  // Step 3: children of primary that are NOT primary → sideBranch
  const sideBranch = new Set<string>()
  for (const id of primary) {
    for (const cid of childrenOf.get(id) ?? []) {
      if (!primary.has(cid)) { sideBranch.add(cid); roles.set(cid, 'sideBranch') }
    }
  }

  // Step 4: BFS downward from sideBranch → extended
  const extQ = [...sideBranch]
  while (extQ.length) {
    const cur = extQ.shift()!
    for (const cid of childrenOf.get(cur) ?? []) {
      if (!roles.has(cid)) { roles.set(cid, 'extended'); extQ.push(cid) }
    }
    for (const sid of spousesOf.get(cur) ?? []) {
      if (!roles.has(sid)) roles.set(sid, 'extended')
    }
  }

  for (const n of nodes) {
    if (!roles.has(n.id)) roles.set(n.id, 'extended')
  }
  return roles
}

/**
 * Returns the set of couple-unit keys that should start collapsed.
 * A unit collapses by default when neither member is 'primary'.
 *
 * Multi-spouse anchors (people with 2+ SPOUSE_OF edges) are EXCLUDED — their
 * couples are rendered as one extended unit by the layout engine, never as a
 * collapsable 1:1 pair. If we added their pair-keys to the collapse set, the
 * edge remap would drop the SPOUSE_OF edges and the multi-spouse bracket
 * would never get built.
 */
export function computeDefaultCollapsedUnits(
  edges: Edge[],
  roles: Map<string, NodeRole>,
): string[] {
  // Count SPOUSE_OF edges per person.
  const spouseCount = new Map<string, number>()
  for (const e of edges) {
    if ((e.data as unknown as EdgeData)?.relType !== 'SPOUSE_OF') continue
    spouseCount.set(e.source, (spouseCount.get(e.source) ?? 0) + 1)
    spouseCount.set(e.target, (spouseCount.get(e.target) ?? 0) + 1)
  }
  const isMultiSpouse = (id: string) => (spouseCount.get(id) ?? 0) >= 2

  const collapsed: string[] = []
  const seen = new Set<string>()
  for (const e of edges) {
    const rel = (e.data as unknown as EdgeData)?.relType
    if (rel !== 'SPOUSE_OF') continue
    const key = [e.source, e.target].sort().join('|')
    if (seen.has(key)) continue
    seen.add(key)

    // Multi-spouse anchor on either side → never default-collapse this couple.
    if (isMultiSpouse(e.source) || isMultiSpouse(e.target)) continue

    if ((roles.get(e.source) ?? 'extended') !== 'primary' &&
        (roles.get(e.target) ?? 'extended') !== 'primary') {
      collapsed.push(key)
    }
  }
  return collapsed
}
