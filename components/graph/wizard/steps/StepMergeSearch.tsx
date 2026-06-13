'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { IconSearch, IconLoader2 } from '@tabler/icons-react'
import { api } from '@/lib/api'
import type { SearchResult } from '@/lib/api'
import type { RelAction } from '@/components/graph/Navbar'
import { COLORS, type Theme } from '@/lib/theme'
import { MiniNodeCard, searchMetaPieces } from '@/components/graph/NodeCard'

interface StepMergeSearchProps {
  isDark:        boolean
  t:             Theme
  relAction:     RelAction
  onAddForMerge: (action: RelAction, match: SearchResult) => Promise<void>
}

const stateColor = (s: string) => s === 'claimed' ? '#22C55E' : s === 'invited' ? '#F59E0B' : '#D97706'
const stateLabel = (s: string) => s === 'claimed' ? 'Claimed' : s === 'invited' ? 'Invited' : 'Proxy'

export default function StepMergeSearch({ isDark, t, relAction, onAddForMerge }: StepMergeSearchProps) {
  const [query,    setQuery]    = useState('')
  const [results,  setResults]  = useState<SearchResult[]>([])
  const [loading,  setLoading]  = useState(false)
  const [touched,  setTouched]  = useState(false)
  const [hovered,  setHovered]  = useState<SearchResult | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [saving,   setSaving]   = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 80) }, [])

  useEffect(() => {
    if (!query.trim()) { setResults([]); setLoading(false); return }
    setLoading(true)
    const id = setTimeout(() => {
      api.search.persons(query.trim(), 'all')
        .then(({ results: r }) => setResults(r))
        .catch(() => setResults([]))
        .finally(() => setLoading(false))
    }, 280)
    return () => clearTimeout(id)
  }, [query])

  const handleSelect = async (r: SearchResult) => {
    if (saving) return
    setSelected(r.id)
    setSaving(true)
    try {
      await onAddForMerge(relAction, r)
    } catch {
      setSaving(false)
      setSelected(null)
    }
  }

  return (
    <div style={{ padding: '14px 16px 16px' }}>
      {/* Search input */}
      <div style={{ position: 'relative', marginBottom: 10 }}>
        <IconSearch size={15} color={t.textMuted} style={{
          position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none',
        }} />
        <input
          ref={inputRef}
          value={query}
          onChange={e => { setQuery(e.target.value); setTouched(true) }}
          placeholder="Search by name…"
          style={{
            width: '100%', height: 42, borderRadius: 11, boxSizing: 'border-box',
            border: `1.5px solid ${isDark ? 'rgba(255,255,255,0.11)' : 'rgba(0,0,0,0.10)'}`,
            background: isDark ? 'rgba(255,255,255,0.05)' : '#fff',
            color: t.text, fontSize: 13.5, padding: '0 38px 0 36px',
            outline: 'none', fontFamily: 'inherit',
            transition: 'border-color 0.15s, box-shadow 0.15s',
          }}
          onFocus={e => {
            e.currentTarget.style.borderColor = '#FB923C'
            e.currentTarget.style.boxShadow  = '0 0 0 3px rgba(234,88,12,0.1)'
          }}
          onBlur={e => {
            e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.11)' : 'rgba(0,0,0,0.10)'
            e.currentTarget.style.boxShadow  = 'none'
          }}
        />
        {loading && (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
            style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)' }}
          >
            <IconLoader2 size={15} color={t.textMuted} />
          </motion.div>
        )}
      </div>

      {/* Results */}
      <div style={{ maxHeight: 280, overflowY: 'auto' }}>
        <AnimatePresence>
          {results.map((r, i) => {
            const isHov = hovered?.id === r.id
            const isSel = selected === r.id
            const meta  = searchMetaPieces(r)
            return (
              <motion.button
                key={r.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => handleSelect(r)}
                onMouseEnter={() => setHovered(r)}
                onMouseLeave={() => setHovered(null)}
                disabled={saving}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                  padding: '9px 10px', borderRadius: 12, textAlign: 'left', marginBottom: 4,
                  border: `1.5px solid ${isHov || isSel
                    ? (isDark ? 'rgba(234,88,12,0.3)' : 'rgba(234,88,12,0.2)')
                    : 'transparent'}`,
                  background: isHov || isSel
                    ? (isDark ? 'rgba(234,88,12,0.08)' : 'rgba(234,88,12,0.05)')
                    : 'transparent',
                  cursor: saving ? 'wait' : 'pointer',
                  transition: 'background 0.12s, border-color 0.12s',
                }}
              >
                <MiniNodeCard
                  fullName={r.full_name}
                  photoUrl={r.photo_url}
                  nodeState={r.node_state as 'proxy' | 'invited' | 'claimed'}
                  isDark={isDark}
                />

                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <div style={{
                    fontSize: 13.5, fontWeight: 600, color: t.text,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {r.full_name}
                    {isSel && saving && (
                      <span style={{ fontSize: 11, color: COLORS.saffron, marginLeft: 8, fontWeight: 400 }}>
                        Adding…
                      </span>
                    )}
                  </div>
                  {meta.length > 0 && (
                    <div style={{
                      fontSize: 11.5,
                      color: isHov ? COLORS.saffron : t.textMuted,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      transition: 'color 0.1s',
                    }}>
                      {meta.join(' · ')}
                    </div>
                  )}
                  <div style={{
                    fontSize: 11, fontWeight: 500,
                    color: r.is_own_family ? COLORS.saffron : t.textMuted,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {r.is_own_family ? 'Your family' : r.family_name}
                  </div>
                </div>

                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 999,
                  letterSpacing: '0.04em', flexShrink: 0,
                  background: `${stateColor(r.node_state)}20`,
                  color: stateColor(r.node_state),
                  border: `1px solid ${stateColor(r.node_state)}35`,
                }}>
                  {stateLabel(r.node_state)}
                </span>
              </motion.button>
            )
          })}
        </AnimatePresence>

        {touched && !loading && query.trim() && results.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ padding: '28px 0', textAlign: 'center' }}
          >
            <div style={{ fontSize: 26, marginBottom: 8 }}>🔍</div>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: t.text, marginBottom: 4 }}>No one found</div>
            <div style={{ fontSize: 12, color: t.textMuted }}>No match for "{query}" in other families</div>
          </motion.div>
        )}

        {!touched && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
            style={{ padding: '18px 8px 4px', textAlign: 'center' }}
          >
            <p style={{ margin: 0, fontSize: 12.5, color: t.textMuted, lineHeight: 1.8 }}>
              Search for someone from <strong style={{ color: t.text }}>another family&apos;s tree</strong>.<br />
              Selecting them creates a proxy node linked by a merge request.
            </p>
          </motion.div>
        )}
      </div>
    </div>
  )
}
