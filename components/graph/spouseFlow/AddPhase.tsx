'use client'

// Phase 2 — basic profile + marriage details for the new spouse.
//
// On submit, the parent creates the new Person and the SPOUSE_OF relationship.
// The sub_type of that relationship depends on Phase 1's activeChoice:
//   active = 'new'      → 'married'
//   active = 'existing' → use the chosen exit status

import { useRef } from 'react'
import { motion } from 'framer-motion'
import { IconLoader2, IconCamera } from '@tabler/icons-react'
import { COLORS, getTheme } from '@/lib/theme'
import { EXIT_OPTIONS, type ActiveChoice, type ExitStatus } from './types'
import { wizardStyles } from './styles'

type Gender = 'male' | 'female' | 'other' | ''

interface AddPhaseProps {
  isDark:           boolean
  saving:           boolean
  error:            string
  hasChildren:      boolean
  activeChoice:     ActiveChoice
  exitStatus:       ExitStatus
  /** When the spouse's gender is inferred from the anchor, hide the picker. */
  hideGender:       boolean
  // controlled fields
  newName:          string
  setNewName:       (s: string) => void
  newNameErr:       string
  setNewNameErr:    (s: string) => void
  newGender:        Gender
  setNewGender:     (g: Gender) => void
  newBirthYear:     string
  setNewBirthYear:  (s: string) => void
  newUnionYear:     string
  setNewUnionYear:  (s: string) => void
  exitYear:         string
  setExitYear:      (s: string) => void
  newPhotoUrl:      string | undefined
  newPhotoBusy:     boolean
  onPhotoFile:      (f: File) => void
  onSubmit:         () => void
}

export default function AddPhase({
  isDark, saving, error, hasChildren, activeChoice, exitStatus, hideGender,
  newName, setNewName, newNameErr, setNewNameErr,
  newGender, setNewGender, newBirthYear, setNewBirthYear,
  newUnionYear, setNewUnionYear, exitYear, setExitYear,
  newPhotoUrl, newPhotoBusy, onPhotoFile, onSubmit,
}: AddPhaseProps) {
  const t = getTheme(isDark)
  const { inputStyle, btnPrimary } = wizardStyles(isDark, saving)
  const fileRef = useRef<HTMLInputElement>(null)

  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}
      transition={{ duration: 0.22 }}
      style={{ padding: '22px 24px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}
    >
      <p style={{ margin: 0, fontSize: 13, color: t.textMuted, lineHeight: 1.5 }}>
        Their basics. You can fill in more from the node panel later.
      </p>

      {/* Photo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <button onClick={() => fileRef.current?.click()}
          style={{
            width: 64, height: 64, borderRadius: '50%',
            border: newPhotoUrl ? 'none' : `1.5px dashed ${COLORS.saffron}`,
            background: newPhotoUrl ? 'transparent' : (isDark ? 'rgb(var(--c-primary-rgb) / 0.08)' : 'rgb(var(--c-primary-rgb) / 0.06)'),
            cursor: newPhotoBusy ? 'default' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: 0, flexShrink: 0,
          }}>
          {newPhotoBusy ? (
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}>
              <IconLoader2 size={20} color={COLORS.saffron} />
            </motion.div>
          ) : newPhotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={newPhotoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <IconCamera size={22} color={COLORS.saffron} />
          )}
        </button>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) onPhotoFile(f); e.target.value = '' }} />
        <span style={{ fontSize: 12, color: t.textMuted }}>Optional photo</span>
      </div>

      {/* Name */}
      <div>
        <label style={{ display: 'block', marginBottom: 6, fontSize: 11.5, fontWeight: 600, color: t.textMuted, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          Full name
        </label>
        <input
          value={newName}
          onChange={e => { setNewName(e.target.value); setNewNameErr('') }}
          placeholder="e.g. Shilpa Khandelwal"
          style={{ ...inputStyle, borderColor: newNameErr ? COLORS.error : undefined }}
        />
        {newNameErr && <p style={{ margin: '4px 0 0', fontSize: 11.5, color: COLORS.error }}>{newNameErr}</p>}
      </div>

      {/* Gender + birth year row. Gender is hidden when inferred from the anchor. */}
      <div style={{ display: 'flex', gap: 10 }}>
        {!hideGender && (
        <div style={{ flex: 1.4 }}>
          <label style={{ display: 'block', marginBottom: 6, fontSize: 11.5, fontWeight: 600, color: t.textMuted, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            Gender
          </label>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['female', 'male', 'other'] as const).map(g => {
              const active = newGender === g
              const label  = g === 'female' ? 'Female' : g === 'male' ? 'Male' : 'Other'
              return (
                <button key={g} onClick={() => setNewGender(active ? '' : g)}
                  style={{
                    flex: 1, height: 44, borderRadius: 11, cursor: 'pointer', fontFamily: 'inherit',
                    border: `1.5px solid ${active ? COLORS.saffron : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.09)'}`,
                    background: active ? (isDark ? 'rgb(var(--c-primary-rgb) / 0.12)' : 'rgb(var(--c-primary-rgb) / 0.07)') : isDark ? 'rgba(255,255,255,0.02)' : '#FFFAF5',
                    color: active ? COLORS.saffron : t.text,
                    fontSize: 12.5, fontWeight: 600,
                  }}>
                  {label}
                </button>
              )
            })}
          </div>
        </div>
        )}
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', marginBottom: 6, fontSize: 11.5, fontWeight: 600, color: t.textMuted, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            Birth year
          </label>
          <input
            value={newBirthYear}
            onChange={e => setNewBirthYear(e.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder="YYYY"
            inputMode="numeric"
            style={inputStyle}
          />
        </div>
      </div>

      <div style={{ height: 1, background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)', margin: '4px 0' }} />

      {/* Status banner — already decided in Phase 1 */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '9px 12px', borderRadius: 10,
        background: isDark ? 'rgb(var(--c-primary-rgb) / 0.10)' : 'rgb(var(--c-primary-rgb) / 0.06)',
        border: `1px solid ${isDark ? 'rgb(var(--c-primary-rgb) / 0.22)' : 'rgb(var(--c-primary-rgb) / 0.18)'}`,
      }}>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: COLORS.saffron, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          {activeChoice === 'new'
            ? 'New active marriage'
            : activeChoice === 'both'
              ? 'Additional active marriage'
              : `Recorded as ${exitStatus}`}
        </span>
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', marginBottom: 6, fontSize: 11.5, fontWeight: 600, color: t.textMuted, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            Year of marriage
          </label>
          <input
            value={newUnionYear}
            onChange={e => setNewUnionYear(e.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder="YYYY"
            inputMode="numeric"
            style={inputStyle}
          />
        </div>
        {activeChoice === 'existing' && EXIT_OPTIONS.find(o => o.value === exitStatus)?.askYear && (
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 11.5, fontWeight: 600, color: t.textMuted, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              {EXIT_OPTIONS.find(o => o.value === exitStatus)?.askYear}
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

      <motion.button onClick={onSubmit} disabled={saving}
        whileHover={!saving ? { scale: 1.015 } : {}}
        whileTap={!saving ? { scale: 0.98 } : {}}
        style={btnPrimary}>
        {saving && <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}><IconLoader2 size={15} /></motion.div>}
        {saving ? 'Adding…' : hasChildren ? 'Continue →' : '✓ Add to family tree'}
      </motion.button>
    </motion.div>
  )
}
