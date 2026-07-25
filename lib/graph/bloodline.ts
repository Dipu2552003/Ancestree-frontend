import type { Node, Edge } from '@xyflow/react'
import type { EdgeData, PersonData } from '@/types'
import { isGhostNodeId, realIdFromGhost } from '@/lib/graph/ghostNodes'

// Resolve a node id to its real person id (ghost duplicates render under a
// synthetic id but point at one real person).
function realId(id: string): string {
  return isGhostNodeId(id) ? realIdFromGhost(id) : id
}

function isPseudo(id: string): boolean {
  return id.startsWith('couple_') || id.startsWith('__load_more') || id.startsWith('__unknown_parent__')
}

/**
 * Blood-line (paternal-side) selection anchored at one node — the set of people
 * connected to the anchor by blood, EXCLUDING anyone married in. Mirrors the
 * papa-side rules in lib/layouts/familySideFilter:
 *   • children  — all are blood (traverse through them)
 *   • siblings  — blood (traverse)
 *   • parents   — couple rule: the male parent is blood (traverse), the female
 *                 parent is married-in (kept out); a solo parent is blood
 *   • spouses   — married-in, never traversed
 *
 * Because gotra/village are patrilineal, this is exactly the set that shares one
 * gotra. Returns real person ids (ghost/couple/synthetic ids resolved/stripped).
 */
export function computeBloodline(anchorId: string, nodes: Node[], edges: Edge[]): Set<string> {
  const d = (id: string): PersonData => {
    const n = nodes.find(nn => realId(nn.id) === realId(id))
    return (n?.data ?? {}) as unknown as PersonData
  }

  const parentsOf  = new Map<string, string[]>()
  const childrenOf = new Map<string, string[]>()
  const spousesOf  = new Map<string, string[]>()
  const siblingsOf = new Map<string, string[]>()
  const ensure = (m: Map<string, string[]>, k: string) => { if (!m.has(k)) m.set(k, []) }

  for (const e of edges) {
    const src = realId(e.source)
    const tgt = realId(e.target)
    if (isPseudo(src) || isPseudo(tgt)) continue
    const rel = (e.data as unknown as EdgeData)?.relType
    ;[src, tgt].forEach(id => { ensure(parentsOf, id); ensure(childrenOf, id); ensure(spousesOf, id); ensure(siblingsOf, id) })
    if (rel === 'PARENT_OF') {
      childrenOf.get(src)!.push(tgt)
      parentsOf.get(tgt)!.push(src)
    } else if (rel === 'SPOUSE_OF') {
      if (!spousesOf.get(src)!.includes(tgt)) spousesOf.get(src)!.push(tgt)
      if (!spousesOf.get(tgt)!.includes(src)) spousesOf.get(tgt)!.push(src)
    } else if (rel === 'SIBLING_OF') {
      if (!siblingsOf.get(src)!.includes(tgt)) siblingsOf.get(src)!.push(tgt)
      if (!siblingsOf.get(tgt)!.includes(src)) siblingsOf.get(tgt)!.push(src)
    }
  }

  const anchor = realId(anchorId)
  const included = new Set<string>()  // everything reached (blood + sealed spouses)
  const sealed   = new Set<string>()  // married-in — kept out of the final result
  const queue: string[] = []

  const addFull = (id: string) => { if (!included.has(id)) { included.add(id); queue.push(id) } }
  const addSealed = (id: string) => { if (!included.has(id)) { included.add(id); sealed.add(id) } }

  // A married daughter takes her husband's gotra — she AND her descendants belong
  // to his lineage, not this one. So we never descend through a married woman, and
  // a married daughter reached as a child/sibling is sealed (excluded from the
  // change). "Married" = female with any spouse link in the loaded graph.
  const isMarriedWoman = (id: string): boolean =>
    d(id).gender === 'female' && (spousesOf.get(id)?.length ?? 0) > 0

  addFull(anchor)

  while (queue.length > 0) {
    const cur = queue.shift()!

    // Descend to children only through men and unmarried women. (The explicitly
    // chosen anchor is still seeded above even if she is a married woman, but we
    // stop here so her children — her husband's gotra — are left untouched.)
    if (!isMarriedWoman(cur)) {
      for (const cid of childrenOf.get(cur) ?? []) {
        if (isMarriedWoman(cid)) addSealed(cid)
        else addFull(cid)
      }
    }
    // Siblings — a married sister carries her husband's gotra, so seal her.
    for (const sid of siblingsOf.get(cur) ?? []) {
      if (isMarriedWoman(sid)) addSealed(sid)
      else addFull(sid)
    }

    // Parents — couple rule (male blood, female married-in) when both are new.
    const parentIds = parentsOf.get(cur) ?? []
    const handled = new Set<string>()
    for (const pid of parentIds) {
      if (handled.has(pid) || included.has(pid)) { handled.add(pid); continue }
      const coParent = parentIds.find(o =>
        o !== pid && !handled.has(o) && !included.has(o) && (spousesOf.get(pid) ?? []).includes(o))
      if (coParent) {
        handled.add(pid); handled.add(coParent)
        const pg = d(pid).gender, cpg = d(coParent).gender
        const [blood, marriedIn] = (pg === 'female' && cpg !== 'female') ? [coParent, pid] : [pid, coParent]
        addFull(blood)
        addSealed(marriedIn)
      } else {
        handled.add(pid)
        addFull(pid)
      }
    }

    // Same-generation spouses — always married-in.
    for (const sid of spousesOf.get(cur) ?? []) addSealed(sid)
  }

  // Blood = reached minus married-in; drop any stray pseudo ids.
  const result = new Set<string>()
  for (const id of included) {
    if (!sealed.has(id) && !isPseudo(id)) result.add(id)
  }
  return result
}
