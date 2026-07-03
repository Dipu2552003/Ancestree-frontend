'use client'

// ─────────────────────────────────────────────────────────────────────────────
// PlaceSearch — cascading location block: State → District → Location.
//
//   • State    — dropdown of Indian states (IN_STATES).
//   • District — dropdown driven by the chosen state (IN_DISTRICTS[state]).
//   • Location — a search box (India Post directory) scoped to the chosen
//                state + district, so picking Rajasthan → Sirohi lets you search
//                "Abu Road" / "Mungthala". Free typing is always allowed.
//
// Every dropdown has an "Other" option that reveals a text box. Changing the
// state clears the district + location; changing the district clears location.
//
// State-key agnostic: each part names the `key` it reads/writes via the given
// values map + onChange. The signup/invite forms pass DB column names; the node
// editor passes camelCase Draft keys. Two sizes: 'lg' (auth forms) / 'sm'.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react'
import { IconSearch, IconLoader2, IconMapPin } from '@tabler/icons-react'
import { getTheme } from '@/lib/theme'
import { OTHER, type FormLang } from '@/lib/forms/personFields'
import { IN_STATES, IN_DISTRICTS } from '@/lib/inRegions'

export type PlaceRole = 'village' | 'city' | 'tehsil' | 'district' | 'state' | 'pincode'

export interface PlaceFieldPart {
  role:     PlaceRole
  key:      string   // state key to read from `values` / write via `onChange`
  label:    string
  half?:    boolean
  default?: string   // pre-selected when the field is empty (e.g. 'Rajasthan')
}

const norm = (s: string) => s.trim().toLowerCase()

// ── India Post directory ─────────────────────────────────────────────────────
interface PostOffice { Name: string; District: string; State: string; Pincode: string }

async function searchIndiaPost(q: string, signal: AbortSignal): Promise<PostOffice[]> {
  const res = await fetch(`https://api.postalpincode.in/postoffice/${encodeURIComponent(q)}`, { signal })
  if (!res.ok) throw new Error('search failed')
  const data = await res.json()
  const list: PostOffice[] = data?.[0]?.Status === 'Success' ? (data[0].PostOffice ?? []) : []
  const seen = new Set<string>()
  const out: PostOffice[] = []
  for (const po of list) {
    const key = `${po.Name}|${po.District}|${po.State}`
    if (seen.has(key)) continue
    seen.add(key); out.push(po)
  }
  return out
}

// ── Location search box (one field) ──────────────────────────────────────────
interface LocationProps {
  value: string
  onChange: (v: string) => void
  state: string
  district: string
  style: (foc: boolean, err?: boolean) => React.CSSProperties
  isDark: boolean
  lang: FormLang
  sm: boolean
  err?: boolean
}

