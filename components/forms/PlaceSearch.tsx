'use client'

// ─────────────────────────────────────────────────────────────────────────────
// PlaceSearch — cascading location block: State → District → Location.
//
//   • State    — type-and-search over Indian states (IN_STATES).
//   • District — type-and-search driven by the chosen state (IN_DISTRICTS[state]).
//   • Location — a search box (India Post directory) scoped to the chosen
//                state + district, so picking Rajasthan → Sirohi lets you search
//                "Abu Road" / "Mungthala".
//
// Every field lets you just type: if what you type isn't in the list, an
// "Other" row keeps your text and it saves as-is. Changing the state clears the
// district + location; changing the district clears location.
//
// State-key agnostic: each part names the `key` it reads/writes via the given
// values map + onChange. The signup/invite forms pass DB column names; the node
// editor passes camelCase Draft keys. Two sizes: 'lg' (auth forms) / 'sm'.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react'
import { IconSearch, IconLoader2, IconMapPin } from '@tabler/icons-react'
import { getTheme } from '@/lib/theme'
import type { FormLang } from '@/lib/forms/personFields'
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

type StyleFn = (foc: boolean, err?: boolean) => React.CSSProperties

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

// Shared dropdown chrome.
function dropdownStyle(isDark: boolean, sm: boolean): React.CSSProperties {
  return {
    position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 30,
    background: isDark ? '#1C1A12' : '#FFFFFF',
    border: `1.5px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.12)'}`,
    borderRadius: sm ? 8 : 12, boxShadow: '0 12px 32px rgba(0,0,0,0.16)',
    overflow: 'hidden', maxHeight: 250, overflowY: 'auto',
  }
}

function rowStyle(): React.CSSProperties {
  return { display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', padding: '9px 13px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }
}

// ── State / District — type-and-search over a static list, free text allowed ──
interface ComboProps {
  value: string
  onChange: (v: string) => void
  options: readonly string[]
  placeholder: string
  style: StyleFn
  isDark: boolean
  lang: FormLang
  sm: boolean
}

function RegionCombo({ value, onChange, options, placeholder, style, isDark, lang, sm }: ComboProps) {
  const t = getTheme(isDark)
  const [open, setOpen] = useState(false)
  const [foc, setFoc]   = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const q        = norm(value)
  const filtered = q ? options.filter(o => norm(o).includes(q)) : options
  const exact    = options.some(o => norm(o) === q)
  const showOther = value.trim() !== '' && !exact

  return (
    <div style={{ position: 'relative' }} ref={boxRef}>
      <input
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => { setFoc(true); setOpen(true) }}
        onBlur={() => setFoc(false)}
        placeholder={placeholder}
        style={style(foc)}
      />
      {open && (filtered.length > 0 || showOther) && (
        <div style={dropdownStyle(isDark, sm)}>
          {filtered.map(o => (
            <button
              key={o}
              type="button"
              onMouseDown={e => { e.preventDefault(); onChange(o); setOpen(false) }}
              style={rowStyle()}
              onMouseEnter={e => (e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              <span style={{ fontSize: sm ? 13 : 14, color: t.text }}>{o}</span>
            </button>
          ))}
          {showOther && (
            <button
              type="button"
              onMouseDown={e => { e.preventDefault(); setOpen(false) }}
              style={{ ...rowStyle(), borderTop: filtered.length ? `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}` : 'none' }}
              onMouseEnter={e => (e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              <span style={{ fontSize: sm ? 12.5 : 13.5, color: 'var(--c-primary)', fontWeight: 600 }}>
                {lang === 'hi' ? 'अन्य — ' : 'Other — keep '}“{value.trim()}”
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Location — India Post search scoped to state + district ───────────────────
interface LocationProps {
  value: string
  onChange: (v: string) => void
  state: string
  district: string
  style: StyleFn
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
        <div style={dropdownStyle(isDark, sm)}>
          {results.map((po, i) => (
            <button
              key={`${po.Name}-${po.Pincode}-${i}`}
              type="button"
              onMouseDown={e => { e.preventDefault(); picked.current = po.Name; onChange(po.Name); setOpen(false) }}
              style={rowStyle()}
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

  const [focused, setFocused] = useState<string | null>(null)

  const statePart     = parts.find(p => p.role === 'state')
  const districtPart   = parts.find(p => p.role === 'district')
  const stateValue     = statePart    ? (values[statePart.key]    ?? '') : ''
  const districtValue  = districtPart ? (values[districtPart.key] ?? '') : ''
  const locationKeys   = parts.filter(p => p.role === 'village' || p.role === 'city').map(p => p.key)

  const inputBg      = isDark ? '#141210' : sm ? t.inputBg : '#FDFAF6'
  const inputBgFocus = isDark ? '#1C1A12' : '#FFFFFF'
  const inputBorder  = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.12)'

  const H      = sm ? 34 : 50
  const radius = sm ? 8 : 12
  const fs     = sm ? 13 : 15

  const controlStyle: StyleFn = (foc, err) => ({
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

  // Editing the state re-scopes district + location; editing district re-scopes
  // location. Clear the downstream fields so stale values don't linger.
  function onRegionChange(part: PlaceFieldPart, v: string) {
    onChange(part.key, v)
    if (part.role === 'state') {
      if (districtPart) onChange(districtPart.key, '')
      for (const lk of locationKeys) onChange(lk, '')
    } else if (part.role === 'district') {
      for (const lk of locationKeys) onChange(lk, '')
    }
  }

  // Pair consecutive half-width parts onto one row.
  const rows: PlaceFieldPart[][] = []
  for (const p of parts) {
    const prev = rows[rows.length - 1]
    if (p.half && prev && prev.length === 1 && prev[0].half) prev.push(p)
    else rows.push([p])
  }

  function renderPart(part: PlaceFieldPart) {
    const value = values[part.key] ?? ''

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

    // State / District → type-and-search combobox (free text saves as Other).
    const options = part.role === 'state'
      ? IN_STATES
      : (stateValue ? IN_DISTRICTS[stateValue] ?? [] : [])

    return (
      <>
        <label style={subLabelStyle}>{part.label}</label>
        <RegionCombo
          value={value}
          onChange={v => onRegionChange(part, v)}
          options={options}
          placeholder={lang === 'hi' ? 'खोजें या लिखें' : 'Search or type'}
          style={controlStyle}
          isDark={isDark} lang={lang} sm={sm}
        />
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
