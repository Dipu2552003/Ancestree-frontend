'use client'

import { motion } from 'framer-motion'
import { type EdgeProps, useNodes } from '@xyflow/react'
import { useGraphStore } from '@/store/graphStore'

const NODE_W = 128
const NODE_H = 158  // PHOTO_H (118) + STRIP_H (40)

export default function FamilyEdge({ source, target, data }: EdgeProps) {
  const { isDark } = useGraphStore()
  const nodes      = useNodes()

  const animDelay      = ((data as Record<string, unknown>)?.animDelay as number ?? 0) / 1000
  const sharedChildren = (data as Record<string, unknown>)?.sharedChildren as string[] | undefined
  if (!sharedChildren || sharedChildren.length === 0) return null

  const posOf = (id: string) => nodes.find(n => n.id === id)?.position

  const pA = posOf(source)
  const pB = posOf(target)
  if (!pA || !pB) return null

  // Ensure left is truly left
  const [leftPos, rightPos] = pA.x <= pB.x ? [pA, pB] : [pB, pA]

  // ── Side-to-side couple bar ───────────────────────────────────────
  // Connect from the inner edges of the two parent cards at mid-height.
  // This draws a horizontal bar in the gap between the cards.
  const coupleLineY   = Math.max(leftPos.y, rightPos.y) + NODE_H / 2
  const leftInnerX    = leftPos.x  + NODE_W   // right edge of left  parent
  const rightInnerX   = rightPos.x             // left  edge of right parent
  const midX          = (leftInnerX + rightInnerX) / 2

  // Trunk descends from the couple bar midpoint; starts just below the card
  const parentBottomY = Math.max(leftPos.y, rightPos.y) + NODE_H

  const children = sharedChildren
    .map(id => { const p = posOf(id); return p ? { x: p.x + NODE_W / 2, topY: p.y } : null })
    .filter((c): c is { x: number; topY: number } => c !== null)

  if (children.length === 0) return null

  const childTopY = Math.min(...children.map(c => c.topY))
  const junctionY = parentBottomY + (childTopY - parentBottomY) * 0.5
  const leftBusX  = Math.min(...children.map(c => c.x))
  const rightBusX = Math.max(...children.map(c => c.x))

  let d = ''

  // Horizontal couple bar: inner side of left parent → inner side of right parent
  d += `M ${leftInnerX} ${coupleLineY} H ${rightInnerX} `

  // Vertical trunk: from couple bar midpoint down through junction
  d += `M ${midX} ${coupleLineY} V ${junctionY} `

  if (children.length === 1) {
    // Shift to child centre if needed, then drop
    d += `L ${children[0].x} ${junctionY} V ${children[0].topY} `
  } else {
    // Horizontal branches from trunk midpoint to span of children
    if (leftBusX  < midX) d += `M ${midX} ${junctionY} H ${leftBusX}  `
    if (rightBusX > midX) d += `M ${midX} ${junctionY} H ${rightBusX} `
    // Drops from bus to each child top
    for (const c of children) {
      d += `M ${c.x} ${junctionY} V ${c.topY} `
    }
  }

  const stroke      = isDark ? '#6B5F54' : '#B5956A'
  const targetOpacity = isDark ? 0.72 : 0.88

  return (
    <motion.path
      d={d}
      fill="none"
      stroke={stroke}
      strokeWidth={1.5}
      strokeLinecap="square"
      initial={{ opacity: 0 }}
      animate={{ opacity: targetOpacity }}
      transition={{ duration: 0.35, delay: animDelay }}
    />
  )
}

export const familyEdgeType = { familyEdge: FamilyEdge }
