'use client'

// SidePanel — the right-side slide-in chrome used by NotificationPanel,
// MergeComparisonPanel, and other secondary panels.
//
// Provides:
//   • Spring-based slide-from-right animation (configurable via `withOpacity`)
//   • Standard width / z-index / border / theme background
//   • boxShadow tuned to the active theme
//   • Vertical scroll on overflow
//
// Consumers supply their own header + body — only the chrome is unified.
//
// NodePanel is intentionally NOT converted to use SidePanel: it has dual
// behaviour (desktop slide-in + mobile bottom-sheet) that would need too
// many SidePanel parameters to express cleanly.

import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { getTheme } from '@/lib/theme'

export interface SidePanelProps {
  isDark:       boolean
  children:     ReactNode
  /** Pixel width on desktop. Default 360. */
  width?:       number
  /** z-index. Default 100. */
  zIndex?:      number
  /** When true, also fades opacity 0 → 1 (NotificationPanel style). Default false. */
  withOpacity?: boolean
}

export function SidePanel({
  isDark, children, width = 360, zIndex = 100, withOpacity = false,
}: SidePanelProps) {
  const t = getTheme(isDark)

  const initial = withOpacity ? { x: '100%', opacity: 0 } : { x: width }
  const animate = withOpacity ? { x: 0,      opacity: 1 } : { x: 0 }
  const exit    = withOpacity ? { x: '100%', opacity: 0 } : { x: width }

  return (
    <motion.div
      initial={initial}
      animate={animate}
      exit={exit}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      style={{
        position:      'fixed',
        top:           0, right: 0, bottom: 0,
        width:         `${width}px`,
        // Responsive: never exceed the viewport on small screens.
        maxWidth:      '100vw',
        zIndex,
        background:    t.panelBg,
        borderLeft:    `1.5px solid ${t.borderNeutral ?? t.border}`,
        boxShadow:     isDark ? '-8px 0 32px rgba(0,0,0,0.5)' : '-4px 0 24px rgba(0,0,0,0.10)',
        display:       'flex',
        flexDirection: 'column',
        overflow:      'hidden',
      }}
    >
      {children}
    </motion.div>
  )
}
