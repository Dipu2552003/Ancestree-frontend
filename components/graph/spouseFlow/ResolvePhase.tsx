'use client'

// Phase 1 — resolve the existing marriage.
//
// Two questions:
//   1. Which marriage is the active one now? (existing vs new)
//   2. What status should the *inactive* spouse get? (widowed / divorced /
//      separated / unknown), with an optional year.
//
// Phase 1 does NOT touch the API itself — the parent calls
// api.relationships.update on the existing wife when activeChoice === 'new'.

import { motion } from 'framer-motion'
import { IconLoader2 } from '@tabler/icons-react'
import { COLORS, getTheme } from '@/lib/theme'
import { EXIT_OPTIONS, type ActiveChoice, type ExitStatus, type ExistingSpouse } from './types'
import { wizardStyles } from './styles'

interface ResolvePhaseProps {
  anchorName:      string
  wife1:           ExistingSpouse | undefined
  activeChoice:    ActiveChoice
  setActiveChoice: (c: ActiveChoice) => void
  exitStatus:      ExitStatus
  setExitStatus:   (s: ExitStatus) => void
  exitYear:        string
  setExitYear:     (y: string) => void
  saving:          boolean
  error:           string
  isDark:          boolean
  onContinue:      () => void
}

export default function ResolvePhase({
  anchorName, wife1, activeChoice, setActiveChoice,
  exitStatus, setExitStatus, exitYear, setExitYear,
  saving, error, isDark, onContinue,
}: ResolvePhaseProps) {
  const t = getTheme(isDark)
  const { inputStyle, btnPrimary } = wizardStyles(isDark, saving)
  const optMeta = EXIT_OPTIONS.find(o => o.value === exitStatus)
  const inactiveName = activeChoice === 'new'
    ? (wife1?.fullName ?? 'the first wife')
    : 'the new spouse'

  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}
      transition={{ duration: 0.22 }}
      style={{ padding: '22px 24px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}
    >
      <div>
        <p style={{ margin: 0, fontSize: 14, color: t.text, lineHeight: 1.55 }}>
          <span style={{ color: COLORS.saffron, fontWeight: 700 }}>{anchorName}</span>{' '}
          is currently married to{' '}
          <span style={{ fontWeight: 700, color: t.text }}>{wife1?.fullName ?? 'someone'}</span>.
          Only one marriage can be active at a time — which one is it now?
        </p>
      </div>

      {/* Active-marriage picker */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {([
          { value: 'existing' as const, label: `${wife1?.fullName ?? 'The first wife'} is still the active marriage` },
          { value: 'new'      as const, label: 'The new spouse will become the active marriage' },
        ]).map(opt => {
          const active = activeChoice === opt.value
          return (
            <button key={opt.value}
              onClick={() => setActiveChoice(opt.value)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '12px 13px', borderRadius: 11, cursor: 'pointer',
                fontFamily: 'inherit', textAlign: 'left',
                border: `1.5px solid ${active ? COLORS.saffron : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.09)'}`,
                background: active ? (isDark ? 'rgba(234,88,12,0.12)' : 'rgba(234,88,12,0.07)') : isDark ? 'rgba(255,255,255,0.02)' : '#FFFAF5',
                color: active ? COLORS.saffron : t.text,
                fontSize: 13, fontWeight: 600,
              }}>
              <span style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${active ? COLORS.saffron : t.textMuted}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {active && <span style={{ width: 7, height: 7, borderRadius: '50%', background: COLORS.saffron }} />}
              </span>
              <span>{opt.label}</span>
            </button>
          )
        })}
      </div>

      {/* Exit status for the *inactive* spouse */}
      <div style={{
        display: 'flex', flexDirection: 'column', gap: 10,
        padding: 14, borderRadius: 13,
        background: isDark ? 'rgba(255,255,255,0.02)' : '#FFFAF5',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(234,88,12,0.10)'}`,
      }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: t.text, letterSpacing: '0.02em' }}>
          What happened with {inactiveName}?
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {EXIT_OPTIONS.map(opt => {
            const active = exitStatus === opt.value
            return (
              <button key={opt.value}
                onClick={() => setExitStatus(opt.value)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 9,
                  padding: '10px 12px', borderRadius: 9, cursor: 'pointer',
                  fontFamily: 'inherit', textAlign: 'left',
                  border: `1.5px solid ${active ? COLORS.saffron : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)'}`,
                  background: active ? (isDark ? 'rgba(234,88,12,0.10)' : 'rgba(234,88,12,0.06)') : 'transparent',
                  color: active ? COLORS.saffron : t.text,
                  fontSize: 12.5, fontWeight: 600,
                }}>
                <span style={{ width: 13, height: 13, borderRadius: '50%', border: `2px solid ${active ? COLORS.saffron : t.textMuted}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {active && <span style={{ width: 5, height: 5, borderRadius: '50%', background: COLORS.saffron }} />}
                </span>
                <span>{opt.label(inactiveName)}</span>
              </button>
            )
          })}
        </div>
        {optMeta?.askYear && (
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 11.5, fontWeight: 600, color: t.textMuted, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              {optMeta.askYear}
            </label>
            <input
              value={exitYear}
              onChange={e => setExitYear(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="YYYY"
              inputMode="numeric"
              style={inputStyle}
            />
          </div>
        )}
      </div>

      {error && <p style={{ margin: 0, fontSize: 12, color: COLORS.error }}>{error}</p>}

      <motion.button onClick={onContinue} disabled={saving}
        whileHover={!saving ? { scale: 1.015 } : {}}
        whileTap={!saving ? { scale: 0.98 } : {}}
        style={btnPrimary}>
        {saving && <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}><IconLoader2 size={15} /></motion.div>}
        {saving ? 'Saving…' : 'Continue →'}
      </motion.button>
    </motion.div>
  )
}
