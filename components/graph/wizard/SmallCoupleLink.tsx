'use client'

// SmallCoupleLink — short horizontal heart-bubble link between the two
// parents in TrioHero. Compact variant of NodeConnector for the 'mother'
// step preview only.

import { motion } from 'framer-motion'
import { IconHeart } from '@tabler/icons-react'

export default function SmallCoupleLink({ isDark }: { isDark: boolean }) {
  const dashH = `repeating-linear-gradient(to right,${isDark ? 'rgba(234,88,12,0.45)' : 'rgba(234,88,12,0.32)'} 0 5px,transparent 5px 10px)`
  return (
    <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0, padding: '0 4px' }}>
      <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.18, duration: 0.28 }}
        style={{ width: 16, height: 2, background: dashH, transformOrigin: 'left' }} />
      <motion.div
        initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.32, type: 'spring', stiffness: 360, damping: 22 }}
        style={{
          width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
          background: isDark ? '#1C1410' : '#FFF7ED',
          border: `1.5px solid ${isDark ? 'rgba(234,88,12,0.35)' : 'rgba(234,88,12,0.28)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 0 0 3px ${isDark ? 'rgba(234,88,12,0.07)' : 'rgba(234,88,12,0.05)'}`,
        }}>
        <IconHeart size={11} color="#EA580C" />
      </motion.div>
      <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.42, duration: 0.28 }}
        style={{ width: 16, height: 2, background: dashH, transformOrigin: 'right' }} />
    </div>
  )
}
