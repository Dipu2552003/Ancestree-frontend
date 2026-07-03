// The sibling display-order rule, shared by every list that mirrors the
// canvas: birth year ascending (known years first), then manual child_order
// (1 = eldest), then creation order (person_code sequence — "the order they
// were added"), then name/id as a last resort for nodes that don't have a
// code yet. layoutEngine.compareByAge implements the same rule inline over
// its own lookup maps — keep the two in sync.

export interface SiblingSortKey {
  id: string
  name: string
  birthYear?: number | null
  childOrder?: number | null
  personCode?: string | null
}

/** Numeric tail of a person_code ("KHANDE-176" → 176) = per-family creation order. */
export function personCodeSeq(code: string | null | undefined): number | null {
  const m = /(\d+)$/.exec(code ?? '')
  return m ? parseInt(m[1], 10) : null
}

export function compareSiblings(a: SiblingSortKey, b: SiblingSortKey): number {
  if (a.birthYear != null && b.birthYear != null) return a.birthYear - b.birthYear
  if (a.birthYear != null) return -1
  if (b.birthYear != null) return 1
  if (a.childOrder != null && b.childOrder != null && a.childOrder !== b.childOrder) return a.childOrder - b.childOrder
  if (a.childOrder != null && b.childOrder == null) return -1
  if (b.childOrder != null && a.childOrder == null) return 1
  const sa = personCodeSeq(a.personCode), sb = personCodeSeq(b.personCode)
  if (sa != null && sb != null && sa !== sb) return sa - sb
  const n = a.name.localeCompare(b.name)
  return n !== 0 ? n : a.id.localeCompare(b.id)
}
