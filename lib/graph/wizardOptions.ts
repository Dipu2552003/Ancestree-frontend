// Pure graph helpers for AddNodeWizard.
//
// Both functions walk raw edges to figure out which mothers / which father
// to show in the wizard's 'mother' step. They live here (not in the graph
// page) so they can be unit-tested in isolation — and because nothing about
// them is page-specific.

import type { RelAction } from '@/components/graph/Navbar'

type SimpleEdge = { id: string; source: string; target: string; data?: unknown }
type SimpleNode = { id: string; data?: { fullName?: string; gender?: string; photoUrl?: string } }
type MotherOption = { id: string; name: string; gender?: string; photoUrl?: string }

/**
 * Candidate mothers shown in the wizard's 'mother' step.
 *
 *   - son/daughter:    anchor's own spouses.
 *   - brother/sister:  anchor's *multi-spouse* parent's spouses, with anchor's
 *                      own mother first (so it's the default selection and the
 *                      common "full sibling" case is one click).
 *   - anything else:   empty (no mother step shown).
 *
 * Returned list is empty in single-spouse cases too — the wizard only shows the
 * mother step when this list has 2+ entries.
 */
export function computeMotherOptions(
  action: RelAction,
  anchorId: string | null,
  edges: SimpleEdge[],
  nodes: SimpleNode[],
): MotherOption[] {
  if (!anchorId) return []
  const dataOf = (id: string) => nodes.find(n => n.id === id)?.data
  const optionFor = (id: string): MotherOption => {
    const d = dataOf(id)
    return { id, name: d?.fullName ?? 'Person', gender: d?.gender, photoUrl: d?.photoUrl }
  }
  const relTypeOf = (e: SimpleEdge) =>
    (e.data as { relType?: string } | undefined)?.relType

  const spousesOfPerson = (personId: string): string[] =>
    edges
      .filter(e => relTypeOf(e) === 'SPOUSE_OF' && (e.source === personId || e.target === personId))
      .map(e => e.source === personId ? e.target : e.source)

  if (action === 'son' || action === 'daughter') {
    return spousesOfPerson(anchorId).map(optionFor)
  }

  if (action === 'brother' || action === 'sister') {
    const anchorParents = edges
      .filter(e => relTypeOf(e) === 'PARENT_OF' && e.target === anchorId)
      .map(e => e.source)
    // Find a parent with 2+ spouses — the "shared father" in a multi-wife case.
    const multiSpouseParent = anchorParents.find(p => spousesOfPerson(p).length >= 2)
    if (!multiSpouseParent) return []

    const allWives    = spousesOfPerson(multiSpouseParent)
    const anchorOwnMom = anchorParents.find(p => p !== multiSpouseParent) ?? null
    // Put anchor's own mother first so the default selection = full sibling.
    const ordered = anchorOwnMom
      ? [anchorOwnMom, ...allWives.filter(w => w !== anchorOwnMom)]
      : allWives
    return ordered.map(optionFor)
  }

  return []
}

/**
 * Father shown in the TrioHero on the 'mother' step.
 *   - child-add:    anchor IS the father → undefined (wizard falls back to anchorName)
 *   - sibling-add:  anchor's multi-spouse parent's name (the shared father)
 */
export function computeFatherName(
  action: RelAction,
  anchorId: string | null,
  edges: SimpleEdge[],
  nodes: SimpleNode[],
): string | undefined {
  if (!anchorId) return undefined
  if (action !== 'brother' && action !== 'sister') return undefined
  const relTypeOf = (e: SimpleEdge) =>
    (e.data as { relType?: string } | undefined)?.relType
  const spousesOf = (personId: string): number =>
    edges.filter(e => relTypeOf(e) === 'SPOUSE_OF' && (e.source === personId || e.target === personId)).length
  const anchorParents = edges
    .filter(e => relTypeOf(e) === 'PARENT_OF' && e.target === anchorId)
    .map(e => e.source)
  const multiSpouseParent = anchorParents.find(p => spousesOf(p) >= 2)
  if (!multiSpouseParent) return undefined
  return nodes.find(n => n.id === multiSpouseParent)?.data?.fullName
}
