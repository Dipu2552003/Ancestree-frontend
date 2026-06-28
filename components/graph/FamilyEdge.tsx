'use client'

import { motion } from 'framer-motion'
import { type EdgeProps, useNodes } from '@xyflow/react'
import { useGraphStore } from '@/store/graphStore'
import type { EdgeData } from '@/types'
import { getTheme } from '@/lib/theme'

const NODE_W = 128
const NODE_H = 158  // PHOTO_H (118) + STRIP_H (40)

export default function FamilyEdge({ source, target, data }: EdgeProps) {
  const { isDark } = useGraphStore()
  const nodes      = useNodes()

  const edgeData       = data as unknown as EdgeData | undefined
  const animDelay      = (edgeData?.animDelay ?? 0) / 1000
  const sharedChildren = edgeData?.sharedChildren
  const members        = edgeData?.members
  if (!sharedChildren || sharedChildren.length === 0) return null

  const posOf = (id: string) => nodes.find(n => n.id === id)?.position

  const children = sharedChildren
    .map(id => { const p = posOf(id); return p ? { x: p.x + NODE_W / 2, topY: p.y } : null })
    .filter((c): c is { x: number; topY: number } => c !== null)

  if (children.length === 0) return null

  let d = ''

  // ── Multi-spouse case: ONE wide common bar below ALL parents ───────────
  // Each parent drops a short vertical to a shared horizontal bar; a single
  // trunk descends from the bar's midpoint to the children spread.
  if (members && members.length > 2) {
    const memberPositions = members
      .map(id => posOf(id))
      .filter((p): p is { x: number; y: number } => !!p)
    if (memberPositions.length < 2) return null

    const parentBottomY = Math.max(...memberPositions.map(p => p.y)) + NODE_H
    const childTopY     = Math.min(...children.map(c => c.topY))
    // Common bar sits 24px below the parents — visually clear of the cards.
    const barY          = parentBottomY + Math.min(24, (childTopY - parentBottomY) * 0.30)
    const junctionY     = barY + (childTopY - barY) * 0.50

    const memberCenters = memberPositions.map(p => p.x + NODE_W / 2)
    const leftMostX     = Math.min(...memberCenters)
    const rightMostX    = Math.max(...memberCenters)

    // Vertical drop from each parent's bottom-centre down to the common bar.
    for (const p of memberPositions) {
      const cx = p.x + NODE_W / 2
      d += `M ${cx} ${p.y + NODE_H} V ${barY} `
    }
    // Common horizontal bar across all parents.
    d += `M ${leftMostX} ${barY} H ${rightMostX} `

    const trunkX  = (leftMostX + rightMostX) / 2
    d += `M ${trunkX} ${barY} V ${junctionY} `

    const leftBusX  = Math.min(...children.map(c => c.x))
    const rightBusX = Math.max(...children.map(c => c.x))

    if (children.length === 1) {
      d += `L ${children[0].x} ${junctionY} V ${children[0].topY} `
    } else {
      if (leftBusX  < trunkX) d += `M ${trunkX} ${junctionY} H ${leftBusX}  `
      if (rightBusX > trunkX) d += `M ${trunkX} ${junctionY} H ${rightBusX} `
      for (const c of children) {
        d += `M ${c.x} ${junctionY} V ${c.topY} `
      }
    }
  } else {
    // ── Single couple bracket (existing behaviour) ────────────────────────
    const pA = posOf(source)
    const pB = posOf(target)
    if (!pA || !pB) return null

    // Ensure left is truly left
    const [leftPos, rightPos] = pA.x <= pB.x ? [pA, pB] : [pB, pA]

    // Side-to-side couple bar in the gap between the two cards
    const coupleLineY   = Math.max(leftPos.y, rightPos.y) + NODE_H / 2
    const leftInnerX    = leftPos.x  + NODE_W
    const rightInnerX   = rightPos.x
    const midX          = (leftInnerX + rightInnerX) / 2

    const parentBottomY = Math.max(leftPos.y, rightPos.y) + NODE_H
    const childTopY     = Math.min(...children.map(c => c.topY))
    const junctionY     = parentBottomY + (childTopY - parentBottomY) * 0.5
    const leftBusX      = Math.min(...children.map(c => c.x))
    const rightBusX     = Math.max(...children.map(c => c.x))

    d += `M ${leftInnerX} ${coupleLineY} H ${rightInnerX} `
    d += `M ${midX} ${coupleLineY} V ${junctionY} `

    if (children.length === 1) {
      d += `L ${children[0].x} ${junctionY} V ${children[0].topY} `
    } else {
      if (leftBusX  < midX) d += `M ${midX} ${junctionY} H ${leftBusX}  `
      if (rightBusX > midX) d += `M ${midX} ${junctionY} H ${rightBusX} `
      for (const c of children) {
        d += `M ${c.x} ${junctionY} V ${c.topY} `
      }
    }
  }

  const themeStroke   = getTheme(isDark).stroke
  const stroke        = themeStroke
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
