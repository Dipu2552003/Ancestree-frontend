'use client'

// Adopted-only — optional biological parent names. Stored on the child's record,
// not rendered in the visible tree.

import { motion, AnimatePresence } from 'framer-motion'
import { IconLoader2, IconCheck } from '@tabler/icons-react'
import { COLORS, type Theme } from '@/lib/theme'
import { firstName, slide } from '../helpers'
import type { WizardStyles } from '../styles'

interface StepBioParentsProps {
  dir:               number
  isDark:            boolean
  t:                 Theme
  styles:            WizardStyles
  fullName:          string
  addBioParents:     boolean
  bioMotherName:     string
  bioFatherName:     string
  saving:            boolean
  saved:             boolean
  setAddBioParents:  (v: boolean) => void
  setBioMotherName:  (v: string) => void
  setBioFatherName:  (v: string) => void
  onCreate:          () => void
}

export default function StepBioParents({
  dir, isDark, t, styles,
  fullName, addBioParents, bioMotherName, bioFatherName,
  saving, saved,
  setAddBioParents, setBioMotherName, setBioFatherName, onCreate,
}: StepBioParentsProps) {
  return (
    <motion.div key="bio-parents" custom={dir} variants={slide} initial="enter" animate="center" exit="exit"
      transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
      style={{ padding: '24px 28px 26px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 19, fontWeight: 700, color: t.text, letterSpacing: '-0.01em', lineHeight: 1.2 }}>
          Add biological parents?
        </h2>
        <p style={{ margin: '5px 0 0', fontSize: 12.5, color: t.textMuted }}>
          Stored on {firstName(fullName) || 'the child'}&apos;s record. Won&apos;t appear in the visible tree — only the adoptive parents will.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {([
          [true,  'Yes, I know them'],
          [false, 'Skip for now'],
        ] as const).map(([val, label]) => {
          const active = addBioParents === val
          return (
            <button key={String(val)}
              onClick={() => setAddBioParents(val)}
              style={{
                padding: '13px 12px', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit',
                border: `1.5px solid ${active ? COLORS.saffron : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.09)'}`,
                background: active ? (isDark ? 'rgba(234,88,12,0.12)' : 'rgba(234,88,12,0.07)') : isDark ? 'rgba(255,255,255,0.02)' : '#FFFAF5',
                color: active ? COLORS.saffron : t.text,
                fontSize: 13, fontWeight: 600,
              }}>
              {label}
            </button>
          )
        })}
      </div>

      <AnimatePresence>
        {addBioParents && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22 }}
            style={{ display: 'flex', flexDirection: 'column', gap: 10, overflow: 'hidden' }}
          >
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 11.5, fontWeight: 600, color: t.textMuted, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                Biological mother
              </label>
              <input
                value={bioMotherName}
                onChange={e => setBioMotherName(e.target.value)}
                placeholder="Name (optional)"
                style={styles.inputStyle}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 11.5, fontWeight: 600, color: t.textMuted, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                Biological father
              </label>
              <input
                value={bioFatherName}
                onChange={e => setBioFatherName(e.target.value)}
                placeholder="Name (optional)"
                style={styles.inputStyle}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button onClick={onCreate} disabled={saving || saved}
        whileHover={!saving && !saved ? { scale: 1.015 } : {}}
        whileTap={!saving && !saved ? { scale: 0.98 } : {}}
        style={styles.btnPrimary}>
        {saving && <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}><IconLoader2 size={15} /></motion.div>}
        {saved  && <IconCheck size={15} strokeWidth={2.5} />}
        {saving ? 'Adding…' : saved ? 'Added!' : '✓ Add to family tree'}
      </motion.button>
    </motion.div>
  )
}
