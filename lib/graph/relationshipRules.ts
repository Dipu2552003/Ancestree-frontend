/**
 * RELATIONSHIP CASCADE RULES
 * ==========================
 *
 * Every time a relation-add action is performed, run computeCascadeOps().
 * It returns the COMPLETE list of API calls to make (base edge + all cascades).
 * The caller just fires them all; no cascade logic lives in the UI layer.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * GLOSSARY
 *   selectedNode   — the person the user clicked "Add …" on
 *   newPerson      — the freshly created person node
 *   sibling-component — the full set of nodes reachable from selectedNode by
 *                       following SIBLING_OF edges transitively (BFS, not just
 *                       direct neighbours)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * ── RULE 1  Add Father / Mother ──────────────────────────────────────────────
 *
 *   Base:
 *     newPerson  →PARENT_OF→  selectedNode
 *
 *   R1-A  Spouse linkage
 *         If selectedNode already has parents, the new parent marries them.
 *         newPerson  →SPOUSE_OF→  each existing parent of selectedNode
 *
 *   R1-B  Sibling cascade — transitive
 *         Every member of selectedNode's sibling-component also gets the new
 *         parent.  This covers the case where 5 brothers exist without parents
 *         and a parent is added to any one of them — all 5 are connected.
 *         newPerson  →PARENT_OF→  each member of sibling-component
 *
 * ── RULE 2  Add Son / Daughter ───────────────────────────────────────────────
 *
 *   Base:
 *     selectedNode  →PARENT_OF→  newPerson
 *
 *   R2-A  Co-parent linkage
 *         selectedNode's existing spouses are also parents of the new child.
 *         each spouse of selectedNode  →PARENT_OF→  newPerson
 *
 * ── RULE 3  Add Brother / Sister ─────────────────────────────────────────────
 *
 *   Base:
 *     newPerson  ←SIBLING_OF→  selectedNode
 *
 *   R3-A  Inherit parents — direct
 *         Any parents selectedNode already has become parents of the new sibling.
 *         each parent of selectedNode  →PARENT_OF→  newPerson
 *
 *   R3-B  Inherit parents — transitive through sibling-component
 *         Walk the entire sibling-component of selectedNode; collect every
 *         parent of every member.  The new sibling gets all of those parents.
 *         Covers the case: selectedNode has no parents but a cousin-level
 *         sibling in the chain does.
 *         each parent-of-any-component-member  →PARENT_OF→  newPerson
 *
 * ── RULE 4  Add Spouse ───────────────────────────────────────────────────────
 *
 *   Base:
 *     newPerson  ←SPOUSE_OF→  selectedNode
 *
 *   R4-A  Co-parent of existing children
 *         selectedNode's existing children also get the new spouse as a parent.
 *         newPerson  →PARENT_OF→  each child of selectedNode
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CONFLICT CASES (not auto-resolved — currently logged as warnings)
 *
 *   • Two sibling groups with DIFFERENT existing parents are merged via a new
 *     SIBLING_OF link.  Both parent-sets cascade to all members, which may be
 *     incorrect.  A future confirmation UI should let the user decide.
 *
 *   • SIBLING_OF edges are NOT cleaned up after a shared parent is established.
 *     They become redundant (siblings are discoverable via PARENT_OF paths) but
 *     are harmless.  Cleanup can be added later.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { Edge } from '@xyflow/react'
import type { EdgeData } from '@/types'
import type { RelAction } from '@/components/graph/Navbar'

// ── Public types ──────────────────────────────────────────────────────────────

export interface CascadeOp {
  from_person_id: string
  to_person_id:   string
  rel_type:       'PARENT_OF' | 'SPOUSE_OF' | 'SIBLING_OF'
}

// ── Private helpers ───────────────────────────────────────────────────────────

function relType(e: Edge): EdgeData['relType'] | undefined {
  return (e.data as unknown as EdgeData)?.relType
}

function parentsOf(nodeId: string, edges: Edge[]): string[] {
  return edges
    .filter(e => relType(e) === 'PARENT_OF' && e.target === nodeId)
    .map(e => e.source)
}

function childrenOf(nodeId: string, edges: Edge[]): string[] {
  return edges
    .filter(e => relType(e) === 'PARENT_OF' && e.source === nodeId)
    .map(e => e.target)
}

function spousesOf(nodeId: string, edges: Edge[]): string[] {
  return edges
    .filter(e => relType(e) === 'SPOUSE_OF' && (e.source === nodeId || e.target === nodeId))
    .map(e => e.source === nodeId ? e.target : e.source)
}

// ── Public helpers ────────────────────────────────────────────────────────────

/**
 * Returns every node reachable from nodeId through SIBLING_OF edges (BFS,
 * transitive).  nodeId itself is NOT included in the result.
 */
