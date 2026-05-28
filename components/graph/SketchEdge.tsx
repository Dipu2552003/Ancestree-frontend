'use client'

import { motion } from 'framer-motion'
import { type EdgeProps, getSmoothStepPath } from '@xyflow/react'
import { useGraphStore } from '@/store/graphStore'

export default function SketchEdge({
  id, sourceX, sourceY, sourcePosition,
  targetX, targetY, targetPosition, data,
}: EdgeProps) {
  const { isDark } = useGraphStore()
  const stroke     = isDark ? '#6B5F54' : '#B5956A'
  const relType    = (data as Record<string, unknown>)?.relType as string | undefined
  const animDelay  = ((data as Record<string, unknown>)?.animDelay as number ?? 0) / 1000

  const [edgePath] = getSmoothStepPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
    borderRadius: 12,
  })

  const markerId  = `arrow-${id}`
  const markerSId = `arrow-s-${id}`

  if (relType === 'SPOUSE_OF') {
    return (
      <>
        <defs>
          <marker id={markerSId} viewBox="0 0 10 10" refX="2" refY="5"
            markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 8 1 L 1 5 L 8 9 z" fill={stroke} />
          </marker>
        </defs>
        <motion.path
          d={edgePath}
          fill="none"
          stroke={stroke}
          strokeWidth={1.2}
          strokeDasharray="4 3"
          strokeLinecap="round"
          markerStart={`url(#${markerSId})`}
          markerEnd={`url(#${markerSId})`}
          initial={{ opacity: 0 }}
          animate={{ opacity: isDark ? 0.55 : 0.65 }}
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
