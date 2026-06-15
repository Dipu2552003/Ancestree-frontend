'use client'

// Identity block — split-name fields (full name is composed, never asked),
// nickname, gender pills, gotra / religion, and a derived marital-status chip.
// Always rendered (not collapsible). The parent owns nameInputRef so the
// orchestrator can focus the first-name field after a wizard-skipped name flow.

import { motion, AnimatePresence } from 'framer-motion'
import { SectionHeader } from '../'
import { GENDERS } from '../helpers'
import { composeFullName } from '../draft'
import type { FormApi } from '../formApi'
import familyOptions from '@/lib/familyOptions.json'

const GOTRAS = familyOptions.gotras.map(g => g.name)

interface IdentitySectionProps {
  form:         FormApi
  nameInputRef: React.RefObject<HTMLInputElement | null>
  /** Derived from connections: married when a spouse or child exists. */
  maritalStatus: 'single' | 'married'
}

export default function IdentitySection({ form, nameInputRef, maritalStatus }: IdentitySectionProps) {
  const { draft, setDraft, setFocused, nameError, setNameError, isDark, t, labelStyle, inputStyle, field, row } = form

  const fullName = composeFullName(draft)

  return (
    <>
      <SectionHeader title="Identity" isDark={isDark} />
      <div style={{ padding: '12px 16px 4px', display: 'flex', flexDirection: 'column', gap: '10px' }}>

        {row(
          <div style={{ flex: 1, minWidth: 0 }}>
            <label style={labelStyle}>First name *</label>
            <input
              ref={nameInputRef}
              value={draft.firstName}
              onChange={e => { setDraft(p => ({ ...p, firstName: e.target.value })); setNameError('') }}
              onFocus={() => setFocused('firstName')} onBlur={() => setFocused(null)}
              placeholder="First"
              style={inputStyle('firstName')}
            />
          </div>,
          field('Middle name', 'middleName', 'Middle', { half: true }),
        )}
        {field('Last name', 'lastName', 'Last')}

        {/* Composed full name — read-only preview of what will be saved */}
        {fullName && (
          <div style={{
            fontSize: '11.5px', color: isDark ? '#7A6A5A' : '#9A7B5A',
            marginTop: '-4px', fontStyle: 'italic',
          }}>
            Full name: <span style={{ color: t.text, fontWeight: 600, fontStyle: 'normal' }}>{fullName}</span>
          </div>
        )}

        <AnimatePresence>
          {nameError && (
            <motion.span initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ fontSize: '11px', color: '#EF4444', display: 'block' }}>
              {nameError}
            </motion.span>
          )}
        </AnimatePresence>

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
                    ? 'var(--c-primary)'
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

        {/* Marital status — derived, not editable: married when the person has
            a spouse connection or any child; single otherwise. */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={labelStyle}>Marital status</span>
          <span style={{
            fontSize: '11px', fontWeight: 600, letterSpacing: '0.04em',
            padding: '3px 10px', borderRadius: '999px',
            background: maritalStatus === 'married'
              ? (isDark ? '#14321A' : '#F0FDF4')
              : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'),
            color: maritalStatus === 'married'
              ? (isDark ? '#4ADE80' : '#15803D')
              : t.text,
            border: maritalStatus === 'married'
              ? `1px solid ${isDark ? '#166534' : '#BBF7D0'}`
              : '1px solid transparent',
          }}>
            {maritalStatus === 'married' ? 'Married' : 'Single'}
          </span>
        </div>

        {row(
          <div style={{ flex: 1, minWidth: 0 }}>
            <label style={labelStyle}>Gotra</label>
            <select
              value={draft.gotra}
              onChange={e => setDraft(p => ({ ...p, gotra: e.target.value }))}
              onFocus={() => setFocused('gotra')} onBlur={() => setFocused(null)}
              style={{ ...inputStyle('gotra'), padding: '0 6px', cursor: 'pointer' }}
            >
              <option value="">Select gotra</option>
              {/* Keep a value saved outside the standard list (signup "Other") selectable */}
              {draft.gotra && !GOTRAS.includes(draft.gotra) && (
                <option value={draft.gotra}>{draft.gotra}</option>
              )}
              {GOTRAS.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>,
          field('Religion', 'religion', 'e.g. Hindu', { half: true }),
        )}
      </div>
    </>
  )
}
