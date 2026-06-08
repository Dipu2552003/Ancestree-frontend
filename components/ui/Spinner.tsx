'use client'

import { motion } from 'framer-motion'
import { IconLoader2 } from '@tabler/icons-react'

/** Replaces the inline `<motion.span animate={{rotate:360}}>...<IconLoader2 />`
 *  pattern that appears in ~20 places across the codebase. */
export function Spinner({ size = 14, color }: { size?: number; color?: string }) {
  return (
    <motion.span
      animate={{ rotate: 360 }}
      transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
      style={{ display: 'inline-flex', color }}
      aria-hidden
    >
      <IconLoader2 size={size} />
    </motion.span>
  )
}
