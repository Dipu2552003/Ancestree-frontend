import type { Node, Edge } from '@xyflow/react'
import type { EdgeData, PersonData } from '@/types'

// Derives a person's relations from the loaded family graph, for the profile
// view. Reads rawNodes/rawEdges (the whole fetched family, before the side
// filter) so the profile shows every relation in the tree — not only the ones
// visible in the current sasural/mayka view.

export interface RelatedPerson {
  id:        string
  name:      string
  photoUrl:  string | null
  nodeState: string
  relation:  string
  gender?:   string
}

export interface RelationGroup {
  title:  string
  people: RelatedPerson[]
}

const parentLabel  = (g?: string) => g === 'male' ? 'Father'  : g === 'female' ? 'Mother'   : 'Parent'
const childLabel   = (g?: string) => g === 'male' ? 'Son'     : g === 'female' ? 'Daughter' : 'Child'
const spouseLabel  = (g?: string) => g === 'male' ? 'Husband' : g === 'female' ? 'Wife'     : 'Spouse'
const siblingLabel = (g?: string) => g === 'male' ? 'Brother' : g === 'female' ? 'Sister'   : 'Sibling'

export function computePersonRelations(
  personId: string,
  nodes: Node[],
  edges: Edge[],
): RelationGroup[] {
  const nodeById = new Map(nodes.map(n => [n.id, n]))
  if (!nodeById.has(personId)) return []

  const rel    = (e: Edge) => (e.data as unknown as EdgeData)?.relType
  const dataOf = (id: string) => nodeById.get(id)?.data as unknown as PersonData | undefined

  const parents  = new Set<string>()
  const children = new Set<string>()
  const spouses  = new Set<string>()
  const siblings = new Set<string>()

  for (const e of edges) {
    const r = rel(e)
    if (r === 'PARENT_OF') {
      if (e.target === personId) parents.add(e.source)
      if (e.source === personId) children.add(e.target)
    } else if (r === 'SPOUSE_OF') {
      if (e.source === personId)      spouses.add(e.target)
      else if (e.target === personId) spouses.add(e.source)
    } else if (r === 'SIBLING_OF') {
      if (e.source === personId)      siblings.add(e.target)
      else if (e.target === personId) siblings.add(e.source)
    }
  }

  // Implicit siblings: anyone who shares a parent with this person (covers
  // half-siblings and full siblings recorded only via PARENT_OF, no SIBLING_OF).
  for (const e of edges) {
    if (rel(e) === 'PARENT_OF' && parents.has(e.source) && e.target !== personId) {
      siblings.add(e.target)
    }
  }
  // A node can't be its own sibling, nor a sibling that's actually a parent/
  // child/spouse — strip overlaps so each person appears under one group.
  for (const id of [personId, ...parents, ...children, ...spouses]) siblings.delete(id)

  const build = (ids: Set<string>, label: (g?: string) => string): RelatedPerson[] =>
    [...ids]
      .map(id => {
        const d = dataOf(id)
        if (!d) return null
        return {
          id,
          name:      d.fullName,
          photoUrl:  d.photoUrl ?? d.photoThumbnailUrl ?? null,
          nodeState: d.nodeState,
          relation:  label(d.gender),
          gender:    d.gender,
        } as RelatedPerson
      })
      .filter((p): p is RelatedPerson => p !== null)
      .sort((a, b) => {
        const ay = dataOf(a.id)?.birthYear ?? 9999
        const by = dataOf(b.id)?.birthYear ?? 9999
        return ay !== by ? ay - by : a.name.localeCompare(b.name)
      })

  return [
    { title: 'Parents',  people: build(parents,  parentLabel) },
    { title: 'Siblings', people: build(siblings, siblingLabel) },
    { title: spouses.size > 1 ? 'Spouses' : 'Spouse', people: build(spouses, spouseLabel) },
    { title: 'Children', people: build(children, childLabel) },
  ].filter(g => g.people.length > 0)
}
