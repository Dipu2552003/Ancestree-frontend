import type { Node, Edge } from '@xyflow/react'
import { defaultLayout } from './defaultLayout'
import { classifyFamilySides } from './classifyNodes'
import { computeGenerations } from './computeGenerations'

const H      = 220
const V      = 260
const BASE_Y = 300

type Pos = { x: number; y: number }

export function fullViewLayout(nodes: Node[], edges: Edge[]): Node[] {
  if (nodes.length === 0) return nodes

  const cls = classifyFamilySides(nodes, edges)
  if (!cls) return defaultLayout(nodes, edges)

  const { selfId, paternalSet, maternalSet, siblingSet, childSet } = cls

  const nodeMap = new Map(nodes.map(n => [n.id, n]))
  const d     = (id: string) => nodeMap.get(id)!.data as Record<string, unknown>
  const gens  = computeGenerations(nodes, edges)
  const genOf = (id: string) => gens.get(id) ?? 0
  const Y     = (g: number)  => BASE_Y + g * V

  // ── position accumulator ─────────────────────────────────────────
  const pos = new Map<string, Pos>()

  // ── center row: self ─────────────────────────────────────────────
  pos.set(selfId, { x: 0, y: Y(genOf(selfId)) })

  // ── center row: siblings, alternating outward ────────────────────
  const sibs = [...siblingSet]
    .filter(id => nodeMap.has(id))
    .sort((a, b) =>
      ((d(a).fullName as string) ?? '').localeCompare((d(b).fullName as string) ?? ''),
    )
  for (let i = 0; i < sibs.length; i++) {
    const side = i % 2 === 0 ? 1 : -1
    const dist = Math.floor(i / 2) + 1
    pos.set(sibs[i], { x: side * dist * H, y: Y(genOf(sibs[i])) })
  }

  const sibMin = Math.min(0, ...[...pos.values()].map(p => p.x))
  const sibMax = Math.max(0, ...[...pos.values()].map(p => p.x))

  // ── paternal subtree ─────────────────────────────────────────────
  // Shift so rightmost paternal node is at sibMin - H.
  if (paternalSet.size > 0) {
    const subNodes = nodes.filter(n => paternalSet.has(n.id))
    const subEdges = edges.filter(e => paternalSet.has(e.source) && paternalSet.has(e.target))
    const result   = defaultLayout(subNodes, subEdges)
    const subPos   = new Map(result.map(n => [n.id, n.position]))
    const maxX     = Math.max(...[...subPos.values()].map(p => p.x))
    const shift    = (sibMin - H) - maxX
    for (const [id, p] of subPos) pos.set(id, { x: p.x + shift, y: Y(genOf(id)) })
  }

  // ── maternal subtree ─────────────────────────────────────────────
  // Shift so leftmost maternal node is at sibMax + H.
  if (maternalSet.size > 0) {
    const subNodes = nodes.filter(n => maternalSet.has(n.id))
    const subEdges = edges.filter(e => maternalSet.has(e.source) && maternalSet.has(e.target))
    const result   = defaultLayout(subNodes, subEdges)
    const subPos   = new Map(result.map(n => [n.id, n.position]))
    const minX     = Math.min(...[...subPos.values()].map(p => p.x))
    const shift    = (sibMax + H) - minX
    for (const [id, p] of subPos) pos.set(id, { x: p.x + shift, y: Y(genOf(id)) })
  }

  // ── children subtree ─────────────────────────────────────────────
  // Centered under self (x = 0).
  if (childSet.size > 0) {
    const subNodes = nodes.filter(n => childSet.has(n.id))
    const subEdges = edges.filter(e => childSet.has(e.source) && childSet.has(e.target))
    const result   = defaultLayout(subNodes, subEdges)
    const subPos   = new Map(result.map(n => [n.id, n.position]))
    const xs       = [...subPos.values()].map(p => p.x)
    const avgX     = xs.reduce((s, x) => s + x, 0) / xs.length
    for (const [id, p] of subPos) pos.set(id, { x: p.x - avgX, y: Y(genOf(id)) })
  }

  // ── unclassified fallback ─────────────────────────────────────────
  let cursor = 1
  for (const n of nodes) {
    if (!pos.has(n.id)) {
      pos.set(n.id, { x: cursor * H, y: Y(genOf(n.id)) })
      cursor++
    }
  }

  return nodes.map(n => ({ ...n, position: pos.get(n.id) ?? { x: 0, y: 0 } }))
}
