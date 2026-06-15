'use client'

// Segmented day / month / year input. The visible month value flips between
// the digit input and a short label ("OCT") once a valid month is entered.

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
  birthDay, birthMonth, birthYear, dateError, dateFieldFocused, datePreview, ageHint,
  dayRef, monthRef, yearRef,
  setBirthDay, setBirthMonth, setBirthYear, setDateError, setDateFieldFocused,
  onContinue, onSkip,
}: StepBirthdateProps) {
  return (
    <motion.div key="birthdate" custom={dir} variants={slide} initial="enter" animate="center" exit="exit"
      transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
      style={{ padding: '24px 28px 26px', display: 'flex', flexDirection: 'column', gap: 18 }}>

      <div>
        <h2 style={{ margin: 0, fontSize: 19, fontWeight: 700, color: t.text, letterSpacing: '-0.01em', lineHeight: 1.2 }}>
          When were they born?
        </h2>
        <p style={{ margin: '5px 0 0', fontSize: 12.5, color: t.textMuted }}>
          Day and month are optional — a year is fine.
        </p>
      </div>

      {/* ── Segmented date input ── */}
      <div style={{
        display: 'flex', alignItems: 'stretch',
        borderRadius: 13,
        border: `1.5px solid ${
          dateError       ? COLORS.error
          : dateFieldFocused ? COLORS.saffron
          : isDark        ? 'rgb(var(--c-primary-rgb) / 0.35)'
          : 'rgb(var(--c-primary-rgb) / 0.28)'
        }`,
        boxShadow: dateFieldFocused && !dateError ? '0 0 0 3px rgb(var(--c-primary-rgb) / 0.10)' : 'none',
        background: isDark ? 'rgba(255,255,255,0.05)' : '#fff',
        overflow: 'hidden',
        transition: 'border-color 0.15s, box-shadow 0.15s',
      }}>

        {/* Day */}
        <div style={{
          flex: '0 0 72px', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '14px 0 10px',
          borderRight: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}`,
        }}>
          <input
            ref={dayRef}
            value={birthDay}
            onChange={e => {
              const v = e.target.value.replace(/\D/g, '').slice(0, 2)
              setBirthDay(v)
              setDateError('')
              if (v.length === 2) monthRef.current?.focus()
            }}
            onKeyDown={e => {
              if (e.key === 'Enter') onContinue()
            }}
            onFocus={() => setDateFieldFocused(true)}
            onBlur={() => setDateFieldFocused(false)}
            placeholder="DD"
            inputMode="numeric"
            style={{
              width: 44, textAlign: 'center',
              fontSize: 24, fontWeight: 700, letterSpacing: '0.04em',
              background: 'transparent', border: 'none', outline: 'none',
              color: birthDay ? t.text : isDark ? 'rgba(237,232,227,0.20)' : 'rgba(26,10,0,0.20)',
              fontFamily: 'inherit', lineHeight: 1,
            }}
          />
          <span style={{
            marginTop: 5, fontSize: 9, fontWeight: 600,
            letterSpacing: '0.09em', textTransform: 'uppercase',
            color: t.textMuted,
          }}>Day</span>
        </div>

        {/* Month */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '14px 0 10px',
          borderRight: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}`,
          position: 'relative',
        }}>
          <AnimatePresence mode="wait">
            {birthMonth ? (
              <motion.span
                key="month-name"
                initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                style={{
                  fontSize: 13, fontWeight: 700, color: COLORS.saffron,
                  letterSpacing: '0.02em', lineHeight: 1,
                  position: 'absolute', top: '50%', transform: 'translateY(-65%)',
                }}
              >
                {(() => {
                  const m = parseInt(birthMonth)
                  return (!isNaN(m) && m >= 1 && m <= 12) ? MONTH_NAMES[m - 1].slice(0, 3).toUpperCase() : birthMonth
                })()}
              </motion.span>
            ) : null}
          </AnimatePresence>
          <input
            ref={monthRef}
            value={birthMonth}
            onChange={e => {
              const v = e.target.value.replace(/\D/g, '').slice(0, 2)
              setBirthMonth(v)
              setDateError('')
              const n = parseInt(v)
              if (v.length === 2 || (v.length === 1 && n >= 2)) yearRef.current?.focus()
            }}
            onKeyDown={e => {
              if (e.key === 'Backspace' && birthMonth === '') dayRef.current?.focus()
              if (e.key === 'Enter') onContinue()
            }}
            onFocus={() => setDateFieldFocused(true)}
            onBlur={() => setDateFieldFocused(false)}
            placeholder="MM"
            inputMode="numeric"
            style={{
              width: 44, textAlign: 'center',
              fontSize: 24, fontWeight: 700, letterSpacing: '0.04em',
              background: 'transparent', border: 'none', outline: 'none',
              // hide numeric value when showing month name above
              color: birthMonth ? 'transparent' : isDark ? 'rgba(237,232,227,0.20)' : 'rgba(26,10,0,0.20)',
              fontFamily: 'inherit', lineHeight: 1,
            }}
          />
          <span style={{
            marginTop: 5, fontSize: 9, fontWeight: 600,
            letterSpacing: '0.09em', textTransform: 'uppercase',
            color: t.textMuted,
          }}>Month</span>
        </div>

        {/* Year */}
        <div style={{
          flex: '0 0 96px', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '14px 0 10px',
        }}>
          <input
            ref={yearRef}
            value={birthYear}
            onChange={e => {
              setBirthYear(e.target.value.replace(/\D/g, '').slice(0, 4))
              setDateError('')
            }}
            onKeyDown={e => {
              if (e.key === 'Backspace' && birthYear === '') monthRef.current?.focus()
              if (e.key === 'Enter') onContinue()
            }}
            onFocus={() => setDateFieldFocused(true)}
            onBlur={() => setDateFieldFocused(false)}
            placeholder="YYYY"
            inputMode="numeric"
            style={{
              width: 64, textAlign: 'center',
              fontSize: 24, fontWeight: 700, letterSpacing: '0.04em',
              background: 'transparent', border: 'none', outline: 'none',
              color: birthYear ? t.text : isDark ? 'rgba(237,232,227,0.20)' : 'rgba(26,10,0,0.20)',
              fontFamily: 'inherit', lineHeight: 1,
            }}
          />
          <span style={{
            marginTop: 5, fontSize: 9, fontWeight: 600,
            letterSpacing: '0.09em', textTransform: 'uppercase',
            color: t.textMuted,
          }}>Year</span>
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
