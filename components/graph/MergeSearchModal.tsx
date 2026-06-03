'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { IconX, IconSearch, IconLoader2, IconGitMerge } from '@tabler/icons-react'
import { api, type SearchResult } from '@/lib/api'
import { useGraphStore } from '@/store/graphStore'
import { getTheme } from '@/lib/theme'

interface MergeSearchModalProps {
  sourceNodeId:   string
  sourceNodeName: string
  onClose:        () => void
}

export default function MergeSearchModal({ sourceNodeId, sourceNodeName, onClose }: MergeSearchModalProps) {
  const router = useRouter()
  const { isDark } = useGraphStore()
  const t = getTheme(isDark)

  const [query,   setQuery]   = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [touched, setTouched] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus input on open
  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 80) }, [])

  // Debounced search
  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    setLoading(true)
    const id = setTimeout(() => {
      api.search.persons(query.trim())
        .then(({ results: r }) => setResults(r))
        .catch(() => setResults([]))
        .finally(() => setLoading(false))
    }, 280)
    return () => clearTimeout(id)
  }, [query])

  function handleSelect(result: SearchResult) {
    // Navigate to the dedicated merge route — loads their tree with merge-pick mode active
    router.push(
      `/merge?perspective=${result.id}&source=${sourceNodeId}&sourceName=${encodeURIComponent(sourceNodeName)}`,
    )
    onClose()
  }

  const stateColor = (state: string) =>
    state === 'claimed' ? '#22C55E' : state === 'invited' ? '#F59E0B' : '#D97706'

  const stateLabel = (state: string) =>
    state === 'claimed' ? 'Claimed' : state === 'invited' ? 'Invited' : 'Proxy'

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 300,
          background: isDark ? 'rgba(0,0,0,0.65)' : 'rgba(0,0,0,0.35)',
          backdropFilter: 'blur(4px)',
        }}
      />

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: -12 }}
        animate={{ opacity: 1, scale: 1,    y: 0 }}
        exit={{    opacity: 0, scale: 0.96, y: -12 }}
        transition={{ type: 'spring', stiffness: 340, damping: 30 }}
        style={{
          position: 'fixed', top: '12%', left: '50%', transform: 'translateX(-50%)',
          zIndex: 301, width: '420px', maxWidth: 'calc(100vw - 32px)',
          background: isDark ? '#1C1410' : '#FFFAF5',
          border: `1.5px solid ${isDark ? 'rgba(255,255,255,0.09)' : 'rgba(234,88,12,0.15)'}`,
          borderRadius: '16px',
          boxShadow: isDark ? '0 24px 64px rgba(0,0,0,0.7)' : '0 24px 64px rgba(0,0,0,0.16)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '18px 18px 14px',
          borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}`,
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
              <div style={{
                width: '24px', height: '24px', borderRadius: '7px', flexShrink: 0,
                background: 'rgba(234,88,12,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <IconGitMerge size={13} color="#EA580C" />
              </div>
              <span style={{ fontSize: '14px', fontWeight: 700, color: t.text }}>Find node to merge</span>
            </div>
            <p style={{ margin: 0, fontSize: '11.5px', color: t.textMuted }}>
              Merging <span style={{ color: '#EA580C', fontWeight: 600 }}>{sourceNodeName}</span> with someone from another family
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textMuted, padding: '2px', flexShrink: 0 }}
          >
            <IconX size={16} />
          </button>
        </div>

        {/* Search input */}
        <div style={{ padding: '14px 18px 10px', position: 'relative' }}>
          <IconSearch size={15} color={t.textMuted} style={{
            position: 'absolute', left: '30px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none',
          }} />
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setTouched(true) }}
            placeholder="Search by name…"
            style={{
              width: '100%', height: '40px', borderRadius: '10px',
              border: `1.5px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'}`,
              background: isDark ? 'rgba(255,255,255,0.05)' : '#fff',
              color: t.text, fontSize: '13px', padding: '0 12px 0 36px',
              outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
              transition: 'border-color 0.15s',
            }}
            onFocus={e => (e.currentTarget.style.borderColor = '#FB923C')}
            onBlur={e => (e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)')}
          />
          {loading && (
            <motion.div
              animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
              style={{ position: 'absolute', right: '30px', top: '50%', transform: 'translateY(-50%)' }}
            >
              <IconLoader2 size={14} color={t.textMuted} />
            </motion.div>
          )}
        </div>

        {/* Results */}
        <div style={{ maxHeight: '300px', overflowY: 'auto', padding: '0 10px 14px' }}>
          <AnimatePresence>
            {results.length > 0 && results.map((r, i) => {
              const initials = r.full_name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
              return (
                <motion.button
                  key={r.id}
                  initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => handleSelect(r)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: '11px',
                    padding: '10px 10px', borderRadius: '10px', border: 'none',
                    background: 'transparent', cursor: 'pointer', textAlign: 'left',
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  {/* Avatar */}
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '8px', flexShrink: 0,
                    background: r.node_state === 'claimed' ? '#C2410C' : '#D97706',
                    overflow: 'hidden',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {r.photo_url
                      ? <img src={r.photo_url} alt={r.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <span style={{ fontSize: '12px', fontWeight: 700, color: '#fff' }}>{initials}</span>
                    }
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: t.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {r.full_name}
                    </div>
                    <div style={{ fontSize: '11px', color: t.textMuted, marginTop: '1px' }}>
                      {r.family_name}
                      {r.birth_year && <span> · {r.birth_year}</span>}
                    </div>
                  </div>

                  {/* State badge */}
                  <span style={{
                    fontSize: '9.5px', fontWeight: 700, padding: '2px 7px',
                    borderRadius: '999px', flexShrink: 0, letterSpacing: '0.04em',
                    background: `${stateColor(r.node_state)}20`,
                    color: stateColor(r.node_state),
                  }}>
                    {stateLabel(r.node_state)}
                  </span>
                </motion.button>
              )
            })}
          </AnimatePresence>

          {touched && !loading && query.trim() && results.length === 0 && (
            <div style={{ padding: '24px', textAlign: 'center', color: t.textMuted, fontSize: '12.5px' }}>
              No matches found for "{query}"
            </div>
          )}

          {!touched && (
            <div style={{ padding: '20px', textAlign: 'center', color: t.textMuted, fontSize: '12px', lineHeight: 1.6 }}>
              Search for a person from another family.<br />
              Click their name to open their family tree.
            </div>
          )}
        </div>
      </motion.div>
    </>
  )
}