function LocationSearch({ value, onChange, state, district, style, isDark, lang, sm, err }: LocationProps) {
  const t = getTheme(isDark)
  const [results, setResults] = useState<PostOffice[]>([])
  const [open, setOpen]       = useState(false)
  const [loading, setLoading] = useState(false)
  const [foc, setFoc]         = useState(false)
  const picked = useRef(value)   // suppress re-search of a pre-filled / just-picked value
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const q = value.trim()
    if (q.length < 3 || q === picked.current) { setResults([]); setOpen(false); setLoading(false); return }
    const ctrl = new AbortController()
    setLoading(true)
    const id = setTimeout(async () => {
      try {
        let list = await searchIndiaPost(q, ctrl.signal)
        // Scope to the chosen state (+ district when it's a known one).
        if (state)    { const f = list.filter(p => norm(p.State) === norm(state));       if (f.length) list = f }
        if (district) { const f = list.filter(p => norm(p.District) === norm(district)); if (f.length) list = f }
        setResults(list.slice(0, 8))
        setOpen(true)
      } catch (e) {
        if ((e as Error).name !== 'AbortError') setOpen(false)
      } finally { setLoading(false) }
    }, 350)
    return () => { clearTimeout(id); ctrl.abort() }
  }, [value, state, district])

  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const inset = sm ? 10 : 14
  return (
    <div style={{ position: 'relative' }} ref={boxRef}>
      <IconSearch size={sm ? 14 : 16} style={{ position: 'absolute', left: inset, top: '50%', transform: 'translateY(-50%)', color: t.textMuted, pointerEvents: 'none' }} />
      <input
        value={value}
        onChange={e => { picked.current = ''; onChange(e.target.value) }}
        onFocus={() => { setFoc(true); if (results.length) setOpen(true) }}
        onBlur={() => setFoc(false)}
        placeholder={lang === 'hi' ? 'गाँव / कस्बा खोजें या लिखें' : 'Search or type'}
        style={{ ...style(foc, err), padding: `0 ${sm ? 30 : 40}px` }}
      />
      {loading && <IconLoader2 size={sm ? 14 : 16} style={{ position: 'absolute', right: inset, top: '50%', transform: 'translateY(-50%)', color: 'var(--c-primary)', animation: 'placespin 0.8s linear infinite' }} />}
      {open && results.length > 0 && (
        <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 30, background: isDark ? '#1C1A12' : '#FFFFFF', border: `1.5px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.12)'}`, borderRadius: sm ? 8 : 12, boxShadow: '0 12px 32px rgba(0,0,0,0.16)', overflow: 'hidden', maxHeight: 250, overflowY: 'auto' }}>
          {results.map((po, i) => (
            <button
              key={`${po.Name}-${po.Pincode}-${i}`}
              type="button"
              onMouseDown={e => { e.preventDefault(); picked.current = po.Name; onChange(po.Name); setOpen(false) }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', padding: '9px 13px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
              onMouseEnter={e => (e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              <IconMapPin size={15} style={{ color: 'var(--c-primary)', flexShrink: 0 }} />
              <span style={{ minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 13.5, fontWeight: 600, color: t.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{po.Name}</span>
                <span style={{ display: 'block', fontSize: 11.5, color: t.textMuted }}>{po.District}, {po.State} · {po.Pincode}</span>
              </span>
            </button>
          ))}
        </div>
      )}
      <style>{`@keyframes placespin { to { transform: translateY(-50%) rotate(360deg) } }`}</style>
    </div>
  )
}

interface Props {
  label:        string
  parts:        PlaceFieldPart[]
  values:       Record<string, string>
  onChange:     (key: string, value: string) => void
  isDark:       boolean
  size?:        'lg' | 'sm'
  lang?:        FormLang
  error?:       string
}

export default function PlaceSearch({ label, parts, values, onChange, isDark, size = 'lg', lang = 'en', error }: Props) {
  const t = getTheme(isDark)
  const sm = size === 'sm'

  const [otherKeys, setOtherKeys] = useState<Record<string, boolean>>({})
  const [focused,   setFocused]   = useState<string | null>(null)

  const statePart    = parts.find(p => p.role === 'state')
  const districtPart  = parts.find(p => p.role === 'district')
  const stateValue    = statePart    ? (values[statePart.key]    ?? '') : ''
  const districtValue = districtPart ? (values[districtPart.key] ?? '') : ''
  const locationKeys  = parts.filter(p => p.role === 'village' || p.role === 'city').map(p => p.key)

  const inputBg      = isDark ? '#141210' : sm ? t.inputBg : '#FDFAF6'
  const inputBgFocus = isDark ? '#1C1A12' : '#FFFFFF'
  const inputBorder  = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.12)'

  const H      = sm ? 34 : 50
  const radius = sm ? 8 : 12
  const fs     = sm ? 13 : 15

  const controlStyle = (foc: boolean, err?: boolean): React.CSSProperties => ({
    width: '100%', height: H, padding: `0 ${sm ? 10 : 14}px`, fontSize: fs, fontFamily: 'inherit',
    border: `1.5px solid ${err ? '#EF4444' : foc ? 'var(--c-primary)' : inputBorder}`,
    borderRadius: radius, background: foc ? inputBgFocus : inputBg, color: t.text, outline: 'none',
    boxSizing: 'border-box',
    boxShadow: foc ? '0 0 0 3.5px rgb(var(--c-primary-rgb) / 0.11)' : 'none',
    transition: 'border-color 0.15s, box-shadow 0.15s, background 0.35s ease',
  })

  const labelStyle: React.CSSProperties = sm
    ? { fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: isDark ? '#7A6A52' : 'var(--c-primary-deep)', marginBottom: 5, display: 'block' }
    : { display: 'block', marginBottom: 7, fontSize: 13, fontWeight: 600, color: t.textMuted }

  const subLabelStyle: React.CSSProperties = sm
    ? labelStyle
    : { display: 'block', marginBottom: 5, fontSize: 11.5, fontWeight: 600, color: t.textMuted }

  // Apply any `default` (e.g. Rajasthan) once, only to still-empty fields.
  useEffect(() => {
    for (const p of parts) if (p.default && !(values[p.key] ?? '').trim()) onChange(p.key, p.default)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setOther = (key: string, on: boolean) => setOtherKeys(prev => ({ ...prev, [key]: on }))

  function onSelect(part: PlaceFieldPart, next: string) {
    if (next === OTHER) { setOther(part.key, true); onChange(part.key, '') }
    else                { setOther(part.key, false); onChange(part.key, next) }
    // State change invalidates district + location; district change → location.
    if (part.role === 'state' && districtPart) { onChange(districtPart.key, ''); setOther(districtPart.key, false) }
    if (part.role === 'state' || part.role === 'district') for (const lk of locationKeys) onChange(lk, '')
  }

  // Options for a select part; district options depend on the chosen state.
  function selectOptions(part: PlaceFieldPart): readonly string[] {
    if (part.role === 'state')    return IN_STATES
    if (part.role === 'district') return stateValue ? IN_DISTRICTS[stateValue] ?? [] : []
    return []
  }

  // Pair consecutive half-width parts onto one row.
  const rows: PlaceFieldPart[][] = []
  for (const p of parts) {
    const prev = rows[rows.length - 1]
    if (p.half && prev && prev.length === 1 && prev[0].half) prev.push(p)
    else rows.push([p])
  }

  function renderPart(part: PlaceFieldPart) {
    const value    = values[part.key] ?? ''
    const foc       = focused === part.key
    const focOther  = focused === part.key + ':other'

    // Location field → India Post search scoped to state + district. It's the
    // required part, so it carries the error highlight.
    if (part.role === 'village' || part.role === 'city') {
      return (
        <>
          <label style={subLabelStyle}>{part.label}</label>
          <LocationSearch
            value={value}
            onChange={v => onChange(part.key, v)}
            state={stateValue}
            district={districtValue}
            style={controlStyle}
            isDark={isDark} lang={lang} sm={sm}
            err={!!error}
          />
        </>
      )
    }

    const options = selectOptions(part)
    // District with no state chosen yet → let them type freely.
    if (options.length === 0) {
      return (
        <>
          <label style={subLabelStyle}>{part.label}</label>
          <input
            value={value}
            onChange={e => onChange(part.key, e.target.value)}
            onFocus={() => setFocused(part.key)}
            onBlur={() => setFocused(null)}
            style={controlStyle(foc)}
          />
        </>
      )
    }

    const isOther     = otherKeys[part.key] || (value !== '' && !options.includes(value))
    const selectValue = isOther ? OTHER : value

    return (
      <>
        <label style={subLabelStyle}>{part.label}</label>
        <select
          value={selectValue}
          onChange={e => onSelect(part, e.target.value)}
          onFocus={() => setFocused(part.key)}
          onBlur={() => setFocused(null)}
          style={{ ...controlStyle(foc), cursor: 'pointer', color: selectValue ? t.text : t.textMuted }}
        >
          <option value="">{lang === 'hi' ? 'चुनें' : 'Select'}</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
          <option value={OTHER}>{lang === 'hi' ? 'अन्य' : 'Other'}</option>
        </select>
        {isOther && (
          <input
            value={value}
            autoFocus
            onChange={e => onChange(part.key, e.target.value)}
            onFocus={() => setFocused(part.key + ':other')}
            onBlur={() => setFocused(null)}
            placeholder={lang === 'hi' ? 'यहाँ लिखें' : 'Type here'}
            style={{ ...controlStyle(focOther), marginTop: 6 }}
          />
        )}
      </>
    )
  }

  return (
    <div style={{ marginBottom: sm ? 0 : 14 }}>
      <label style={labelStyle}>{label}</label>
      <div style={{ marginTop: sm ? 4 : 2 }}>
        {rows.map((row, ri) => (
          <div key={ri} style={{ display: 'flex', gap: sm ? 10 : 8, marginBottom: ri < rows.length - 1 ? (sm ? 10 : 12) : 0 }}>
            {row.map(part => (
              <div key={part.key} style={{ flex: 1, minWidth: 0 }}>{renderPart(part)}</div>
            ))}
          </div>
        ))}
      </div>
      {error && <p style={{ margin: '5px 0 0', fontSize: 11.5, color: '#EF4444' }}>{error}</p>}
    </div>
  )
}
