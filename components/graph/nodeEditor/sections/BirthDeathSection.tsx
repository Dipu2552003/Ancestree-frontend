'use client'

// Birth & Death block — date / year / place inputs, plus a deceased toggle that
// reveals the death-side fields. Birth/death date inputs auto-fill the year as
// the user types a YYYY-prefix.

import { motion, AnimatePresence } from 'framer-motion'
import { SectionHeader } from '../'
import type { FormApi } from '../formApi'

interface BirthDeathSectionProps {
  form: FormApi
}

export default function BirthDeathSection({ form }: BirthDeathSectionProps) {
  const { draft, setDraft, setFocused, isDark, labelStyle, inputStyle, field, row } = form

  const handleBirthDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    const yr = parseInt(val.slice(0, 4))
    const autoYear = val.length >= 4 && !isNaN(yr) && yr >= 1800 && yr <= 2099 ? String(yr) : undefined
    setDraft(p => ({ ...p, birthDate: val, ...(autoYear !== undefined ? { birthYear: autoYear } : {}) }))
  }

  const handleDeathDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    const yr = parseInt(val.slice(0, 4))
    const autoYear = val.length >= 4 && !isNaN(yr) && yr >= 1800 && yr <= 2099 ? String(yr) : undefined
    setDraft(p => ({ ...p, deathDate: val, ...(autoYear !== undefined ? { deathYear: autoYear } : {}) }))
  }

  return (
    <>
      <SectionHeader title="Birth & Death" isDark={isDark} />
      <div style={{ padding: '12px 16px 4px', display: 'flex', flexDirection: 'column', gap: '10px' }}>

        {row(
          <div style={{ flex: 1, minWidth: 0 }}>
            <label style={labelStyle}>Birth date</label>
            <input
              type="text"
              value={draft.birthDate}
              onChange={handleBirthDateChange}
              onFocus={() => setFocused('birthDate')} onBlur={() => setFocused(null)}
              placeholder="YYYY-MM-DD"
              style={inputStyle('birthDate')}
            />
          </div>,
          field('Birth year', 'birthYear', 'YYYY', { type: 'number', half: true }),
        )}
        {field('Birth place', 'birthPlace', 'City or village')}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* span is non-interactive; the button below has aria-label for AT */}
          <span style={labelStyle}>Deceased</span>
          <button
            type="button"
            role="switch"
            aria-checked={draft.isDeceased}
            aria-label="Deceased"
            onClick={() => setDraft(p => ({ ...p, isDeceased: !p.isDeceased, deathDate: '', deathYear: '', deathPlace: '' }))}
            style={{
              width: '36px', height: '20px', borderRadius: '10px',
              background: draft.isDeceased ? '#EA580C' : (isDark ? '#2A2520' : '#E5E7EB'),
              position: 'relative', cursor: 'pointer', transition: 'background 0.2s ease',
              flexShrink: 0, border: 'none', padding: 0,
            }}
          >
            <div style={{
              position: 'absolute', top: '2px', left: draft.isDeceased ? '18px' : '2px',
              width: '16px', height: '16px', borderRadius: '50%', background: 'white',
              transition: 'left 0.2s ease', boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
            }} />
          </button>
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
                    type="text"
                    value={draft.deathDate}
                    onChange={handleDeathDateChange}
                    onFocus={() => setFocused('deathDate')} onBlur={() => setFocused(null)}
                    placeholder="YYYY-MM-DD"
                    style={inputStyle('deathDate')}
                  />
                </div>,
                field('Death year', 'deathYear', 'YYYY', { type: 'number', half: true }),
              )}
              {field('Death place', 'deathPlace', 'City or village')}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  )
}
