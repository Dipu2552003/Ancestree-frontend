import type { Node, Edge } from '@xyflow/react'
import type { EdgeData, PersonData } from '@/types'

export type ViewSide = 'papa' | 'maa' | 'spouse'

export function filterGraphBySide(
  nodes: Node[],
  edges: Edge[],
  viewSide: ViewSide,
): { nodes: Node[]; edges: Edge[] } {
  if (nodes.length === 0) return { nodes, edges }

  const nodeMap = new Map(nodes.map(n => [n.id, n]))
  const d = (id: string) => (nodeMap.get(id)?.data ?? {}) as PersonData

  // Build adjacency maps
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
    const rel = (e.data as EdgeData)?.relType
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

  // Find self
  const selfId = nodes.find(n => d(n.id).isSelf)?.id
  if (!selfId) return { nodes, edges }

  // Resolve papa and maa (mirrors classifyNodes resolution logic)
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

  // includedNodes = all visible node IDs
  // spouseNodes   = sealed boundary nodes (subset of includedNodes, NOT traversed)
  const includedNodes = new Set<string>()
  const spouseNodes   = new Set<string>()
  const queue: string[] = []

  const addFull = (id: string) => {
    if (includedNodes.has(id)) return
    includedNodes.add(id)
    queue.push(id)
  }

  // Visible but sealed — family behind them is not traversed
  const addSpouse = (id: string) => {
    if (includedNodes.has(id)) return
    includedNodes.add(id)
    spouseNodes.add(id)
  }

  // Seed the traversal
  if (viewSide === 'papa') {
    addFull(selfId)
    if (maaId) addSpouse(maaId)
    // papaId is reached naturally from self via PARENT_OF upward
    // selfSpouse is sealed naturally when BFS hits the SPOUSE_OF edge from self
  } else if (viewSide === 'maa') {
    addFull(selfId)
    if (papaId) addSpouse(papaId)
  } else {
    // Spouse view: self is the one who "married in" — sealed from spouse side
    addSpouse(selfId)
    const selfSpouses = spousesOf.get(selfId) ?? []
    for (const sp of selfSpouses) addFull(sp)
    if (selfSpouses.length === 0) return { nodes: [], edges: [] }
  }

  // BFS — follow PARENT_OF freely, stop at SPOUSE_OF
  while (queue.length > 0) {
    const cur = queue.shift()!

    for (const pid of parentsOf.get(cur) ?? []) {
      if (!includedNodes.has(pid)) addFull(pid)
    }
    for (const cid of childrenOf.get(cur) ?? []) {
      if (!includedNodes.has(cid)) addFull(cid)
    }
    for (const sid of spousesOf.get(cur) ?? []) {
      if (!includedNodes.has(sid)) addSpouse(sid)
    }
  }

  const resultNodes = nodes
    .filter(n => includedNodes.has(n.id))
    .map(n => ({
      ...n,
      data: {
        ...n.data,
        nodeRole: d(n.id).isSelf ? 'self' : spouseNodes.has(n.id) ? 'spouse' : 'family',
      },
    }))

  const resultEdges = edges.filter(
    e => includedNodes.has(e.source) && includedNodes.has(e.target),
  )

  return { nodes: resultNodes, edges: resultEdges }
}
