'use client'

// Phase 3 — pick the biological mother of each existing child.
//
// Options per child: wife 1, the new wife (created in Phase 2), the current
// "other parent" if neither of the above (edge case), and Unknown. The parent
// dispatches the reparent API call only for children whose chosen mother
// differs from their current one — see SecondSpouseWizard.handleReparent.

import { motion } from 'framer-motion'
import { IconLoader2, IconCheck, IconUser } from '@tabler/icons-react'
import { COLORS, getTheme } from '@/lib/theme'
import type { ExistingChild, ExistingSpouse } from './types'
import { wizardStyles } from './styles'

interface ReparentPhaseProps {
  anchorName:       string
  existingChildren: ExistingChild[]
  wife1:            ExistingSpouse | undefined
  createdSpouseId:  string | null
  createdSpouseName: string
  motherChoices:    Record<string, string | 'unknown'>
  setMotherChoices: (updater: (prev: Record<string, string | 'unknown'>) => Record<string, string | 'unknown'>) => void
  saving:           boolean
  error:            string
  isDark:           boolean
  onConfirm:        () => void
  onSkip:           () => void
}

export default function ReparentPhase({
  anchorName, existingChildren, wife1, createdSpouseId, createdSpouseName,
  motherChoices, setMotherChoices, saving, error, isDark, onConfirm, onSkip,
}: ReparentPhaseProps) {
  const t = getTheme(isDark)
  const { btnPrimary, btnGhost } = wizardStyles(isDark, saving)

  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}
      transition={{ duration: 0.22 }}
      style={{ padding: '22px 24px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}
    >
      <p style={{ margin: 0, fontSize: 13, color: t.text, lineHeight: 1.55 }}>
        <span style={{ color: COLORS.saffron, fontWeight: 700 }}>{anchorName}</span>{' '}
        has <strong>{existingChildren.length}</strong> {existingChildren.length === 1 ? 'child' : 'children'}.
        Who is the biological mother of each?
      </p>

      {existingChildren.map(child => {
        const chosen = motherChoices[child.personId]
        const options: { id: string | 'unknown'; label: string }[] = []
        if (wife1) options.push({ id: wife1.personId, label: `${wife1.fullName} (first wife)` })
        if (createdSpouseId && createdSpouseName.trim()) {
          options.push({ id: createdSpouseId, label: `${createdSpouseName.trim()} (new wife)` })
        }
        if (child.currentMotherId && child.currentMotherId !== wife1?.personId && child.currentMotherId !== createdSpouseId) {
          options.push({ id: child.currentMotherId, label: `${child.currentMotherName ?? 'Current'} (current)` })
        }
        options.push({ id: 'unknown', label: 'Unknown' })

        return (
          <div key={child.personId} style={{
            padding: 12, borderRadius: 13,
            background: isDark ? 'rgba(255,255,255,0.02)' : '#FFFAF5',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgb(var(--c-primary-rgb) / 0.10)'}`,
            display: 'flex', flexDirection: 'column', gap: 10,
          }}>
            {/* Child header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
                background: 'linear-gradient(135deg, var(--c-primary), var(--c-primary-strong))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: 14, fontWeight: 600 }}>
                {child.photoUrl
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={child.photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <IconUser size={18} />
                }
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: t.text }}>{child.fullName}</div>
            </div>

            {/* Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {options.map(opt => {
                const active = chosen === opt.id
                return (
                  <button key={String(opt.id)}
                    onClick={() => setMotherChoices(prev => ({ ...prev, [child.personId]: opt.id }))}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 9,
                      padding: '9px 11px', borderRadius: 9, cursor: 'pointer',
                      fontFamily: 'inherit', textAlign: 'left',
                      border: `1.5px solid ${active ? COLORS.saffron : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)'}`,
                      background: active ? (isDark ? 'rgb(var(--c-primary-rgb) / 0.10)' : 'rgb(var(--c-primary-rgb) / 0.06)') : 'transparent',
                      color: active ? COLORS.saffron : t.text,
                      fontSize: 12.5, fontWeight: 600,
                    }}>
                    <span style={{ width: 13, height: 13, borderRadius: '50%', border: `2px solid ${active ? COLORS.saffron : t.textMuted}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {active && <span style={{ width: 5, height: 5, borderRadius: '50%', background: COLORS.saffron }} />}
                    </span>
                    <span>{opt.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}

      {error && <p style={{ margin: 0, fontSize: 12, color: COLORS.error }}>{error}</p>}

      <motion.button onClick={onConfirm} disabled={saving}
        whileHover={!saving ? { scale: 1.015 } : {}}
        whileTap={!saving ? { scale: 0.98 } : {}}
        style={btnPrimary}>
        {saving && <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}><IconLoader2 size={15} /></motion.div>}
        <IconCheck size={15} strokeWidth={2.5} />
        {saving ? 'Saving…' : 'Confirm and finish'}
      </motion.button>

      <button onClick={onSkip} style={btnGhost}>
        Skip — I'll do this later
      </button>
    </motion.div>
  )
}
