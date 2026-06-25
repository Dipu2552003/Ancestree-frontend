import type { Node, Edge } from '@xyflow/react'
import type { PersonData, EdgeData } from '@/types'

/**
 * Derives the family name from the topmost ancestor in the filtered graph.
 *
 * Rules:
 *  - Root  = a node that has no PARENT_OF edge pointing at it within this set
 *  - Exclude sealed married-in nodes (nodeRole === 'spouse') from root candidates
 *  - Among roots: males first, then lowest birthYear (oldest)
 *  - Returns "{firstName} Family"
 *
 * For married women the caller passes the already-filtered (sasural or mayka)
 * nodes/edges, so the correct side's family name is computed automatically.
 */
export function computeFamilyName(nodes: Node[], edges: Edge[]): string {
  if (nodes.length === 0) return 'Family'

  // Nodes that appear as a child in any PARENT_OF edge have a parent in this view
  const hasParent = new Set<string>()
  for (const e of edges) {
    const rel = (e.data as unknown as EdgeData)?.relType
    if (rel === 'PARENT_OF') hasParent.add(e.target)
  }

  // Primary candidates: parentless, non-married-in nodes
  let roots = nodes.filter(n => {
    if (hasParent.has(n.id)) return false
    const role = (n.data as unknown as { nodeRole?: string })?.nodeRole
    return role !== 'spouse'
  })

  // Fallbacks when primary candidate set is empty
  if (roots.length === 0) roots = nodes.filter(n => !hasParent.has(n.id))
  if (roots.length === 0) roots = [nodes[0]]

  // Head selection: prefer male, then oldest (lowest birthYear)
  const males = roots.filter(n => (n.data as unknown as PersonData)?.gender === 'male')
  const pool  = males.length > 0 ? males : roots

  pool.sort((a, b) => {
    const ay = (a.data as unknown as PersonData)?.birthYear ?? 9999
    const by = (b.data as unknown as PersonData)?.birthYear ?? 9999
    return ay - by
  })

  const fullName  = (pool[0].data as unknown as PersonData)?.fullName ?? ''
  const firstName = fullName.trim().split(/\s+/)[0] ?? ''
  return firstName ? `${firstName} Family` : 'Family'
}
