'use client'

// Multi-spouse only — pick which spouse is the child's (or sibling's) mother.

import { motion } from 'framer-motion'
import { IconLoader2, IconCheck } from '@tabler/icons-react'
import { COLORS, type Theme } from '@/lib/theme'
import { firstName, slide } from '../helpers'
import type { AdoptionStatus, MotherChoice } from '../types'
import type { WizardStyles } from '../styles'

interface MotherOption {
  id: string
  name: string
}

interface StepMotherProps {
  dir:              number
  isDark:           boolean
  t:                Theme
  styles:           WizardStyles
  fullName:         string
  anchorName:       string
  isSiblingAdd:     boolean
  adoptionStatus:   AdoptionStatus
  motherChoice:     MotherChoice
  motherOptions:    MotherOption[]
  saving:           boolean
  saved:            boolean
  isLastStep:       boolean
  setMotherChoice:  (v: MotherChoice) => void
  onPrimary:        () => void
}

export default function StepMother({
  dir, isDark, t, styles,
  fullName, anchorName, isSiblingAdd, adoptionStatus,
  motherChoice, motherOptions,
  saving, saved, isLastStep,
  setMotherChoice, onPrimary,
}: StepMotherProps) {
  return (
    <motion.div key="mother" custom={dir} variants={slide} initial="enter" animate="center" exit="exit"
      transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
      style={{ padding: '24px 28px 26px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 19, fontWeight: 700, color: t.text, letterSpacing: '-0.01em', lineHeight: 1.2 }}>
          Who is {firstName(fullName) || (isSiblingAdd ? 'the sibling' : 'the child')}{adoptionStatus === 'adopted' ? '’s adoptive mother' : '’s mother'}?
        </h2>
        <p style={{ margin: '5px 0 0', fontSize: 12.5, color: t.textMuted }}>
          {isSiblingAdd
            ? `Pick which wife of ${anchorName}’s father — same mother as ${anchorName} = full sibling; different = half sibling.`
            : `${anchorName} has more than one spouse — pick the right one.`}
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {motherOptions.map(sp => {
          const active = motherChoice === sp.id
          return (
            <button key={sp.id} onClick={() => setMotherChoice(sp.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '11px 13px', borderRadius: 11, cursor: 'pointer',
                fontFamily: 'inherit', textAlign: 'left',
                border: `1.5px solid ${active ? COLORS.saffron : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.09)'}`,
                background: active ? (isDark ? 'rgb(var(--c-primary-rgb) / 0.12)' : 'rgb(var(--c-primary-rgb) / 0.07)') : isDark ? 'rgba(255,255,255,0.02)' : '#FFFAF5',
                color: active ? COLORS.saffron : t.text,
                fontSize: 13.5, fontWeight: 600,
              }}>
              <span style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${active ? COLORS.saffron : t.textMuted}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {active && <span style={{ width: 7, height: 7, borderRadius: '50%', background: COLORS.saffron }} />}
              </span>
              <span>{sp.name}</span>
            </button>
          )
        })}
      </div>

      <motion.button onClick={() => motherChoice ? onPrimary() : undefined}
        disabled={!motherChoice || saving || saved}
        whileHover={motherChoice && !saving && !saved ? { scale: 1.015 } : {}}
        whileTap={motherChoice && !saving && !saved ? { scale: 0.98 } : {}}
        style={{ ...styles.btnPrimary, opacity: motherChoice ? 1 : 0.5, cursor: motherChoice ? 'pointer' : 'default' }}>
        {saving && <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}><IconLoader2 size={15} /></motion.div>}
        {saved  && <IconCheck size={15} strokeWidth={2.5} />}
        {saving ? 'Adding…' : saved ? 'Added!' : isLastStep ? '✓ Add to family tree' : 'Continue →'}
      </motion.button>
    </motion.div>
  )
}
