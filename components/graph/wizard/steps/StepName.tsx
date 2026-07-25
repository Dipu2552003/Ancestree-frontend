'use client'

// Step 1 for every relation — collect the new person's first + last name.

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
  firstName:        string
  lastName:         string
  nameError:        string
  nameRef:          React.RefObject<HTMLInputElement | null>
  setFirstName:     (v: string) => void
  setLastName:      (v: string) => void
  setNameError:     (v: string) => void
  onContinue:       () => void
}

export default function StepName({
  dir, isDark, t, styles, relLabel,
  firstName, lastName, nameError, nameRef,
  setFirstName, setLastName, setNameError, onContinue,
}: StepNameProps) {
  const focusRing = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = COLORS.saffron
    e.currentTarget.style.boxShadow = '0 0 0 3px rgb(var(--c-primary-rgb) / 0.10)'
  }
  const blurRing = (e: React.FocusEvent<HTMLInputElement>) => {
    if (nameError) return
    e.currentTarget.style.borderColor = isDark ? 'rgb(var(--c-primary-rgb) / 0.35)' : 'rgb(var(--c-primary-rgb) / 0.28)'
    e.currentTarget.style.boxShadow = 'none'
  }

  return (
    <motion.div key="name" custom={dir} variants={slide} initial="enter" animate="center" exit="exit"
      transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
      style={{ padding: '24px 28px 26px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 19, fontWeight: 700, color: t.text, letterSpacing: '-0.01em', lineHeight: 1.2 }}>
          What is their name?
        </h2>
        <p style={{ margin: '5px 0 0', fontSize: 12.5, color: t.textMuted, lineHeight: 1.5 }}>
          Name of the {relLabel.toLowerCase()} you&apos;re adding.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <label style={{ display: 'block', marginBottom: 5, fontSize: 11.5, fontWeight: 600, color: t.textMuted }}>First name</label>
          <input
            ref={nameRef}
            value={firstName}
            onChange={e => { setFirstName(e.target.value); setNameError('') }}
            onKeyDown={e => { if (e.key === 'Enter') onContinue() }}
            placeholder="e.g. Ramesh"
            autoComplete="given-name"
            style={{ ...styles.inputStyle, borderColor: nameError ? COLORS.error : undefined }}
            onFocus={focusRing} onBlur={blurRing}
          />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <label style={{ display: 'block', marginBottom: 5, fontSize: 11.5, fontWeight: 600, color: t.textMuted }}>Last name</label>
          <input
            value={lastName}
            onChange={e => { setLastName(e.target.value); setNameError('') }}
            onKeyDown={e => { if (e.key === 'Enter') onContinue() }}
            placeholder="e.g. Khandelwal"
            autoComplete="family-name"
            style={styles.inputStyle}
            onFocus={focusRing} onBlur={blurRing}
          />
        </div>
      </div>

      <AnimatePresence>
        {nameError && (
          <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ margin: '-6px 0 0', fontSize: 11.5, color: COLORS.error }}>
            {nameError}
          </motion.p>
        )}
      </AnimatePresence>

      <motion.button onClick={onContinue} whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.98 }} style={styles.btnPrimary}>
        Continue →
      </motion.button>
    </motion.div>
  )
}
