import type { Node, Edge } from '@xyflow/react'
import type { EdgeData, PersonData } from '@/types'

/**
 * Ghost-node injection — handles intra-family marriages (e.g. cousin marriage).
 *
 * Scenario: two people who BOTH have lineage in the same family tree get
 * married. Drawing the SPOUSE_OF edge between them directly would create a
 * line that crosses the tree (cousins live in different sub-branches) and
 * potentially break the planar tree assumption used by Reingold-Tilford.
 *
 * Solution: keep the backend pure (one person, one record) and, in the render
 * pipeline only, create a **ghost node** that duplicates the further-from-self
 * partner so their spouse and the marriage's children can be drawn cleanly
 * next to the closer-to-self partner. The original node stays in their birth
 * lineage; the ghost takes over the marriage subtree visually.
 *
 * The ghost is a frontend-only abstraction:
 *   - same person data, different node id
 *   - the marriage SPOUSE_OF is rewired so it points at the ghost id
 *   - PARENT_OF edges from the ghosted person to the marriage's children are
 *     also rewired so the children land under the ghost-couple bracket
 *   - all other edges of the ghosted person (parents, siblings, other
 *     marriages, unrelated children) remain on the real node
 *
 * Naming: `${realPersonId}__ghost__${anchorId}` keeps every ghost unique even
 * when a person has multiple intra-family marriages.
 */

export const GHOST_ID_SEP = '__ghost__'

export function isGhostNodeId(id: string): boolean {
  return id.includes(GHOST_ID_SEP)
}

export function realIdFromGhost(id: string): string {
  const idx = id.indexOf(GHOST_ID_SEP)
  return idx >= 0 ? id.slice(0, idx) : id
}

/** Edges rewired through a ghost get a `__ghost` suffix on their id.
 *  Backend only knows the original id, so strip the suffix for any
 *  edge-targeted API call (delete, update). */
export function realEdgeId(id: string): string {
  return id.endsWith('__ghost') ? id.slice(0, -'__ghost'.length) : id
}

function ghostIdOf(realId: string, anchorId: string): string {
  return `${realId}${GHOST_ID_SEP}${anchorId}`
}

interface InjectionResult {
  nodes: Node[]
  edges: Edge[]
  /** Map of new ghost node id → the real person id it mirrors. */
  ghosts: Map<string, string>
}

/**
 * Detects intra-family marriages and emits ghost nodes + rewired edges.
 * Returns the original nodes/edges unchanged when nothing matches.
 */
