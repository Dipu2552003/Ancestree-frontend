'use client'

// Birthdate step. Year is the primary field (for most family records it's the
// only thing known — the copy says "a year is fine"); month is a plain dropdown
// of names (no guessing numbers) and day is an optional number. Nothing is
// hidden or overlaid, so what you enter is always what you see.

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { COLORS, type Theme } from '@/lib/theme'
import { MONTH_NAMES } from '../config'
import { slide } from '../helpers'
import type { WizardStyles } from '../styles'

interface StepBirthdateProps {
  dir:                  number
  isDark:               boolean
  t:                    Theme
  styles:               WizardStyles
  birthDay:             string
  birthMonth:           string
  birthYear:            string
  dateError:            string
  dateFieldFocused:     boolean
  datePreview:          string | null
  ageHint:              string | null
  dayRef:               React.RefObject<HTMLInputElement | null>
  monthRef:             React.RefObject<HTMLInputElement | null>
  yearRef:              React.RefObject<HTMLInputElement | null>
  setBirthDay:          (v: string) => void
  setBirthMonth:        (v: string) => void
  setBirthYear:         (v: string) => void
  setDateError:         (v: string) => void
  setDateFieldFocused:  (v: boolean) => void
  onContinue:           () => void
  onSkip:               () => void
}

export default function StepBirthdate({
  dir, isDark, t, styles,
  birthDay, birthMonth, birthYear, dateError, datePreview, ageHint,
  dayRef, yearRef,
  setBirthDay, setBirthMonth, setBirthYear, setDateError, setDateFieldFocused,
  onContinue, onSkip,
}: StepBirthdateProps) {
  const [focused, setFocused] = useState<'year' | 'month' | 'day' | null>(null)

  const border = (on: boolean) =>
    `1.5px solid ${
      dateError ? COLORS.error
      : on      ? COLORS.saffron
      : isDark  ? 'rgb(var(--c-primary-rgb) / 0.35)'
      :           'rgb(var(--c-primary-rgb) / 0.28)'
    }`

  const ring = (on: boolean) =>
    on && !dateError ? '0 0 0 3px rgb(var(--c-primary-rgb) / 0.10)' : 'none'

  const labelStyle: React.CSSProperties = {
    display: 'block', marginBottom: 6,
    fontSize: 10.5, fontWeight: 700, letterSpacing: '0.07em',
    textTransform: 'uppercase', color: t.textMuted,
  }

  const onFocus = (f: 'year' | 'month' | 'day') => { setFocused(f); setDateFieldFocused(true) }
  const onBlur  = () => { setFocused(null); setDateFieldFocused(false) }

  return (
    <motion.div key="birthdate" custom={dir} variants={slide} initial="enter" animate="center" exit="exit"
      transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
      style={{ padding: '24px 28px 26px', display: 'flex', flexDirection: 'column', gap: 18 }}>

      <div>
        <h2 style={{ margin: 0, fontSize: 19, fontWeight: 700, color: t.text, letterSpacing: '-0.01em', lineHeight: 1.2 }}>
          When were they born?
        </h2>
        <p style={{ margin: '5px 0 0', fontSize: 12.5, color: t.textMuted }}>
          Only the year is needed — add the month and day if you know them.
        </p>
      </div>

      {/* ── Year — the primary field ── */}
      <div>
        <label style={labelStyle}>Year of birth</label>
        <input
          ref={yearRef}
          value={birthYear}
          onChange={e => { setBirthYear(e.target.value.replace(/\D/g, '').slice(0, 4)); setDateError('') }}
          onKeyDown={e => { if (e.key === 'Enter') onContinue() }}
          onFocus={() => onFocus('year')}
          onBlur={onBlur}
          placeholder="e.g. 1985"
          inputMode="numeric"
          style={{
            ...styles.inputStyle, height: 52,
            fontSize: 18, fontWeight: 700, letterSpacing: '0.04em',
            border: border(focused === 'year'), boxShadow: ring(focused === 'year'),
          }}
        />
      </div>

      {/* ── Month + Day — optional refinements ── */}
      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ flex: '1.5 1 0' }}>
          <label style={labelStyle}>Month <span style={{ fontWeight: 500, textTransform: 'none', letterSpacing: 0, opacity: 0.7 }}>· optional</span></label>
          <select
            value={birthMonth}
            onChange={e => { setBirthMonth(e.target.value); setDateError('') }}
            onFocus={() => onFocus('month')}
            onBlur={onBlur}
            style={{
              ...styles.inputStyle, cursor: 'pointer', appearance: 'none',
              paddingRight: 34,
              color: birthMonth ? t.text : (isDark ? 'rgba(237,232,227,0.45)' : 'rgba(26,10,0,0.42)'),
              border: border(focused === 'month'), boxShadow: ring(focused === 'month'),
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23${isDark ? '9A8A72' : '9A6C3C'}' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 12px center',
            }}
          >
            <option value="">Unknown</option>
            {MONTH_NAMES.map((m, i) => (
              <option key={m} value={String(i + 1)}>{m}</option>
            ))}
          </select>
        </div>

        <div style={{ flex: '1 1 0' }}>
          <label style={labelStyle}>Day <span style={{ fontWeight: 500, textTransform: 'none', letterSpacing: 0, opacity: 0.7 }}>· optional</span></label>
          <input
            ref={dayRef}
            value={birthDay}
            onChange={e => { setBirthDay(e.target.value.replace(/\D/g, '').slice(0, 2)); setDateError('') }}
            onKeyDown={e => { if (e.key === 'Enter') onContinue() }}
            onFocus={() => onFocus('day')}
            onBlur={onBlur}
            placeholder="DD"
            inputMode="numeric"
            style={{
              ...styles.inputStyle, textAlign: 'center', letterSpacing: '0.04em',
              border: border(focused === 'day'), boxShadow: ring(focused === 'day'),
            }}
          />
        </div>
      </div>

      {/* Hint / error / preview row */}
      <div style={{ minHeight: 18, marginTop: -6 }}>
        <AnimatePresence mode="wait">
          {dateError ? (
            <motion.p key="err"
              initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ margin: 0, fontSize: 12, color: COLORS.error, textAlign: 'center' }}>
              {dateError}
            </motion.p>
          ) : datePreview && !ageHint ? (
            <motion.p key="preview"
              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ margin: 0, fontSize: 12.5, color: t.textMuted, textAlign: 'center', fontWeight: 500 }}>
              {datePreview}
            </motion.p>
          ) : ageHint ? (
            <motion.p key="hint"
              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ margin: 0, fontSize: 12.5, color: COLORS.marigold, fontWeight: 600, textAlign: 'center' }}>
              {datePreview ? `${datePreview}  ·  ${ageHint}` : ageHint}
            </motion.p>
          ) : null}
        </AnimatePresence>
      </div>

      <motion.button onClick={onContinue} whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.98 }} style={styles.btnPrimary}>
        Continue →
      </motion.button>

      <button
        onClick={onSkip}
        style={styles.btnSkip}
        onMouseEnter={e => (e.currentTarget.style.color = t.text)}
        onMouseLeave={e => (e.currentTarget.style.color = t.textMuted)}>
        Skip — not sure
      </button>
    </motion.div>
  )
}
