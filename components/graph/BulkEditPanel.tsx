'use client'

// BulkEditPanel — the final step of both admin bulk-edit flows:
//   • bloodline  — a paternal line auto-resolved from a node; edits gotra/village.
//   • selection  — a hand-picked set of people; also edits current location.
//
// Gotra is a dropdown (the family gotra list, + a free-type "Other"); village and
// current location are free text. Only fields the admin fills are applied — one
// undoable operation covers the whole set.

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { IconX, IconLoader2, IconBinaryTree2, IconChecklist } from '@tabler/icons-react'
import familyOptions from '@/lib/familyOptions.json'
import { getTheme } from '@/lib/theme'
import { type FieldConfig, enumOptions } from '@/lib/community/fieldConfig'

const GOTRAS: string[] = (familyOptions.gotras as { name: string }[]).map(g => g.name)
const OTHER = '__other__'

export interface BulkChanges {
  gotra?: string
  native_village?: string
  current_city?: string
}

interface BulkEditPanelProps {
  scope:    'bloodline' | 'selection'
  /** People in the selection — names shown as chips, count drives "Apply to all N". */
  people:   { id: string; name: string }[]
  isDark:   boolean
  applying: boolean
  error:    string
  /** Community field config — sources the gotra/village dropdown values from the DB. */
  fieldConfig?: FieldConfig | null
  onApply:  (changes: BulkChanges) => void
  onClose:  () => void
}

export default function BulkEditPanel({ scope, people, isDark, applying, error, fieldConfig, onApply, onClose }: BulkEditPanelProps) {
  const t = getTheme(isDark)
  // Prefer the community's DB lists; fall back to the built-in gotra list / free
  // text when there's no community config.
  const gotraOpts   = enumOptions(fieldConfig, 'gotra')
  const villageOpts = enumOptions(fieldConfig, 'native_village')
  const [gotraSel, setGotraSel] = useState('')      // '' = leave unchanged
  const [gotraOther, setGotraOther] = useState('')
  const [village, setVillage] = useState('')
  const [city, setCity] = useState('')

  const gotra = gotraSel === OTHER ? gotraOther.trim() : gotraSel
  const changes: BulkChanges = useMemo(() => {
    const c: BulkChanges = {}
    if (gotra.trim()) c.gotra = gotra.trim()
    if (village.trim()) c.native_village = village.trim()
    if (scope === 'selection' && city.trim()) c.current_city = city.trim()
    return c
  }, [gotra, village, city, scope])

  const hasChange = Object.keys(changes).length > 0
  const n = people.length

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
        position: 'fixed', inset: 0, zIndex: 4000,
        background: 'rgba(0,0,0,0.45)',
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
          background: cardBg, border, borderRadius: 16,
          boxShadow: t.shadow, padding: 20,
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <span style={{ color: '#10B981', display: 'flex' }}>
              {scope === 'bloodline' ? <IconBinaryTree2 size={20} /> : <IconChecklist size={20} />}
            </span>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: t.text }}>
              {scope === 'bloodline' ? 'Edit bloodline' : 'Edit selected people'}
            </h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textMuted, display: 'flex', padding: 2 }}>
            <IconX size={18} />
          </button>
        </div>
        <p style={{ margin: '0 0 14px', fontSize: 12.5, color: t.textMuted, lineHeight: 1.5 }}>
          {scope === 'bloodline'
            ? `Set gotra and/or village for this whole paternal line — ${n} ${n === 1 ? 'person' : 'people'}. It’s one change you can undo in a single step.`
            : `Set fields for the ${n} selected ${n === 1 ? 'person' : 'people'}. One undoable change.`}
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
              background: isDark ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.12)',
              border: `1px solid ${isDark ? 'rgba(16,185,129,0.3)' : 'rgba(16,185,129,0.35)'}`,
              borderRadius: 999, padding: '3px 9px', whiteSpace: 'nowrap',
            }}>
              {p.name}
            </span>
          ))}
        </div>

        {/* Gotra dropdown */}
        <div style={{ marginBottom: 14 }}>
          <label style={label}>Gotra</label>
          <select value={gotraSel} onChange={e => setGotraSel(e.target.value)} style={field}>
            <option value="">Leave unchanged</option>
            {gotraOpts
              ? gotraOpts.map(o => <option key={o.value} value={o.value}>{o.label ? `${o.value} (${o.label})` : o.value}</option>)
              : GOTRAS.map(g => <option key={g} value={g}>{g}</option>)}
            <option value={OTHER}>Other…</option>
          </select>
          {gotraSel === OTHER && (
            <input
              value={gotraOther} onChange={e => setGotraOther(e.target.value)}
              placeholder="Type gotra" style={{ ...field, marginTop: 8 }}
            />
          )}
        </div>

        {/* Village */}
        <div style={{ marginBottom: scope === 'selection' ? 14 : 18 }}>
          <label style={label}>Native village</label>
          {villageOpts ? (
            <select value={village} onChange={e => setVillage(e.target.value)} style={field}>
              <option value="">Leave unchanged</option>
              {villageOpts.map(o => <option key={o.value} value={o.value}>{o.label ? `${o.value} (${o.label})` : o.value}</option>)}
            </select>
          ) : (
            <input value={village} onChange={e => setVillage(e.target.value)} placeholder="Leave blank to keep as-is" style={field} />
          )}
        </div>

        {/* Current location (selection scope only) */}
        {scope === 'selection' && (
          <div style={{ marginBottom: 18 }}>
            <label style={label}>Current location</label>
            <input value={city} onChange={e => setCity(e.target.value)} placeholder="City / town — leave blank to keep" style={field} />
          </div>
        )}

        {error && (
          <p style={{ margin: '0 0 12px', fontSize: 12.5, color: '#EF4444' }}>{error}</p>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, height: 42, borderRadius: 11, border, background: 'transparent',
              cursor: 'pointer', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 600, color: t.textMuted,
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => onApply(changes)}
            disabled={!hasChange || applying}
            style={{
              flex: 2, height: 42, borderRadius: 11, border: 'none',
              cursor: (!hasChange || applying) ? 'default' : 'pointer',
              opacity: (!hasChange || applying) ? 0.55 : 1,
              background: '#10B981', color: '#fff',
              fontFamily: 'inherit', fontSize: 13.5, fontWeight: 700,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            }}
          >
            {applying && <IconLoader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />}
            {applying ? 'Applying…' : `Apply to all ${n}`}
          </button>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </motion.div>
    </div>
  )
}