export function injectGhostsForIntraFamilyMarriages(
  nodes: Node[],
  edges: Edge[],
): InjectionResult {
  if (nodes.length === 0) {
    return { nodes, edges, ghosts: new Map() }
  }

  // ── Build parent / sibling / spouse adjacency ────────────────────────────
  const parentsOf = new Map<string, string[]>()
  for (const e of edges) {
    const rel = (e.data as unknown as EdgeData)?.relType
    if (rel === 'PARENT_OF') {
      if (!parentsOf.has(e.target)) parentsOf.set(e.target, [])
      parentsOf.get(e.target)!.push(e.source)
    }
  }
  const hasParents = (id: string) => (parentsOf.get(id) ?? []).length > 0

  // ── Distance from self (smaller = stays as real, larger = ghosted) ──────
  // This biases the layout to keep the viewer's direct lineage anchored and
  // ghost the partner that "enters from another branch".
  const selfId = nodes.find(n => (n.data as unknown as PersonData)?.isSelf)?.id
  const distance = new Map<string, number>()
  if (selfId) {
    const adj = new Map<string, string[]>()
    for (const n of nodes) adj.set(n.id, [])
    for (const e of edges) {
      const rel = (e.data as unknown as EdgeData)?.relType
      if (rel === 'PARENT_OF' || rel === 'SPOUSE_OF') {
        adj.get(e.source)?.push(e.target)
        adj.get(e.target)?.push(e.source)
      }
    }
    distance.set(selfId, 0)
    const q: string[] = [selfId]
    while (q.length) {
      const cur = q.shift()!
      const d = distance.get(cur)!
      for (const nb of adj.get(cur) ?? []) {
        if (!distance.has(nb)) {
          distance.set(nb, d + 1)
          q.push(nb)
        }
      }
    }
  }

  // ── Identify intra-family marriages ──────────────────────────────────────
  // Trigger: a SPOUSE_OF edge where BOTH endpoints have at least one parent in
  // this graph. The presence of parents on both sides is what distinguishes a
  // cousin marriage from a normal "person married someone from outside".
  const ghostsToCreate = new Map<string, string>()  // ghostedId → anchorId
  const seenPairs = new Set<string>()

  for (const e of edges) {
    const rel = (e.data as unknown as EdgeData)?.relType
    if (rel !== 'SPOUSE_OF') continue

    const key = [e.source, e.target].sort().join('|')
    if (seenPairs.has(key)) continue
    seenPairs.add(key)

    const a = e.source
    const b = e.target
    if (!hasParents(a) || !hasParents(b)) continue

    // Pick the ghosted side: further from self, tiebreak by lex-greater id.
    const dA = distance.get(a) ?? Infinity
    const dB = distance.get(b) ?? Infinity
    let ghosted: string
    let anchor:  string
    if (dA < dB)      { ghosted = b; anchor = a }
    else if (dB < dA) { ghosted = a; anchor = b }
    else              { ghosted = a > b ? a : b; anchor = ghosted === a ? b : a }

    // If a person is already going to be ghosted from another marriage, keep
    // the first decision (multiple ghosts of the same person require multiple
    // distinct ghostIds, but for v1 we use a single ghost per person).
    if (ghostsToCreate.has(ghosted)) continue
    ghostsToCreate.set(ghosted, anchor)
  }

  if (ghostsToCreate.size === 0) {
    return { nodes, edges, ghosts: new Map() }
  }

  // ── Identify "marriage children" for each ghost ─────────────────────────
  // A child belongs to the marriage subtree (and gets its PARENT_OF edge
  // rerouted through the ghost) only when both members of the couple are
  // recorded parents. Children of the ghosted person by some OTHER partner
  // stay on the real node.
  const marriageChildren = new Map<string, Set<string>>()  // ghostedId → kid ids
  for (const [ghosted, anchor] of ghostsToCreate) {
    const kids = new Set<string>()
    for (const e of edges) {
      if ((e.data as unknown as EdgeData)?.relType !== 'PARENT_OF') continue
      if (e.source !== ghosted) continue
      const childParents = parentsOf.get(e.target) ?? []
      if (childParents.includes(anchor)) kids.add(e.target)
    }
    marriageChildren.set(ghosted, kids)
  }

  // ── Emit the ghost nodes ────────────────────────────────────────────────
  const newNodes: Node[] = [...nodes]
  const nodeById = new Map(nodes.map(n => [n.id, n]))
  const ghostMap = new Map<string, string>()  // ghostNodeId → realId

  for (const [ghosted, anchor] of ghostsToCreate) {
    const original = nodeById.get(ghosted)
    if (!original) continue
    const ghostId = ghostIdOf(ghosted, anchor)
    ghostMap.set(ghostId, ghosted)
    const origData = original.data as unknown as PersonData
    newNodes.push({
      ...original,
      id: ghostId,
      data: {
        ...origData,
        isGhost:       true,
        realPersonId:  ghosted,
        ghostAnchorId: anchor,
        // The ghost is never the perspective center, even if the real person is.
        isSelf:        false,
      },
    } as Node)
  }

  // ── Rewire edges through the ghost id ───────────────────────────────────
  // Marriage SPOUSE_OF → real-ghosted endpoint becomes ghost id.
  // PARENT_OF from ghosted → marriage child becomes from ghost id.
  // Everything else passes through untouched.
  const newEdges: Edge[] = []
  for (const e of edges) {
    const rel = (e.data as unknown as EdgeData)?.relType
    let newSrc = e.source
    let newTgt = e.target
    let rewired = false

    for (const [ghosted, anchor] of ghostsToCreate) {
      const ghostId = ghostIdOf(ghosted, anchor)

      if (rel === 'SPOUSE_OF') {
        if (e.source === ghosted && e.target === anchor) {
          newSrc = ghostId; rewired = true; break
        }
        if (e.target === ghosted && e.source === anchor) {
          newTgt = ghostId; rewired = true; break
        }
      } else if (rel === 'PARENT_OF') {
        if (e.source === ghosted) {
          const kids = marriageChildren.get(ghosted)
          if (kids?.has(e.target)) {
            newSrc = ghostId; rewired = true; break
          }
        }
      }
    }

    newEdges.push({
      ...e,
      id:     rewired ? `${e.id}__ghost` : e.id,
      source: newSrc,
      target: newTgt,
    })
  }

  return { nodes: newNodes, edges: newEdges, ghosts: ghostMap }
}
