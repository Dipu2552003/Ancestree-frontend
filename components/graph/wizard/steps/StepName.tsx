'use client'

// Step 1 for every relation — collect the new person's full name.

import { motion, AnimatePresence } from 'framer-motion'
import { COLORS, type Theme } from '@/lib/theme'
import { slide } from '../helpers'
import type { WizardStyles } from '../styles'

interface StepNameProps {
  dir:              number
  isDark:           boolean
  t:                Theme
  styles:           WizardStyles
  relLabel:         string                    // e.g. "Father" — used in the helper copy
  fullName:         string
  nameError:        string
  nameRef:          React.RefObject<HTMLInputElement | null>
  setFullName:      (v: string) => void
  setNameError:     (v: string) => void
  onContinue:       () => void
}

export default function StepName({
  dir, isDark, t, styles, relLabel,
  fullName, nameError, nameRef,
  setFullName, setNameError, onContinue,
}: StepNameProps) {
  return (
    <motion.div key="name" custom={dir} variants={slide} initial="enter" animate="center" exit="exit"
      transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
      style={{ padding: '24px 28px 26px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 19, fontWeight: 700, color: t.text, letterSpacing: '-0.01em', lineHeight: 1.2 }}>
          What is their name?
        </h2>
        <p style={{ margin: '5px 0 0', fontSize: 12.5, color: t.textMuted, lineHeight: 1.5 }}>
          Full name of the {relLabel.toLowerCase()} you&apos;re adding.
        </p>
      </div>

      <div>
        <input
          ref={nameRef}
          value={fullName}
          onChange={e => { setFullName(e.target.value); setNameError('') }}
          onKeyDown={e => { if (e.key === 'Enter') onContinue() }}
          placeholder="e.g. Ramesh Khandelwal"
          autoComplete="name"
          style={{
            ...styles.inputStyle,
            borderColor: nameError ? COLORS.error : undefined,
          }}
          onFocus={e  => { e.currentTarget.style.borderColor = COLORS.saffron; e.currentTarget.style.boxShadow = '0 0 0 3px rgb(var(--c-primary-rgb) / 0.10)' }}
          onBlur={e   => { if (!nameError) { e.currentTarget.style.borderColor = isDark ? 'rgb(var(--c-primary-rgb) / 0.35)' : 'rgb(var(--c-primary-rgb) / 0.28)'; e.currentTarget.style.boxShadow = 'none' }}}
        />
        <AnimatePresence>
          {nameError && (
            <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ margin: '5px 0 0', fontSize: 11.5, color: COLORS.error }}>
              {nameError}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <motion.button onClick={onContinue} whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.98 }} style={styles.btnPrimary}>
        Continue →
      </motion.button>
    </motion.div>
  )
}
