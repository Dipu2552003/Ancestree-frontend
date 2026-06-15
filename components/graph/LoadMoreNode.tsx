'use client'

import { motion } from 'framer-motion'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { IconChevronUp, IconChevronDown } from '@tabler/icons-react'
import { useGraphStore } from '@/store/graphStore'
import { DEPTH_LOAD_STEP } from '@/lib/api'
import { getTheme } from '@/lib/theme'

const WIDTH  = 220
const HEIGHT = 44

interface LoadMoreData {
  direction: 'ancestors' | 'descendants'
  animDelay?: number
}

function LoadMoreNode({ data }: NodeProps) {
  const { direction, animDelay = 0 } = data as unknown as LoadMoreData
  const { isDark, bumpAncestorDepth, bumpDescendantDepth, hasMoreAncestors, hasMoreDescendants } = useGraphStore()
  const t = getTheme(isDark)

  // Defensive: if the flag has flipped to false between render and click,
  // the bump action is a no-op anyway — but the chip should already have
  // unmounted via the injection guard in useGraphData.
  const isAncestors = direction === 'ancestors'
  const onClick = isAncestors ? bumpAncestorDepth : bumpDescendantDepth
  const stillAvailable = isAncestors ? hasMoreAncestors : hasMoreDescendants

  const Icon = isAncestors ? IconChevronUp : IconChevronDown
  const label = isAncestors
    ? `Load ${DEPTH_LOAD_STEP} more ancestors`
    : `Load ${DEPTH_LOAD_STEP} more descendants`

  return (
    <>
      {/* Handles let edges from the topmost ancestor row visually anchor to the
          chip if we ever want to draw a faint "more above" connector. They're
          unused today but cheap to keep. */}
      <Handle type="target" position={Position.Bottom} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Top}    style={{ opacity: 0 }} />

      <motion.button
        type="button"
        onClick={onClick}
        disabled={!stillAvailable}
        initial={{ opacity: 0, y: isAncestors ? 8 : -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: animDelay, duration: 0.25 }}
        whileHover={{ scale: stillAvailable ? 1.04 : 1 }}
        whileTap={{ scale: stillAvailable ? 0.97 : 1 }}
        style={{
          width: WIDTH,
          height: HEIGHT,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          padding: '0 18px',
          borderRadius: 999,
          border: `1.5px dashed ${isDark ? 'var(--c-secondary)' : 'var(--c-primary)'}`,
          background: isDark ? 'rgb(var(--c-secondary-rgb) / 0.12)' : 'var(--c-page)',
          color: isDark ? '#FBBF24' : 'var(--c-primary-strong)',
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: '0.01em',
          cursor: stillAvailable ? 'pointer' : 'default',
          boxShadow: isDark
            ? '0 2px 10px rgba(0,0,0,0.35)'
            : '0 2px 8px rgb(var(--c-primary-rgb) / 0.12)',
          userSelect: 'none',
          opacity: stillAvailable ? 1 : 0.55,
        }}
      >
        <Icon size={16} stroke={2.2} />
        <span>{label}</span>
      </motion.button>
    </>
  )
}

export const LOAD_MORE_NODE_WIDTH  = WIDTH
export const LOAD_MORE_NODE_HEIGHT = HEIGHT
export const loadMoreNodeType = { loadMoreNode: LoadMoreNode }
