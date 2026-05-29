import type { Node, Edge } from '@xyflow/react'
import type { EdgeData } from '@/types'

export function computeGenerations(nodes: Node[], edges: Edge[]): Map<string, number> {
  const gens = new Map<string, number>()
  if (nodes.length === 0) return gens

  const selfId =
    nodes.find(n => (n.data as Record<string, unknown>).isSelf)?.id ?? nodes[0].id

  const queue: Array<{ id: string; gen: number }> = [{ id: selfId, gen: 0 }]
  const visited = new Set<string>()

  while (queue.length > 0) {
    const { id, gen } = queue.shift()!
    if (visited.has(id)) continue
    visited.add(id)
    gens.set(id, gen)

    for (const e of edges) {
      const rel = (e.data as unknown as EdgeData)?.relType
      if (rel === 'PARENT_OF') {
        if (e.target === id && !visited.has(e.source))
          queue.push({ id: e.source, gen: gen - 1 })
        if (e.source === id && !visited.has(e.target))
          queue.push({ id: e.target, gen: gen + 1 })
      } else if (rel === 'SPOUSE_OF') {
        if (e.source === id && !visited.has(e.target))
          queue.push({ id: e.target, gen })
        if (e.target === id && !visited.has(e.source))
          queue.push({ id: e.source, gen })
      }
    }
  }

  for (const n of nodes) {
    if (!gens.has(n.id)) gens.set(n.id, 0)
  }

  return gens
}