export function getSiblingComponent(nodeId: string, edges: Edge[]): string[] {
  const sibEdges = edges.filter(e => relType(e) === 'SIBLING_OF')
  const visited  = new Set<string>([nodeId])
  const queue    = [nodeId]

  while (queue.length > 0) {
    const cur = queue.shift()!
    for (const e of sibEdges) {
      const neighbour = e.source === cur ? e.target : e.target === cur ? e.source : null
      if (neighbour && !visited.has(neighbour)) {
        visited.add(neighbour)
        queue.push(neighbour)
      }
    }
  }

  visited.delete(nodeId)
  return [...visited]
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Given an action on selectedNode that just produced newPerson, returns the
 * complete ordered list of relationship API calls to execute (base edge first,
 * cascades after).  Duplicates within the list are suppressed.
 *
 * Pass the edges state AS IT WAS before the action — new edges have not been
 * fetched yet, which is correct because we reason about the pre-action graph.
 */
export function computeCascadeOps(
  action:         RelAction,
  selectedNodeId: string,
  newPersonId:    string,
  edges:          Edge[],
): CascadeOp[] {
  const ops: CascadeOp[] = []

  const add = (from: string, to: string, rel_type: CascadeOp['rel_type']) => {
    const dup = ops.some(
      o => o.from_person_id === from && o.to_person_id === to && o.rel_type === rel_type,
    )
    if (!dup) ops.push({ from_person_id: from, to_person_id: to, rel_type })
  }

  // Pre-compute shared lookups
  const sibComponent     = getSiblingComponent(selectedNodeId, edges)
  const directParents    = parentsOf(selectedNodeId, edges)

  // ── RULE 1: Add Father / Mother ──────────────────────────────────────────
  if (action === 'father' || action === 'mother') {
    // Base
    add(newPersonId, selectedNodeId, 'PARENT_OF')

    // R1-A: Marry to existing parents of selectedNode
    for (const pid of directParents) {
      add(newPersonId, pid, 'SPOUSE_OF')
    }

    // R1-B: Cascade to entire sibling-component (transitive)
    for (const sibId of sibComponent) {
      add(newPersonId, sibId, 'PARENT_OF')
    }
  }

  // ── RULE 2: Add Son / Daughter ───────────────────────────────────────────
  if (action === 'son' || action === 'daughter') {
    // Base
    add(selectedNodeId, newPersonId, 'PARENT_OF')

    // R2-A: selectedNode's spouses become co-parents
    for (const spId of spousesOf(selectedNodeId, edges)) {
      add(spId, newPersonId, 'PARENT_OF')
    }
  }

  // ── RULE 3: Add Brother / Sister ─────────────────────────────────────────
  if (action === 'brother' || action === 'sister') {
    // Base
    add(newPersonId, selectedNodeId, 'SIBLING_OF')

    // R3-A + R3-B: Collect parents from selectedNode AND the full sibling-component
    const componentMembers = [selectedNodeId, ...sibComponent]
    const allParents = new Set<string>()
    for (const memberId of componentMembers) {
      for (const pid of parentsOf(memberId, edges)) allParents.add(pid)
    }

    if (allParents.size > 0 && allParents.size !== directParents.length) {
      console.warn(
        '[relationshipRules] Sibling-component members have parents from multiple sources.',
        'Cascading all parents to new sibling — verify correctness.',
        [...allParents],
      )
    }

    for (const pid of allParents) {
      add(pid, newPersonId, 'PARENT_OF')
    }
  }

  // ── RULE 4: Add Spouse ───────────────────────────────────────────────────
  if (action === 'spouse') {
    // Base
    add(newPersonId, selectedNodeId, 'SPOUSE_OF')

    // R4-A: New spouse becomes co-parent of existing children
    for (const childId of childrenOf(selectedNodeId, edges)) {
      add(newPersonId, childId, 'PARENT_OF')
    }
  }

  return ops
}
