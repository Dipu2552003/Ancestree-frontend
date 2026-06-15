'use client'

// Birth & Death block — native date pickers (the year is derived from the
// date, never asked) plus an Alive / Deceased selector that reveals the
// death-side fields.

import { motion, AnimatePresence } from 'framer-motion'
import { SectionHeader } from '../'
import type { FormApi } from '../formApi'

interface BirthDeathSectionProps {
  form: FormApi
}

const LIFE_STATES = [
  { value: false, label: 'Alive' },
  { value: true,  label: 'Deceased' },
] as const

export default function BirthDeathSection({ form }: BirthDeathSectionProps) {
  const { draft, setDraft, setFocused, isDark, t, labelStyle, inputStyle, field, row } = form

  return (
    <>
      <SectionHeader title="Birth & Death" isDark={isDark} />
      <div style={{ padding: '12px 16px 4px', display: 'flex', flexDirection: 'column', gap: '10px' }}>

        {row(
          <div style={{ flex: 1, minWidth: 0 }}>
            <label style={labelStyle}>Birth date</label>
            <input
              type="date"
              value={draft.birthDate}
              onChange={e => setDraft(p => ({ ...p, birthDate: e.target.value }))}
              onFocus={() => setFocused('birthDate')} onBlur={() => setFocused(null)}
              max={new Date().toISOString().slice(0, 10)}
              style={inputStyle('birthDate')}
            />
          </div>,
          field('Birth place', 'birthPlace', 'City or village', { half: true }),
        )}

        <div>
          <label style={labelStyle}>Status</label>
          <div style={{ display: 'flex', gap: '6px' }}>
            {LIFE_STATES.map(s => (
              <button
                key={s.label}
                type="button"
                onClick={() => setDraft(p => ({
                  ...p, isDeceased: s.value,
                  ...(s.value ? {} : { deathDate: '', deathYear: '', deathPlace: '' }),
                }))}
                style={{
                  height: '30px', padding: '0 14px', borderRadius: '6px', border: 'none',
                  fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit',
                  background: draft.isDeceased === s.value
                    ? 'var(--c-primary)'
                    : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'),
                  color: draft.isDeceased === s.value ? '#fff' : t.text,
                  transition: 'background 0.15s, color 0.15s',
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <AnimatePresence>
          {draft.isDeceased && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '10px' }}
            >
              {row(
                <div style={{ flex: 1, minWidth: 0 }}>
                  <label style={labelStyle}>Death date</label>
                  <input
                    type="date"
                    value={draft.deathDate}
                    onChange={e => setDraft(p => ({ ...p, deathDate: e.target.value }))}
                    onFocus={() => setFocused('deathDate')} onBlur={() => setFocused(null)}
                    min={draft.birthDate || undefined}
                    max={new Date().toISOString().slice(0, 10)}
                    style={inputStyle('deathDate')}
                  />
                </div>,
                field('Death place', 'deathPlace', 'City or village', { half: true }),
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  )
}
