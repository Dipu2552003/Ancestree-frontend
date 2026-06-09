'use client'

// Spouse-only — marriage status + optional year(s). Status determines whether
// the second "year ended / year of passing" input is shown.

import { motion } from 'framer-motion'
import { IconLoader2, IconCheck } from '@tabler/icons-react'
import { COLORS, type Theme } from '@/lib/theme'
import { slide } from '../helpers'
import type { MarriageStatus } from '../types'
import type { WizardStyles } from '../styles'

const STATUS_OPTIONS: [MarriageStatus, string][] = [
  ['married',   'Married'],
  ['divorced',  'Divorced'],
  ['widowed',   'Widowed'],
  ['separated', 'Separated'],
  ['unknown',   "I don't know"],
]
const STATUS_ENDED = new Set<MarriageStatus>(['divorced', 'widowed', 'separated'])

interface StepMarriageProps {
  dir:                 number
  isDark:              boolean
  t:                   Theme
  styles:              WizardStyles
  marriageStatus:      MarriageStatus
  unionYear:           string
  separationYear:      string
  marriageError:       string
  saving:              boolean
  saved:               boolean
  setMarriageStatus:   (v: MarriageStatus) => void
  setUnionYear:        (v: string) => void
  setSeparationYear:   (v: string) => void
  setMarriageError:    (v: string) => void
  onCreate:            () => void
}

export default function StepMarriage({
  dir, isDark, t, styles,
  marriageStatus, unionYear, separationYear, marriageError,
  saving, saved,
  setMarriageStatus, setUnionYear, setSeparationYear, setMarriageError,
  onCreate,
}: StepMarriageProps) {
  return (
    <motion.div key="marriage" custom={dir} variants={slide} initial="enter" animate="center" exit="exit"
      transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
      style={{ padding: '24px 28px 26px', display: 'flex', flexDirection: 'column', gap: 16 }}>

      <div>
        <h2 style={{ margin: 0, fontSize: 19, fontWeight: 700, color: t.text, letterSpacing: '-0.01em', lineHeight: 1.2 }}>
          The marriage
        </h2>
        <p style={{ margin: '5px 0 0', fontSize: 12.5, color: t.textMuted }}>
          Year and status. Everything&apos;s optional.
        </p>
      </div>

      {/* Status grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {STATUS_OPTIONS.map(([val, label]) => {
          const active = marriageStatus === val
          return (
            <motion.button key={val} type="button"
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={() => { setMarriageStatus(val); setMarriageError('') }}
              style={{
                padding: '11px 12px', borderRadius: 11, cursor: 'pointer', fontFamily: 'inherit',
                border: `1.5px solid ${active ? COLORS.saffron : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.09)'}`,
                background: active ? (isDark ? 'rgba(234,88,12,0.12)' : 'rgba(234,88,12,0.07)') : isDark ? 'rgba(255,255,255,0.02)' : '#FFFAF5',
                color: active ? COLORS.saffron : t.text,
                fontSize: 13, fontWeight: 600, letterSpacing: 0,
                textAlign: 'left',
              }}>
              {label}
            </motion.button>
          )
        })}
      </div>

      {/* Year(s) */}
      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', marginBottom: 6, fontSize: 11.5, fontWeight: 600, color: t.textMuted, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            Year of marriage
          </label>
          <input
            value={unionYear}
            onChange={e => { setUnionYear(e.target.value.replace(/\D/g, '').slice(0, 4)); setMarriageError('') }}
            placeholder="e.g. 1985"
            inputMode="numeric"
            style={styles.inputStyle}
          />
        </div>
        {STATUS_ENDED.has(marriageStatus) && (
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 11.5, fontWeight: 600, color: t.textMuted, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              {marriageStatus === 'widowed' ? 'Year of passing' : 'Year it ended'}
            </label>
            <input
              value={separationYear}
              onChange={e => { setSeparationYear(e.target.value.replace(/\D/g, '').slice(0, 4)); setMarriageError('') }}
              placeholder="e.g. 2010"
              inputMode="numeric"
              style={styles.inputStyle}
            />
          </div>
        )}
      </div>

      {marriageError && (
        <p style={{ margin: 0, fontSize: 12, color: COLORS.error, textAlign: 'center' }}>{marriageError}</p>
      )}

      <motion.button onClick={onCreate} disabled={saving || saved}
        whileHover={!saving && !saved ? { scale: 1.015 } : {}}
        whileTap={!saving && !saved ? { scale: 0.98 } : {}}
        style={styles.btnPrimary}>
        {saving && <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}><IconLoader2 size={15} /></motion.div>}
        {saved  && <IconCheck size={15} strokeWidth={2.5} />}
        {saving ? 'Adding…' : saved ? 'Added!' : '✓ Add to family tree'}
      </motion.button>

      <button onClick={() => !saving && !saved && onCreate()} style={styles.btnSkip}
        onMouseEnter={e => (e.currentTarget.style.color = t.text)}
        onMouseLeave={e => (e.currentTarget.style.color = t.textMuted)}>
        Skip — I&apos;ll add details later
      </button>
    </motion.div>
  )
}
