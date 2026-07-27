'use client'

// CreateHomePanel — the terminal step of the "Make a home" selection flow.
// Takes the hand-picked people and a location (city for now) and creates a home.
// A home = who physically lives together, independent of lineage.

import { useState } from 'react'
import { motion } from 'framer-motion'
import { IconX, IconLoader2, IconHome, IconPencil } from '@tabler/icons-react'
import { getTheme } from '@/lib/theme'
import { type FieldConfig, enumOptions } from '@/lib/community/fieldConfig'

interface CreateHomePanelProps {
  people:   { id: string; name: string }[]
  /** Prefill for the home name — the eldest member (the home head). Editable. */
  defaultName?: string
  /** Community field rules — the city list comes from the admin `current_city`
   *  field, exactly like the node editor's Current Location. */
  fieldConfig?: FieldConfig | null
  isDark:   boolean
  applying: boolean
  error:    string
  onCreate: (input: { name: string; city: string }) => void
  /** Switch this selection to the bulk "Edit details" flow instead. */
  onEditInstead?: () => void
  onClose:  () => void
}

export default function CreateHomePanel({ people, defaultName = '', fieldConfig, isDark, applying, error, onCreate, onEditInstead, onClose }: CreateHomePanelProps) {
  const t = getTheme(isDark)
  const [name, setName] = useState(defaultName)
  const [city, setCity] = useState('')
  // Admin-defined city dropdown (same source as the edit panel), else free text.
  const cityOpts = enumOptions(fieldConfig, 'current_city')

  const n = people.length
  const canCreate = city.trim().length > 0 && n > 0

  const cardBg = isDark ? '#141210' : '#fff'
  const border = `1px solid ${t.borderNeutral}`
  const label: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 700, color: t.textMuted, marginBottom: 6, letterSpacing: '0.02em' }
  const field: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 10,
    border, background: isDark ? 'rgba(255,255,255,0.03)' : '#fff', color: t.text,
    fontFamily: 'inherit', fontSize: 14, outline: 'none',
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 4000, background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
    >
      <motion.div
        onClick={e => e.stopPropagation()}
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
        style={{
          width: 'min(440px, 100%)', maxHeight: '90vh', overflowY: 'auto',
          background: cardBg, border, borderRadius: 16, boxShadow: t.shadow, padding: 20,
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <span style={{ color: 'var(--c-primary)', display: 'flex' }}><IconHome size={20} /></span>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: t.text }}>Make a home</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textMuted, display: 'flex', padding: 2 }}>
            <IconX size={18} />
          </button>
        </div>
        <p style={{ margin: '0 0 14px', fontSize: 12.5, color: t.textMuted, lineHeight: 1.5 }}>
          Group the {n} selected {n === 1 ? 'person' : 'people'} into one home — who lives together, regardless of family tree. The eldest becomes the home head.
        </p>

        {/* Selected people chips */}
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16,
          maxHeight: 96, overflowY: 'auto',
          padding: 10, borderRadius: 10, background: isDark ? 'rgba(255,255,255,0.03)' : '#F8F5F0', border,
        }}>
          {people.map(p => (
            <span key={p.id} style={{
              fontSize: 11.5, fontWeight: 600, color: t.text,
              background: isDark ? 'rgb(var(--c-primary-rgb) / 0.15)' : 'rgb(var(--c-primary-rgb) / 0.10)',
              border: `1px solid ${isDark ? 'rgb(var(--c-primary-rgb) / 0.3)' : 'rgb(var(--c-primary-rgb) / 0.35)'}`,
              borderRadius: 999, padding: '3px 9px', whiteSpace: 'nowrap',
            }}>
              {p.name}
            </span>
          ))}
        </div>

        {/* Home name — defaults to the eldest (the home head) */}
        <div style={{ marginBottom: 14 }}>
          <label style={label}>Home name</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder={defaultName || "e.g. Ramesh's house"} style={field} />
          <p style={{ margin: '5px 0 0', fontSize: 11, color: t.textMuted }}>Defaults to the eldest member — edit if you like.</p>
        </div>

        {/* City (required) — dropdown from admin fields when configured, else text */}
        <div style={{ marginBottom: 18 }}>
          <label style={label}>City</label>
          {cityOpts ? (
            <select value={city} onChange={e => setCity(e.target.value)} style={{ ...field, cursor: 'pointer' }}>
              <option value="">Select a city</option>
              {cityOpts.map(o => (
                <option key={o.value} value={o.value}>{o.label ? `${o.value} (${o.label})` : o.value}</option>
              ))}
            </select>
          ) : (
            <input value={city} onChange={e => setCity(e.target.value)} placeholder="City / town where they live" style={field} />
          )}
        </div>

        {error && (
          <p style={{ margin: '0 0 12px', padding: '9px 11px', borderRadius: 9, fontSize: 12.5, fontWeight: 600, color: '#EF4444', background: isDark ? 'rgba(239,68,68,0.12)' : '#FEF2F2' }}>
            {error}
          </p>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onClose}
            style={{ flex: 1, height: 44, borderRadius: 11, border, background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 600, color: t.textMuted }}
          >
            Cancel
          </button>
          <button
            onClick={() => onCreate({ name: name.trim(), city: city.trim() })}
            disabled={!canCreate || applying}
            style={{
              flex: 2, height: 44, borderRadius: 11, border: 'none',
              cursor: (!canCreate || applying) ? 'default' : 'pointer',
              opacity: (!canCreate || applying) ? 0.55 : 1,
              background: 'var(--c-primary)', color: '#fff',
              fontFamily: 'inherit', fontSize: 13.5, fontWeight: 700,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            }}
          >
            {applying && <IconLoader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />}
            {applying ? 'Creating…' : `Create home · ${n}`}
          </button>
        </div>

        {/* Secondary path — keep the bulk edit reachable from the same selection. */}
        {onEditInstead && (
          <button
            onClick={onEditInstead}
            disabled={applying}
            style={{
              width: '100%', marginTop: 10, height: 38, borderRadius: 10, border: 'none', background: 'transparent',
              cursor: applying ? 'default' : 'pointer', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, color: t.textMuted,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            <IconPencil size={14} /> Edit these people’s details instead
          </button>
        )}
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </motion.div>
    </div>
  )
}
