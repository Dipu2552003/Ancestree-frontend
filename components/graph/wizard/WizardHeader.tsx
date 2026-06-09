'use client'

// Top bar of the AddNodeWizard modal — back/close button on the left, title
// + "to <anchor>'s family" subtitle, animated step-progress dots, and a close
// X on the right. Pure presentation — all behavior comes from props.

import { motion } from 'framer-motion'
import { IconX, IconArrowLeft } from '@tabler/icons-react'
import { COLORS, type Theme } from '@/lib/theme'
import type { StepId } from './types'

interface WizardHeaderProps {
  isDark:     boolean
  t:          Theme
  title:      string          // e.g. "Add Father"
  anchorName: string
  stepIdx:    number
  steps:      StepId[]
  onBack:     () => void      // called instead of onClose when stepIdx > 0
  onClose:    () => void
}

export default function WizardHeader({
  isDark, t, title, anchorName, stepIdx, steps, onBack, onClose,
}: WizardHeaderProps) {
  const iconBtn: React.CSSProperties = {
    width: 32, height: 32, borderRadius: 9, flexShrink: 0, border: 'none', cursor: 'pointer',
    background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)', color: t.textMuted,
    display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.12s',
  }
  const hoverIn  = (e: React.MouseEvent<HTMLButtonElement>) =>
    (e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.12)')
  const hoverOut = (e: React.MouseEvent<HTMLButtonElement>) =>
    (e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)')

  return (
    <div style={{
      padding: '16px 20px 14px',
      borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}`,
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <button onClick={stepIdx === 0 ? onClose : onBack} style={iconBtn} onMouseEnter={hoverIn} onMouseLeave={hoverOut}>
        {stepIdx === 0 ? <IconX size={14} /> : <IconArrowLeft size={14} />}
      </button>

      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: t.text, lineHeight: 1.2 }}>
          {title}
        </div>
        <div style={{ fontSize: 11, color: t.textMuted, marginTop: 2 }}>
          to <span style={{ color: COLORS.saffron, fontWeight: 600 }}>{anchorName}</span>&apos;s family
        </div>
      </div>

      <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
        {steps.map((_, i) => (
          <motion.div key={i}
            animate={{
              width: i === stepIdx ? 18 : 6,
              background: i <= stepIdx ? COLORS.saffron : isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.10)',
            }}
            transition={{ duration: 0.22 }}
            style={{ height: 5, borderRadius: 3 }}
          />
        ))}
      </div>

      <button onClick={onClose} style={iconBtn} onMouseEnter={hoverIn} onMouseLeave={hoverOut}>
        <IconX size={14} />
      </button>
    </div>
  )
}
