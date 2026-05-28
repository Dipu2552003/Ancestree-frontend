import type { Node, Edge } from '@xyflow/react'

export interface FamilyClassification {
  selfId:      string
  fatherId:    string | undefined
  motherId:    string | undefined
  paternalSet: Set<string>
  maternalSet: Set<string>
  siblingSet:  Set<string>
  childSet:    Set<string>
}

export function classifyFamilySides(
  nodes: Node[],
  edges: Edge[],
): FamilyClassification | null {
  const nodeMap = new Map(nodes.map(n => [n.id, n]))
  const d = (id: string) => nodeMap.get(id)!.data as Record<string, unknown>

  const parentsOf  = new Map<string, string[]>()
  const childrenOf = new Map<string, string[]>()
  const spousesOf  = new Map<string, string[]>()
  for (const n of nodes) {
    parentsOf.set(n.id, [])
    childrenOf.set(n.id, [])
    spousesOf.set(n.id, [])
  }
  for (const e of edges) {
    if (!nodeMap.has(e.source) || !nodeMap.has(e.target)) continue
    const rel = (e.data as Record<string, unknown>)?.relType as string
    if (rel === 'PARENT_OF') {
      childrenOf.get(e.source)!.push(e.target)
      parentsOf.get(e.target)!.push(e.source)
    } else if (rel === 'SPOUSE_OF') {
      const s = spousesOf.get(e.source)!
      const t = spousesOf.get(e.target)!
      if (!s.includes(e.target)) s.push(e.target)
      if (!t.includes(e.source)) t.push(e.source)
    }
  }

  const selfId = nodes.find(n => (n.data as Record<string, unknown>).isSelf)?.id
  if (!selfId) return null

  const selfParents = parentsOf.get(selfId) ?? []
  const fatherId    = selfParents.find(p => d(p).gender === 'male') ?? selfParents[0]

  let motherId: string | undefined =
    selfParents.find(p => d(p).gender === 'female') ??
    (selfParents.length > 1 ? selfParents.find(p => p !== fatherId) : undefined)

  if (!motherId && fatherId) {
    const fatherSpouses = spousesOf.get(fatherId) ?? []
    motherId =
      fatherSpouses.find(s => d(s).gender === 'female') ??
      (fatherSpouses.length > 0 ? fatherSpouses[0] : undefined)
  }

  const siblingSet = new Set<string>()
  for (const pid of [fatherId, motherId]) {
    if (!pid) continue
    for (const c of childrenOf.get(pid) ?? []) {
      if (c !== selfId) siblingSet.add(c)
    }
  }

  const childSet = new Set<string>()
  const cq = [...(childrenOf.get(selfId) ?? [])]
  while (cq.length > 0) {
    const cur = cq.shift()!
    if (childSet.has(cur) || cur === selfId) continue
    childSet.add(cur)
    for (const c of childrenOf.get(cur) ?? []) {
      if (!childSet.has(c)) cq.push(c)
    }
  }
  for (const id of siblingSet) childSet.delete(id)

  const centerExclude = new Set([selfId, ...siblingSet, ...childSet])

  function collectFamilyGroup(
    rootId:  string | undefined,
    exclude: Set<string>,
  ): Set<string> {
    if (!rootId) return new Set()
    const result = new Set<string>()
    const queue  = [rootId]
    while (queue.length > 0) {
      const cur = queue.shift()!
      if (result.has(cur) || exclude.has(cur)) continue
      result.add(cur)
      for (const p of parentsOf.get(cur) ?? []) {
        if (!result.has(p) && !exclude.has(p)) queue.push(p)
      }
      for (const c of childrenOf.get(cur) ?? []) {
        if (!result.has(c) && !exclude.has(c)) queue.push(c)
      }
      for (const sp of spousesOf.get(cur) ?? []) {
        if (!result.has(sp) && !exclude.has(sp)) queue.push(sp)
      }
    }
    return result
  }

  const paternalSet = collectFamilyGroup(
    fatherId,
    new Set([...centerExclude, ...(motherId ? [motherId] : [])]),
  )
  const maternalSet = collectFamilyGroup(
    motherId,
    new Set([...centerExclude, ...(fatherId ? [fatherId] : [])]),
  )

  return { selfId, fatherId, motherId, paternalSet, maternalSet, siblingSet, childSet }
}
