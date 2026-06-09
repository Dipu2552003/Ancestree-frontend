'use client'

// GenderCard — one of three options on the spouse 'gender' step (male / female
// / other). The `fullWidth` variant is used for the "Other/Unknown" row that
// spans below the two main choices.

import { useState } from 'react'
import { motion } from 'framer-motion'
import { COLORS, getTheme } from '@/lib/theme'
import type { GENDER_OPTIONS } from './config'

interface GenderCardProps {
  option:    typeof GENDER_OPTIONS[0]
  selected:  boolean
  isDark:    boolean
  t:         ReturnType<typeof getTheme>
  fullWidth?: boolean
  onClick:   () => void
}

export default function GenderCard({
  option, selected, isDark, t, fullWidth, onClick,
}: GenderCardProps) {
  const [hov, setHov] = useState(false)
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', flexDirection: fullWidth ? 'row' : 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: fullWidth ? '10px' : '6px',
        padding: fullWidth ? '12px 20px' : '18px 14px',
        borderRadius: '13px', cursor: 'pointer', fontFamily: 'inherit',
        border: `2px solid ${selected ? COLORS.saffron : hov ? option.color + '77' : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.09)'}`,
        background: selected
          ? (isDark ? 'rgba(234,88,12,0.12)' : 'rgba(234,88,12,0.07)')
          : hov ? t.itemHoverBg : isDark ? 'rgba(255,255,255,0.02)' : '#FFFAF5',
        transition: 'border-color 0.15s, background 0.15s',
      }}
    >
      <span style={{ fontSize: fullWidth ? 18 : 24, color: selected ? COLORS.saffron : option.color, lineHeight: 1 }}>
        {option.symbol}
      </span>
      <span style={{ fontSize: 12.5, fontWeight: 600, color: selected ? COLORS.saffron : t.text, transition: 'color 0.15s' }}>
        {option.label}
      </span>
    </motion.button>
  )
}
