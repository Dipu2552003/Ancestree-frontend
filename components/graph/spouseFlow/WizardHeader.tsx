'use client'

// WizardHeader — top strip on the SecondSpouseWizard modal: back/close button,
// title + sub-title, and progress dots. Sticky so it stays visible as Phase 3
// scrolls (many children → tall body).

import { motion } from 'framer-motion'
import { IconX, IconArrowLeft } from '@tabler/icons-react'
import { COLORS, getTheme } from '@/lib/theme'

interface WizardHeaderProps {
  title:        string
  anchorName:   string
  isDark:       boolean
  phaseIndex:   number
  totalPhases:  number
  onBack:       () => void
  /** Back button shows X on the first phase, ArrowLeft otherwise. */
  isFirstPhase: boolean
}

export default function WizardHeader({
  title, anchorName, isDark, phaseIndex, totalPhases, onBack, isFirstPhase,
}: WizardHeaderProps) {
  const t = getTheme(isDark)
  const cardBg = isDark ? '#1C1410' : '#FFFAF5'

  return (
    <div style={{
      padding: '16px 20px 14px',
      borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}`,
      display: 'flex', alignItems: 'center', gap: 12,
      position: 'sticky', top: 0, background: cardBg, zIndex: 1,
    }}>
      <button
        onClick={onBack}
        style={{
          width: 32, height: 32, borderRadius: 9, flexShrink: 0, border: 'none', cursor: 'pointer',
          background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)', color: t.textMuted,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {isFirstPhase ? <IconX size={14} /> : <IconArrowLeft size={14} />}
      </button>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: t.text, lineHeight: 1.2 }}>
          {title}
        </div>
        <div style={{ fontSize: 11, color: t.textMuted, marginTop: 2 }}>
          for <span style={{ color: COLORS.saffron, fontWeight: 600 }}>{anchorName}</span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
        {Array.from({ length: totalPhases }).map((_, i) => (
          <motion.div key={i}
            animate={{
              width: i === phaseIndex ? 18 : 6,
              background: i <= phaseIndex ? COLORS.saffron : isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.10)',
            }}
            style={{ height: 5, borderRadius: 3 }}
          />
        ))}
      </div>
    </div>
  )
}
