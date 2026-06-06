'use client'

import { useState, useEffect, useRef, useCallback, KeyboardEvent } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { IconSearch, IconX, IconLoader2 } from '@tabler/icons-react'
import { api, type SearchResult } from '@/lib/api'
import { getTheme } from '@/lib/theme'

interface SearchBarProps {
  isDark: boolean
  onSelectPerson?: (personId: string) => boolean
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function nodeStateColor(state: string): string {
  if (state === 'claimed') return '#EA580C'
  return '#D97706'
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function SearchBar({ isDark, onSelectPerson }: SearchBarProps) {
  const router = useRouter()
  const t = getTheme(isDark)

  const [query,     setQuery]     = useState('')
  const [results,   setResults]   = useState<SearchResult[]>([])
  const [loading,   setLoading]   = useState(false)
  const [open,      setOpen]      = useState(false)
  const [cursor,    setCursor]    = useState(-1)   // keyboard-selected row index

  const inputRef     = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Debounced search ───────────────────────────────────────────────────────

  const search = useCallback((q: string) => {
    if (q.trim().length < 2) {
      setResults([])
      setOpen(false)
      setLoading(false)
      return
    }
    setLoading(true)
    api.search.persons(q)
      .then(({ results: res }) => {
        setResults(res)
        setOpen(true)
        setCursor(-1)
      })
      .catch(() => setResults([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (query.trim().length < 2) {
      setResults([])
      setOpen(false)
      setLoading(false)
      return
    }
    setLoading(true)
    debounceRef.current = setTimeout(() => search(query), 320)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, search])

  // ── Close on outside click ─────────────────────────────────────────────────

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [])

  // ── Navigation helper ──────────────────────────────────────────────────────

  function navigateTo(person: SearchResult) {
    setQuery('')
    setOpen(false)
    setResults([])
    if (onSelectPerson && onSelectPerson(person.id)) return
    router.push(`/graph?perspective=${person.id}`)
  }

  // ── Keyboard handler ───────────────────────────────────────────────────────

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (!open || results.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setCursor(c => Math.min(c + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setCursor(c => Math.max(c - 1, 0))
    } else if (e.key === 'Enter' && cursor >= 0) {
      e.preventDefault()
      navigateTo(results[cursor])
    } else if (e.key === 'Escape') {
      setOpen(false)
      inputRef.current?.blur()
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', width: '100%' }}
    >
      {/* Input */}
      <div style={{
        display:      'flex',
        alignItems:   'center',
        gap:          '8px',
        height:       '38px',
        padding:      '0 12px',
        background:   t.cardBg,
        border:       `1.5px solid ${open ? '#EA580C' : t.controlBorder}`,
        borderRadius: open && results.length > 0 ? '10px 10px 0 0' : '10px',
        boxShadow:    isDark ? '0 2px 12px rgba(0,0,0,0.4)' : '0 2px 8px rgba(0,0,0,0.07)',
        transition:   'border-color 0.15s, border-radius 0.12s',
      }}>
        {loading
          ? <motion.span
              animate={{ rotate: 360 }}
              transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
              style={{ display: 'flex', flexShrink: 0 }}
            >
              <IconLoader2 size={15} color={t.textMuted} />
            </motion.span>
          : <IconSearch size={15} color={open ? '#EA580C' : t.textMuted} style={{ flexShrink: 0 }} />
        }
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => { if (results.length > 0) setOpen(true) }}
          onKeyDown={onKey}
          placeholder="Search family members…"
          style={{
            flex:       1,
            background: 'none',
            border:     'none',
            outline:    'none',
            fontSize:   '13px',
            color:      t.text,
            fontFamily: 'inherit',
          }}
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setOpen(false); setResults([]); inputRef.current?.focus() }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textMuted, display: 'flex', padding: 0, flexShrink: 0 }}
          >
            <IconX size={14} />
          </button>
        )}
      </div>

      {/* Dropdown */}
      <AnimatePresence>
        {open && results.length > 0 && (
          <motion.div
            key="dropdown"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{    opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            style={{
              position:     'absolute',
              top:          '100%',
              left:         0,
              right:        0,
              zIndex:       999,
              background:   t.cardBg,
              border:       '1.5px solid #EA580C',
              borderTop:    `1px solid ${t.controlBorder}`,
              borderRadius: '0 0 10px 10px',
              boxShadow:    isDark ? '0 8px 24px rgba(0,0,0,0.5)' : '0 8px 24px rgba(0,0,0,0.10)',
              overflow:     'hidden',
            }}
          >
            {results.map((person, i) => {
              const isActive = cursor === i
              return (
                <div
                  key={person.id}
                  onMouseEnter={() => setCursor(i)}
                  onMouseLeave={() => setCursor(-1)}
                  onClick={() => navigateTo(person)}
                  style={{
                    display:    'flex',
                    alignItems: 'center',
                    gap:        '10px',
                    padding:    '9px 12px',
                    cursor:     'pointer',
                    background: isActive
                      ? (isDark ? 'rgba(234,88,12,0.12)' : 'rgba(234,88,12,0.07)')
                      : 'transparent',
                    borderBottom: i < results.length - 1
                      ? `1px solid ${t.controlBorder}`
                      : 'none',
                    transition: 'background 0.1s',
                  }}
                >
                  {/* Avatar */}
                  <div style={{
                    width:          '34px',
                    height:         '34px',
                    borderRadius:   '50%',
                    flexShrink:     0,
                    overflow:       'hidden',
                    background:     person.photo_url ? 'transparent' : nodeStateColor(person.node_state),
                    display:        'flex',
                    alignItems:     'center',
                    justifyContent: 'center',
                    fontSize:       '12px',
                    fontWeight:     700,
                    color:          '#fff',
                  }}>
                    {person.photo_url
                      ? <img src={person.photo_url} alt={person.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : getInitials(person.full_name)
                    }
                  </div>

                  {/* Name + family */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize:     '13px',
                      fontWeight:   600,
                      color:        t.text,
                      whiteSpace:   'nowrap',
                      overflow:     'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {person.full_name}
                    </div>
                    <div style={{
                      fontSize:     '11px',
                      color:        isActive ? '#EA580C' : t.textMuted,
                      marginTop:    '1px',
                      whiteSpace:   'nowrap',
                      overflow:     'hidden',
                      textOverflow: 'ellipsis',
                      transition:   'color 0.1s',
                    }}>
                      {person.family_name}
                      {person.birth_year ? ` · b. ${person.birth_year}` : ''}
                    </div>
                  </div>

                  {/* "View tree" hint — only on hover */}
                  {isActive && (
                    <span style={{
                      fontSize:   '10.5px',
                      color:      '#EA580C',
                      fontWeight: 500,
                      flexShrink: 0,
                      opacity:    0.8,
                    }}>
                      View tree →
                    </span>
                  )}
                </div>
              )
            })}
          </motion.div>
        )}

        {/* No results */}
        {open && !loading && query.trim().length >= 2 && results.length === 0 && (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{    opacity: 0 }}
            style={{
              position:     'absolute',
              top:          '100%',
              left:         0,
              right:        0,
              zIndex:       999,
              background:   t.cardBg,
              border:       '1.5px solid #EA580C',
              borderTop:    `1px solid ${t.controlBorder}`,
              borderRadius: '0 0 10px 10px',
              padding:      '14px 12px',
              fontSize:     '12.5px',
              color:        t.textMuted,
              textAlign:    'center',
            }}
          >
            No results for "{query}"
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
