'use client'

// Child / sibling add — biological vs adopted. Picking 'adopted' adds the
// 'bio-parents' step to the wizard flow downstream.

import { motion } from 'framer-motion'
import { IconLoader2, IconCheck } from '@tabler/icons-react'
import { COLORS, type Theme } from '@/lib/theme'
import { firstName, slide } from '../helpers'
import type { AdoptionStatus } from '../types'
import type { WizardStyles } from '../styles'

interface StepRelationshipProps {
  dir:                number
  isDark:             boolean
  t:                  Theme
  styles:             WizardStyles
  fullName:           string
  isSiblingAdd:       boolean
  adoptionStatus:     AdoptionStatus
  saving:             boolean
  saved:              boolean
  isLastStep:         boolean
  setAdoptionStatus:  (v: AdoptionStatus) => void
  onPrimary:          () => void
}

export default function StepRelationship({
  dir, isDark, t, styles,
  fullName, isSiblingAdd, adoptionStatus,
  saving, saved, isLastStep,
  setAdoptionStatus, onPrimary,
}: StepRelationshipProps) {
  return (
    <motion.div key="relationship" custom={dir} variants={slide} initial="enter" animate="center" exit="exit"
      transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
      style={{ padding: '24px 28px 26px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 19, fontWeight: 700, color: t.text, letterSpacing: '-0.01em', lineHeight: 1.2 }}>
          Is {firstName(fullName) || (isSiblingAdd ? 'this sibling' : 'this child')} biological or adopted?
        </h2>
        <p style={{ margin: '5px 0 0', fontSize: 12.5, color: t.textMuted }}>
          {isSiblingAdd
            ? 'Adopted siblings inherit the family but their bio parents are recorded separately.'
            : 'Affects how parents are connected in the tree.'}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {(['biological', 'adopted'] as const).map(val => {
          const active = adoptionStatus === val
          const label  = val === 'biological' ? 'Biological' : 'Adopted'
          return (
            <motion.button key={val} type="button"
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={() => setAdoptionStatus(val)}
              style={{
                padding: '16px 12px', borderRadius: 13, cursor: 'pointer', fontFamily: 'inherit',
                border: `2px solid ${active ? COLORS.saffron : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.09)'}`,
                background: active ? (isDark ? 'rgba(234,88,12,0.12)' : 'rgba(234,88,12,0.07)') : isDark ? 'rgba(255,255,255,0.02)' : '#FFFAF5',
                color: active ? COLORS.saffron : t.text,
                fontSize: 14, fontWeight: 700,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              }}>
              {label}
            </motion.button>
          )
        })}
      </div>

      <motion.button onClick={onPrimary} disabled={saving || saved}
        whileHover={!saving && !saved ? { scale: 1.015 } : {}}
        whileTap={!saving && !saved ? { scale: 0.98 } : {}}
        style={styles.btnPrimary}>
        {saving && <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}><IconLoader2 size={15} /></motion.div>}
        {saved  && <IconCheck size={15} strokeWidth={2.5} />}
        {saving ? 'Adding…' : saved ? 'Added!' : isLastStep ? '✓ Add to family tree' : 'Continue →'}
      </motion.button>
    </motion.div>
  )
}
