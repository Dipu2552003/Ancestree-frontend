'use client'

// SmallChildLink — short vertical arrow-down bubble link between the parents
// row and the new child below them in TrioHero.

import { motion } from 'framer-motion'
import { IconArrowDown } from '@tabler/icons-react'

export default function SmallChildLink({ isDark }: { isDark: boolean }) {
  const dashV = `repeating-linear-gradient(to bottom,${isDark ? 'rgb(var(--c-primary-rgb) / 0.45)' : 'rgb(var(--c-primary-rgb) / 0.32)'} 0 5px,transparent 5px 10px)`
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4px 0' }}>
      <motion.div initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ delay: 0.20, duration: 0.28 }}
        style={{ width: 2, height: 14, background: dashV, transformOrigin: 'top' }} />
      <motion.div
        initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.34, type: 'spring', stiffness: 360, damping: 22 }}
        style={{
          width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
          background: isDark ? '#1C1410' : 'var(--c-page)',
          border: `1.5px solid ${isDark ? 'rgb(var(--c-primary-rgb) / 0.35)' : 'rgb(var(--c-primary-rgb) / 0.28)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
        <IconArrowDown size={11} color="var(--c-primary)" />
      </motion.div>
      <motion.div initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ delay: 0.46, duration: 0.28 }}
        style={{ width: 2, height: 14, background: dashV, transformOrigin: 'bottom' }} />
    </div>
  )
}
