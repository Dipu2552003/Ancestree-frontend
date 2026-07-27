'use client'

// Admin → Fields. Lets a community owner/admin decide which member fields show
// in the node editor and how: a Dropdown (with an editable value list), a Fixed
// value (auto-filled on new nodes), plain Text, or hidden. Saving writes the
// field rulebook (settings.fields) and, for each dropdown, its option list.
//
// Scope: the fields the editor currently honors end-to-end (Phase A) —
// last name, gotra, village, religion. As more of the editor is wired to the
// config, add their keys to CATALOG.

import { useEffect, useState } from 'react'
import { IconLoader2, IconPlus, IconTrash, IconCheck } from '@tabler/icons-react'
import { api } from '@/lib/api'
import { getTheme } from '@/lib/theme'
import type { FieldConfig, FieldRule, FieldOption } from '@/lib/community/fieldConfig'

type FieldType = 'text' | 'enum' | 'constant'

// The universal person fields the editor honors, grouped like the editor's
// sections. `canEnum` = supports a dropdown value list (gotra, village). Every
// field can be shown/hidden or set to a fixed value. First name is intentionally
// omitted (a person always needs a name). Cascading location parts (city/state
// via the place search) aren't individually toggleable yet.
const GROUPS: { group: string; fields: { key: string; label: string; canEnum?: boolean }[] }[] = [
  { group: 'Identity', fields: [
    { key: 'last_name',   label: 'Last name' },
    { key: 'middle_name', label: 'Middle name' },
    { key: 'nickname',    label: 'Nickname' },
    { key: 'gender',      label: 'Gender' },
    { key: 'gotra',       label: 'Gotra', canEnum: true },
    { key: 'religion',    label: 'Religion' },
  ] },
  { group: 'Contact', fields: [
    { key: 'phone',    label: 'Phone' },
    { key: 'whatsapp', label: 'WhatsApp' },
    { key: 'email',    label: 'Email' },
  ] },
  { group: 'Current location', fields: [
    { key: 'current_address',  label: 'Address' },
    { key: 'current_city',     label: 'City / Town' },
    { key: 'current_district', label: 'District' },
    { key: 'current_state',    label: 'State' },
    { key: 'current_country',  label: 'Country' },
  ] },
  { group: 'Native village', fields: [
    { key: 'native_village',  label: 'Village', canEnum: true },
    { key: 'native_district', label: 'District' },
    { key: 'native_state',    label: 'State' },
    { key: 'native_country',  label: 'Country' },
  ] },
  { group: 'About', fields: [
    { key: 'bio', label: 'Bio' },
  ] },
  { group: 'Birth & death', fields: [
    { key: 'birth_place', label: 'Birth place' },
    { key: 'death_place', label: 'Death place' },
  ] },
  { group: 'Work & education', fields: [
    { key: 'occupation',        label: 'Occupation' },
    { key: 'occupation_detail', label: 'Occupation detail' },
    { key: 'education',         label: 'Education' },
  ] },
]
const ALL_FIELDS = GROUPS.flatMap(g => g.fields)

interface Props { slug: string; isDark: boolean }

