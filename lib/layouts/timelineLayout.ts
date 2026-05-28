import type { Node, Edge } from '@xyflow/react'
import { defaultLayout } from './defaultLayout'

// pixels per year — governs the vertical scale of the timeline
export const YEAR_PX = 22

// fallback vertical gap for nodes that have no birth year (≈ avg 25 yrs/gen × YEAR_PX)
const V_FALLBACK = 25 * YEAR_PX

export function timelineLayout(nodes: Node[], edges: Edge[]): Node[] {
  if (nodes.length === 0) return nodes

  type D = Record<string, unknown>

  // Collect birth years to find the minimum anchor
  const birthYears = nodes
    .map(n => (n.data as D).birthYear as number | undefined)
    .filter((y): y is number => y != null)

  // No birth years at all — fall back to default layout
  if (birthYears.length === 0) return defaultLayout(nodes, edges)

  // Run the default layout first to obtain well-spaced X positions
  const withDefaultX = defaultLayout(nodes, edges)

  const minYear = Math.min(...birthYears)
  const Y = (year: number) => (year - minYear) * YEAR_PX

  return withDefaultX.map(n => {
    const birthYear = (n.data as D).birthYear as number | undefined
    const gen       = ((n.data as D).generation as number) ?? 0

    const y = birthYear != null
      ? Y(birthYear)
      : gen * V_FALLBACK   // no birth year → approximate by generation

    return { ...n, position: { x: n.position.x, y } }
  })
}
