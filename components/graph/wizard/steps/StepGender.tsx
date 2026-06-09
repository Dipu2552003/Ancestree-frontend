'use client'

// Spouse-only — pick male / female / other. Tapping any option also advances.

import { motion } from 'framer-motion'
import type { Theme } from '@/lib/theme'
import { GENDER_OPTIONS } from '../config'
import { firstName, slide } from '../helpers'
import GenderCard from '../GenderCard'
import type { WizardStyles } from '../styles'

interface StepGenderProps {
  dir:        number
  isDark:     boolean
  t:          Theme
  styles:     WizardStyles
  fullName:   string
  gender:     string
  setGender:  (v: string) => void
  goNext:     () => void
}

export default function StepGender({
  dir, isDark, t, styles, fullName, gender, setGender, goNext,
}: StepGenderProps) {
  return (
    <motion.div key="gender" custom={dir} variants={slide} initial="enter" animate="center" exit="exit"
      transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
      style={{ padding: '24px 28px 26px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 19, fontWeight: 700, color: t.text, letterSpacing: '-0.01em', lineHeight: 1.2 }}>
          Is {firstName(fullName) || 'this person'}…
        </h2>
        <p style={{ margin: '5px 0 0', fontSize: 12.5, color: t.textMuted }}>
          Helps show the right avatar and relationship labels.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {GENDER_OPTIONS.slice(0, 2).map(g => (
            <GenderCard key={g.value} option={g} selected={gender === g.value} isDark={isDark} t={t}
              onClick={() => { setGender(g.value); goNext() }} />
          ))}
        </div>
        <GenderCard option={GENDER_OPTIONS[2]} selected={gender === 'other'} isDark={isDark} t={t} fullWidth
          onClick={() => { setGender('other'); goNext() }} />
      </div>

      <button onClick={() => { setGender(''); goNext() }} style={styles.btnSkip}
        onMouseEnter={e => (e.currentTarget.style.color = t.text)}
        onMouseLeave={e => (e.currentTarget.style.color = t.textMuted)}>
        Skip — I&apos;ll add this later
      </button>
    </motion.div>
  )
}
