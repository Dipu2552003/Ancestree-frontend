'use client'

// Shared form API for the NodePanel sections.
//
// Every form section (Identity, Birth & Death, Contact, …) needs the same set
// of closures — `field()` to render a labelled input, `row()` to lay two side
// by side, plus the underlying draft state, focus tracking, error state, and
// inline styles. We build a single `FormApi` object in the orchestrator and
// pass it down as one prop instead of drilling 8+.

import { Fragment } from 'react'
import { getTheme, type Theme } from '@/lib/theme'
import type { Draft } from './draft'

export interface FieldOpts {
  type?: string
  half?: boolean
  inputMode?: 'numeric' | 'tel' | 'email' | 'decimal' | 'text'
}

export interface FormApi {
  draft:        Draft
  setDraft:     React.Dispatch<React.SetStateAction<Draft>>
  set:          (key: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  focused:      string | null
  setFocused:   (k: string | null) => void
  nameError:    string
  setNameError: (e: string) => void
  isDark:       boolean
  t:            Theme
  labelStyle:   React.CSSProperties
  inputStyle:   (key: string) => React.CSSProperties
  field:        (label: string, key: keyof Draft, placeholder: string, opts?: FieldOpts) => React.ReactNode
  row:          (...children: React.ReactNode[]) => React.ReactNode
}

interface BuildFormApiArgs {
  draft:        Draft
  setDraft:     React.Dispatch<React.SetStateAction<Draft>>
  focused:      string | null
  setFocused:   (k: string | null) => void
  nameError:    string
  setNameError: (e: string) => void
  isDark:       boolean
}

export function buildFormApi({
  draft, setDraft, focused, setFocused, nameError, setNameError, isDark,
}: BuildFormApiArgs): FormApi {
  const t        = getTheme(isDark)
  const labelCol = isDark ? '#7A6A52' : 'var(--c-primary-deep)'

  const set = (key: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setDraft(p => ({ ...p, [key]: e.target.value }))

  const inputStyle = (key: string): React.CSSProperties => ({
    width: '100%', height: '36px',
    border: `1.5px solid ${nameError && key === 'firstName' ? '#EF4444' : focused === key ? 'var(--c-primary-light)' : t.border}`,
    borderRadius: '8px', padding: '0 10px', fontSize: '13px',
    color: t.text, background: t.inputBg, outline: 'none',
    fontFamily: 'inherit', boxSizing: 'border-box',
    transition: 'border-color 0.15s ease',
  })

  const labelStyle: React.CSSProperties = {
    fontSize: '10px', textTransform: 'uppercase',
    letterSpacing: '0.08em', color: labelCol,
    marginBottom: '5px', display: 'block',
  }

  const field = (label: string, key: keyof Draft, placeholder: string, opts?: FieldOpts) => (
    <div style={opts?.half ? { flex: 1, minWidth: 0 } : {}}>
      <label style={labelStyle}>{label}</label>
      <input
        type={opts?.type ?? 'text'}
        inputMode={opts?.inputMode}
        value={draft[key] as string}
        onChange={set(key)}
        onFocus={() => setFocused(key)} onBlur={() => setFocused(null)}
        placeholder={placeholder}
        style={inputStyle(key)}
      />
    </div>
  )

  const row = (...children: React.ReactNode[]) => (
    <div style={{ display: 'flex', gap: '10px' }}>
      {children.map((child, i) => <Fragment key={i}>{child}</Fragment>)}
    </div>
  )

  return {
    draft, setDraft, set,
    focused, setFocused,
    nameError, setNameError,
    isDark, t,
    labelStyle, inputStyle,
    field, row,
  }
}
