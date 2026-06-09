'use client'

// NodeConnector — animated dashed line + central bubble that joins the anchor
// card to the new card in the NodeHero. The line is vertical for above/below
// (parent/child) and horizontal for beside (spouse/sibling). The bubble icon
// reflects the relation: heart for spouse, arrows-left-right for sibling,
// arrow-down for parent/child.

import { motion } from 'framer-motion'
import { IconArrowDown, IconHeart, IconArrowsLeftRight } from '@tabler/icons-react'
import type { RelAction } from '../Navbar'
import type { Direction } from './types'

interface NodeConnectorProps {
  direction: Direction
  relAction: RelAction
  isDark:    boolean
}

export default function NodeConnector({ direction, relAction, isDark }: NodeConnectorProps) {
  const dashH = `repeating-linear-gradient(to right,${isDark ? 'rgba(234,88,12,0.45)' : 'rgba(234,88,12,0.32)'} 0 5px,transparent 5px 10px)`
  const dashV = `repeating-linear-gradient(to bottom,${isDark ? 'rgba(234,88,12,0.45)' : 'rgba(234,88,12,0.32)'} 0 5px,transparent 5px 10px)`

  const bubbleIcon = direction !== 'beside'
    ? <IconArrowDown size={14} color="#EA580C" />
    : relAction === 'spouse'
      ? <IconHeart size={14} color="#EA580C" />
      : <IconArrowsLeftRight size={14} color="#EA580C" />

  const bubble = (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.5, type: 'spring', stiffness: 340, damping: 22 }}
      style={{
        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
        background: isDark ? '#1C1410' : '#FFF7ED',
        border: `2px solid ${isDark ? 'rgba(234,88,12,0.35)' : 'rgba(234,88,12,0.28)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: `0 0 0 5px ${isDark ? 'rgba(234,88,12,0.07)' : 'rgba(234,88,12,0.06)'}`,
      }}
    >
      {bubbleIcon}
    </motion.div>
  )

  if (direction === 'beside') {
    return (
      <div style={{ flex: '0 1 72px', minWidth: 40, display: 'flex', alignItems: 'center' }}>
        <motion.div
          initial={{ scaleX: 0, opacity: 0 }} animate={{ scaleX: 1, opacity: 1 }}
          transition={{ delay: 0.28, duration: 0.3 }}
          style={{ flex: 1, height: 2, background: dashH, transformOrigin: 'left' }}
        />
        {bubble}
        <motion.div
          initial={{ scaleX: 0, opacity: 0 }} animate={{ scaleX: 1, opacity: 1 }}
          transition={{ delay: 0.65, duration: 0.3 }}
          style={{ flex: 1, height: 2, background: dashH, transformOrigin: 'right' }}
        />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: 60 }}>
      <motion.div
        initial={{ scaleY: 0, opacity: 0 }} animate={{ scaleY: 1, opacity: 1 }}
        transition={{ delay: 0.28, duration: 0.3 }}
        style={{ flex: 1, width: 2, background: dashV, transformOrigin: 'top' }}
      />
      {bubble}
      <motion.div
        initial={{ scaleY: 0, opacity: 0 }} animate={{ scaleY: 1, opacity: 1 }}
        transition={{ delay: 0.65, duration: 0.3 }}
        style={{ flex: 1, width: 2, background: dashV, transformOrigin: 'bottom' }}
      />
    </div>
  )
}
