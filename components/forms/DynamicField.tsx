'use client'

// ─────────────────────────────────────────────────────────────────────────────
// Generic field renderer for the config-driven person form.
//
// Knows how to draw each FieldDef.type (text / select+Other / date / gender) in
// the saffron auth-form style. It holds no field-specific logic — everything it
// renders comes from lib/forms/personFields.ts — so the same component backs the
// signup details step and the profile editor.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getTheme } from '@/lib/theme'
import { OTHER, OTHER_KEY_SUFFIX, type FieldDef, type FormLang } from '@/lib/forms/personFields'

interface CommonProps {
  values:   Record<string, string>
  errors:   Record<string, string>
  isDark:   boolean
  lang:     FormLang
  /** Update one entry in the values map. */
  onChange: (id: string, value: string) => void
  /** Enter key on a text input — submit the form. */
  onSubmit?: () => void
}

interface FieldProps extends CommonProps {
  field: FieldDef
}

function DynamicField({ field, values, errors, isDark, lang, onChange, onSubmit }: FieldProps) {
  const t = getTheme(isDark)
  const [focused,      setFocused]      = useState(false)
  const [otherFocused, setOtherFocused] = useState(false)

  const value      = values[field.id] ?? ''
  const otherKey   = field.id + OTHER_KEY_SUFFIX
  const otherValue = values[otherKey] ?? ''
  const err        = errors[field.id]

  const inputBg      = isDark ? '#141210' : '#FDFAF6'
  const inputBgFocus = isDark ? '#1C1A12' : '#FFFFFF'
  const inputBorder  = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.12)'

  const baseStyle = (foc: boolean): React.CSSProperties => ({
    width: '100%', height: 50, padding: '0 16px', fontSize: 15, fontFamily: 'inherit',
    border: `1.5px solid ${err ? '#EF4444' : foc ? 'var(--c-primary)' : inputBorder}`,
    borderRadius: 12, background: foc ? inputBgFocus : inputBg, color: t.text, outline: 'none',
    boxSizing: 'border-box',
    boxShadow: foc ? '0 0 0 3.5px rgb(var(--c-primary-rgb) / 0.11)' : isDark ? '0 1px 2px rgba(0,0,0,0.30)' : '0 1px 2px rgba(0,0,0,0.04)',
    transition: 'border-color 0.15s, box-shadow 0.15s, background 0.35s ease',
  })

  let control: React.ReactNode

  if (field.type === 'select') {
    control = (
      <>
        <select
          value={value}
          onChange={e => onChange(field.id, e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{ ...baseStyle(focused), padding: '0 12px', cursor: 'pointer', color: value ? t.text : t.textMuted }}
        >
          <option value="">{field.placeholder?.[lang] ?? ''}</option>
          {field.options?.map(o => <option key={o} value={o}>{o}</option>)}
          {field.allowOther && <option value={OTHER}>{lang === 'hi' ? 'अन्य' : 'Other'}</option>}
        </select>
        {field.allowOther && value === OTHER && (
          <input
            value={otherValue}
            autoFocus
            onChange={e => onChange(otherKey, e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') onSubmit?.() }}
            onFocus={() => setOtherFocused(true)}
            onBlur={() => setOtherFocused(false)}
            placeholder={lang === 'hi' ? 'यहाँ लिखें' : 'Type here'}
            style={{ ...baseStyle(otherFocused), marginTop: 8 }}
          />
        )}
      </>
    )
  } else if (field.type === 'date') {
    control = (
      <input
        type="date"
        value={value}
        min="1900-01-01"
        max={new Date().toISOString().slice(0, 10)}
        onChange={e => onChange(field.id, e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{ ...baseStyle(focused), colorScheme: isDark ? 'dark' : 'light' }}
      />
    )
  } else if (field.type === 'gender') {
    const opts = [
      ['male',   lang === 'hi' ? 'पुरुष' : 'Male'],
      ['female', lang === 'hi' ? 'महिला' : 'Female'],
      ['other',  lang === 'hi' ? 'अन्य'  : 'Other'],
    ] as const
    control = (
      <div style={{ display: 'flex', gap: 8 }}>
        {opts.map(([val, lbl]) => {
          const active = value === val
          return (
            <button
              key={val}
              type="button"
              onClick={() => onChange(field.id, active ? '' : val)}
              style={{
                flex: 1, height: 44, borderRadius: 10,
                border: `1.5px solid ${active ? 'var(--c-primary)' : inputBorder}`,
                background: active ? 'rgb(var(--c-primary-rgb) / 0.10)' : inputBg,
                color: active ? 'var(--c-primary)' : t.text,
                fontSize: 13.5, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer',
                boxShadow: active ? '0 0 0 3.5px rgb(var(--c-primary-rgb) / 0.11)' : 'none',
                transition: 'border-color 0.15s, background 0.15s, color 0.15s, box-shadow 0.15s',
              }}
            >
              {lbl}
            </button>
          )
        })}
      </div>
    )
  } else {
    control = (
      <input
        type="text"
        value={value}
        onChange={e => onChange(field.id, e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') onSubmit?.() }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={field.placeholder?.[lang]}
        autoComplete={field.autoComplete}
        style={baseStyle(focused)}
      />
    )
  }

  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', marginBottom: 7, fontSize: 13, fontWeight: 600, color: t.textMuted, transition: 'color 0.35s ease' }}>
        {field.label[lang]}{field.required && <span style={{ color: 'var(--c-primary)' }}> *</span>}
      </label>
      {control}
      <AnimatePresence>
        {err && (
          <motion.p
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ margin: '5px 0 0', fontSize: 11.5, color: '#EF4444' }}
          >
            {err}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}

interface FieldsProps extends CommonProps {
  fields: FieldDef[]
}

/** Render a list of fields, pairing consecutive half-width fields onto one row. */
export function DynamicFields({ fields, ...rest }: FieldsProps) {
  const rows: FieldDef[][] = []
  for (const f of fields) {
    const prev = rows[rows.length - 1]
    if (f.half && prev && prev.length === 1 && prev[0].half) prev.push(f)
    else rows.push([f])
  }

  return (
    <>
      {rows.map((row, i) =>
        row.length === 2 ? (
          <div key={i} style={{ display: 'flex', gap: 8 }}>
            {row.map(f => (
              <div key={f.id} style={{ flex: 1, minWidth: 0 }}>
                <DynamicField field={f} {...rest} />
              </div>
            ))}
          </div>
        ) : (
          <DynamicField key={row[0].id} field={row[0]} {...rest} />
        ),
      )}
    </>
  )
}

export default DynamicField