export default function FieldsSection({ slug, isDark }: Props) {
  const t = getTheme(isDark)
  const [loading, setLoading] = useState(true)
  const [fields,  setFields]  = useState<Record<string, FieldRule>>({})
  const [opts,    setOpts]    = useState<Record<string, FieldOption[]>>({})
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [error,   setError]   = useState('')

  useEffect(() => {
    let active = true
    api.community.fieldConfig(slug)
      .then((cfg: FieldConfig) => {
        if (!active) return
        setFields(cfg.fields ?? {})
        setOpts(cfg.options ?? {})
      })
      .catch(() => { if (active) setError('Could not load the field config.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [slug])

  const ruleOf  = (key: string): FieldRule => fields[key] ?? { enabled: true, type: 'text' }
  const typeOf  = (key: string): FieldType => (ruleOf(key).type as FieldType) ?? 'text'
  const setRule = (key: string, patch: Partial<FieldRule>) =>
    setFields(f => ({ ...f, [key]: { ...ruleOf(key), ...patch } }))

  const setOptRow = (key: string, i: number, patch: Partial<FieldOption>) =>
    setOpts(o => {
      const list = [...(o[key] ?? [])]
      list[i] = { ...list[i], ...patch }
      return { ...o, [key]: list }
    })
  const addOpt = (key: string) =>
    setOpts(o => ({ ...o, [key]: [...(o[key] ?? []), { value: '', label: '' }] }))
  const removeOpt = (key: string, i: number) =>
    setOpts(o => ({ ...o, [key]: (o[key] ?? []).filter((_, j) => j !== i) }))

  const save = async () => {
    setSaving(true); setError(''); setSaved(false)
    try {
      await api.community.updateFieldConfig(slug, fields)
      for (const { key } of ALL_FIELDS) {
        if (typeOf(key) === 'enum') await api.community.setFieldOptions(slug, key, opts[key] ?? [])
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      setError((e as Error).message || 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
      <IconLoader2 size={20} style={{ color: t.textMuted, animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  const cardBg = isDark ? 'rgba(255,255,255,0.03)' : '#fff'
  const border = `1px solid ${t.borderNeutral}`
  const input  = (extra?: React.CSSProperties): React.CSSProperties => ({
    height: 34, padding: '0 10px', borderRadius: 8, border, background: t.inputBg,
    color: t.text, fontSize: 13, fontFamily: 'inherit', outline: 'none', ...extra,
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 640 }}>
      <p style={{ margin: 0, fontSize: 13, color: t.textMuted, lineHeight: 1.5 }}>
        Choose which details members fill in, and turn any into a dropdown with a fixed
        list of values (e.g. gotra, village) or a fixed value applied to every new member.
      </p>

      {GROUPS.map(({ group, fields }) => (
        <div key={group} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p style={{ margin: '8px 0 0', fontSize: 11, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: t.textMuted }}>
            {group}
          </p>
          {fields.map(({ key, label }) => {
            const rule = ruleOf(key)
            const type = typeOf(key)
            const enabled = rule.enabled !== false
            return (
              <div key={key} style={{ background: cardBg, border, borderRadius: 12, padding: 14, opacity: enabled ? 1 : 0.6 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: t.text }}>{label}</span>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: t.textMuted, cursor: 'pointer' }}>
                <input type="checkbox" checked={enabled} onChange={e => setRule(key, { enabled: e.target.checked })} />
                Show
              </label>
            </div>

            {enabled && (
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, color: t.textMuted }}>Type</span>
                  <select
                    value={type}
                    onChange={e => setRule(key, { type: e.target.value as FieldType, storage: 'column' })}
                    style={input({ cursor: 'pointer' })}
                  >
                    <option value="text">Free text</option>
                    <option value="enum">Dropdown</option>
                    <option value="constant">Fixed value</option>
                  </select>
                </div>

                {type === 'constant' && (
                  <input
                    value={rule.value ?? ''}
                    onChange={e => setRule(key, { value: e.target.value })}
                    placeholder={`Fixed ${label.toLowerCase()} for every member`}
                    style={input({ width: '100%' })}
                  />
                )}

                {type === 'enum' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {(opts[key] ?? []).map((o, i) => (
                      <div key={i} style={{ display: 'flex', gap: 6 }}>
                        <input
                          value={o.value}
                          onChange={e => setOptRow(key, i, { value: e.target.value })}
                          placeholder="English (required)"
                          style={input({ flex: 1, minWidth: 0 })}
                        />
                        <input
                          value={o.label ?? ''}
                          onChange={e => setOptRow(key, i, { label: e.target.value })}
                          placeholder="Hindi (optional)"
                          style={input({ flex: 1, minWidth: 0 })}
                        />
                        <button
                          onClick={() => removeOpt(key, i)}
                          title="Remove"
                          style={{ ...input({ width: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }), color: '#EF4444' }}
                        >
                          <IconTrash size={15} />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => addOpt(key)}
                      style={{
                        alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 6,
                        height: 32, padding: '0 12px', borderRadius: 8, border,
                        background: 'transparent', color: 'var(--c-primary)',
                        fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer',
                      }}
                    >
                      <IconPlus size={14} /> Add value
                    </button>
                  </div>
                )}
              </div>
            )}
              </div>
            )
          })}
        </div>
      ))}

      {error && <p style={{ margin: 0, fontSize: 12.5, color: '#EF4444' }}>{error}</p>}

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          onClick={save}
          disabled={saving}
          style={{
            display: 'flex', alignItems: 'center', gap: 7, height: 38, padding: '0 18px',
            borderRadius: 9, border: 'none', background: 'var(--c-primary)', color: '#fff',
            fontSize: 13, fontWeight: 700, fontFamily: 'inherit', cursor: saving ? 'default' : 'pointer',
            opacity: saving ? 0.8 : 1,
          }}
        >
          {saving ? <IconLoader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
            : saved ? <IconCheck size={15} /> : null}
          {saving ? 'Saving…' : saved ? 'Saved' : 'Save changes'}
        </button>
      </div>
    </div>
  )
}
