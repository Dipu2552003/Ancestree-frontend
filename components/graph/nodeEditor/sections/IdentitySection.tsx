'use client'

// Identity block — full name + split-name fields, nickname, gender pills, gotra
// / religion. Always rendered (not collapsible). The parent owns nameInputRef
// so the orchestrator can focus it after a wizard-skipped name flow.

import { motion, AnimatePresence } from 'framer-motion'
import { SectionHeader } from '../'
import { GENDERS } from '../helpers'
import type { FormApi } from '../formApi'

interface IdentitySectionProps {
  form:         FormApi
  nameInputRef: React.RefObject<HTMLInputElement | null>
}

export default function IdentitySection({ form, nameInputRef }: IdentitySectionProps) {
  const { draft, setDraft, setFocused, nameError, setNameError, isDark, t, labelStyle, inputStyle, field, row } = form

  return (
    <>
      <SectionHeader title="Identity" isDark={isDark} />
      <div style={{ padding: '12px 16px 4px', display: 'flex', flexDirection: 'column', gap: '10px' }}>

        <div>
          <label style={labelStyle}>Full name *</label>
          <input
            ref={nameInputRef}
            value={draft.fullName}
            onChange={e => { setDraft(p => ({ ...p, fullName: e.target.value })); setNameError('') }}
            onFocus={() => setFocused('fullName')} onBlur={() => setFocused(null)}
            placeholder="Enter full name"
            style={inputStyle('fullName')}
          />
          <AnimatePresence>
            {nameError && (
              <motion.span initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={{ fontSize: '11px', color: '#EF4444', marginTop: '4px', display: 'block' }}>
                {nameError}
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {row(
          field('First name', 'firstName', 'First', { half: true }),
          field('Middle name', 'middleName', 'Middle', { half: true }),
        )}
        {row(
          field('Last name', 'lastName', 'Last', { half: true }),
          field('Native name', 'nameNative', 'नाम', { half: true }),
        )}
        {field('Nickname / Known as', 'nickname', 'e.g. Bablu, Pinky')}

        <div>
          <label style={labelStyle}>Gender</label>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {GENDERS.map(g => (
              <button
                key={g.value}
                onClick={() => setDraft(p => ({ ...p, gender: p.gender === g.value ? '' : g.value }))}
                style={{
                  height: '30px', padding: '0 12px', borderRadius: '6px', border: 'none',
                  fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit',
                  background: draft.gender === g.value
                    ? '#EA580C'
                    : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'),
                  color: draft.gender === g.value ? '#fff' : t.text,
                  transition: 'background 0.15s, color 0.15s',
                }}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>

        {row(
          field('Gotra', 'gotra', 'e.g. Kashyap', { half: true }),
          field('Religion', 'religion', 'e.g. Hindu', { half: true }),
        )}
      </div>
    </>
  )
}
