'use client'

import { motion } from 'framer-motion'
import { type EdgeProps, getSmoothStepPath } from '@xyflow/react'
import { useGraphStore } from '@/store/graphStore'
import type { EdgeData } from '@/types'
import { getTheme } from '@/lib/theme'
import { gotraColor } from '@/lib/graph/gotraColors'

export default function SketchEdge({
  id, sourceX, sourceY, sourcePosition,
  targetX, targetY, targetPosition, data,
}: EdgeProps) {
  const { isDark, gotraMode } = useGraphStore()
  const themeStroke = getTheme(isDark).stroke
  const edgeData    = data as unknown as EdgeData
  const relType     = edgeData?.relType
  const animDelay   = (edgeData?.animDelay ?? 0) / 1000
  // Edge gotra-highlight: PARENT_OF edges inherit parent's gotra color.
  // SPOUSE_OF and SIBLING_OF are intentionally left in theme color.
  const stroke = (gotraMode === 'edge' && relType === 'PARENT_OF')
    ? (gotraColor(edgeData?.sourceGotra) ?? themeStroke)
    : themeStroke

  const [edgePath] = getSmoothStepPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
    borderRadius: 12,
  })

  const markerId  = `arrow-${id}`
  const markerSId = `arrow-s-${id}`

  if (relType === 'SPOUSE_OF') {
    // Inactive marriage (divorced/separated/annulled/unknown) → sparser dots
    // and lower opacity so the active couple bracket reads as the focal one.
    const isInactive = (data as unknown as EdgeData)?.isActive === false
    const dashArray  = isInactive ? '2 6' : '4 3'
    const opacity    = isInactive
      ? (isDark ? 0.30 : 0.40)
      : (isDark ? 0.55 : 0.65)
    const width      = isInactive ? 1.0 : 1.2

    return (
      <>
        <defs>
          <marker id={markerSId} viewBox="0 0 10 10" refX="2" refY="5"
            markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 8 1 L 1 5 L 8 9 z" fill={stroke} fillOpacity={isInactive ? 0.5 : 1} />
          </marker>
        </defs>
        <motion.path
          d={edgePath}
          fill="none"
          stroke={stroke}
          strokeWidth={width}
          strokeDasharray={dashArray}
          strokeLinecap="round"
          markerStart={isInactive ? undefined : `url(#${markerSId})`}
          markerEnd={isInactive ? undefined : `url(#${markerSId})`}
          initial={{ opacity: 0 }}
          animate={{ opacity }}
          transition={{ duration: 0.3, delay: animDelay }}
        />
      </>
    )
  }

  if (relType === 'SIBLING_OF') {
    return (
      <motion.path
        d={edgePath}
        fill="none"
        stroke={stroke}
        strokeWidth={1.2}
        strokeDasharray="3 3"
        strokeLinecap="round"
        initial={{ opacity: 0 }}
        animate={{ opacity: isDark ? 0.45 : 0.55 }}
        transition={{ duration: 0.3, delay: animDelay }}
      />
    )
  }

  // PARENT_OF (default) — solid with arrow
  return (
    <>
      <defs>
        <marker id={markerId} viewBox="0 0 10 10" refX="8" refY="5"
          markerWidth="7" markerHeight="7" orient="auto">
          <path d="M 0 1 L 8 5 L 0 9 z" fill={stroke} />
        </marker>
      </defs>
      <motion.path
        d={edgePath}
        fill="none"
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        markerEnd={`url(#${markerId})`}
        initial={{ opacity: 0 }}
        animate={{ opacity: isDark ? 0.7 : 0.85 }}
        transition={{ duration: 0.3, delay: animDelay }}
      />
    </>
  )
}

export const edgeTypes = { sketchEdge: SketchEdge }
