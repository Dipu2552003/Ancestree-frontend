'use client'

// Landing page (public) — a minimal, search-first hero.
// One screen: a title, a search bar that queries PUBLIC family trees (no auth)
// with a cycling typewriter placeholder, and a one-line quote beneath it.
// The same animated dot-field used on /graph sits in the background.

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { IconSearch, IconLoader2, IconArrowRight, IconBinaryTree2 } from '@tabler/icons-react'
import DotField from '@/components/graph/DotField'
import { api } from '@/lib/api'
import type { SearchResult } from '@/lib/api'

const SAFFRON = 'var(--c-primary)'
const CREAM   = 'var(--c-page)'
const INK     = '#252525'
const MUTED   = '#6B6052'
const SERIF   = 'var(--font-serif), Georgia, "Times New Roman", serif'
const EASE     = [0.22, 1, 0.36, 1] as const

// Examples the placeholder types out, one after another.
const SUGGESTIONS = ['Maharana Pratap', 'Gandhi family', 'Dark family']

function initial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || '?'
}

function metaLine(r: SearchResult): string {
  return [r.native_village, r.current_city, r.birth_year ? `b. ${r.birth_year}` : null]
    .filter(Boolean)
    .join(' · ')
}

// ── Typewriter placeholder ──────────────────────────────────────────────────
// Types a phrase, pauses, deletes it, then advances to the next — looping.
// `active` pauses the animation (e.g. once the user starts typing).
function useTypewriter(words: string[], active: boolean): string {
  const [text, setText] = useState('')

  useEffect(() => {
    if (!active) return
    let wordIndex = 0
    let charIndex = 0
    let deleting = false
    let timer: ReturnType<typeof setTimeout>

    const step = () => {
      const word = words[wordIndex]
      if (!deleting) {
        charIndex++
        setText(word.slice(0, charIndex))
        if (charIndex === word.length) {
          deleting = true
          timer = setTimeout(step, 1600)   // hold the full word
          return
        }
        timer = setTimeout(step, 95)
      } else {
        charIndex--
        setText(word.slice(0, charIndex))
        if (charIndex === 0) {
          deleting = false
          wordIndex = (wordIndex + 1) % words.length
          timer = setTimeout(step, 350)    // pause before next word
          return
        }
        timer = setTimeout(step, 45)
      }
    }

    timer = setTimeout(step, 500)
    return () => clearTimeout(timer)
  }, [words, active])

  return text
}

export default function Landing() {
  const router = useRouter()
  const [query,   setQuery]   = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [focused, setFocused] = useState(false)
  const [touched, setTouched] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  // Typewriter runs only while the field is empty.
  const typed = useTypewriter(SUGGESTIONS, query.length === 0)

  // Debounced public search. Backend returns [] for queries under 2 chars.
  useEffect(() => {
    const trimmed = query.trim()
    const id = setTimeout(() => {
      if (trimmed.length < 2) { setResults([]); setLoading(false); return }
      setLoading(true)
      api.search.publicPersons(trimmed)
        .then(({ results: r }) => setResults(r))
        .catch(() => setResults([]))
        .finally(() => setLoading(false))
    }, 280)
    return () => clearTimeout(id)
  }, [query])

  // Close the results dropdown when clicking outside the search box.
  useEffect(() => {
    const onOutside = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setFocused(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [])

  const showResults = focused && query.trim().length >= 2

  return (
    <main style={{
      position: 'relative', minHeight: '100dvh', background: CREAM, overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* ── Animated dot-field (same as /graph) ─────────────────────────────── */}
      <DotField isDark={false} />

      {/* Soft radial wash to lift the centre off the dot grid */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: 'radial-gradient(58% 50% at 50% 42%, rgb(var(--c-page-rgb) / 0.85) 0%, rgb(var(--c-page-rgb) / 0) 72%)',
      }} />

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <header style={{
        position: 'relative', zIndex: 20,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '18px clamp(20px, 6vw, 56px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg, var(--c-primary) 0%, var(--c-primary-strong) 100%)',
            boxShadow: '0 2px 8px rgb(var(--c-primary-rgb) / 0.32)',
          }}>
            <IconBinaryTree2 size={18} color="#fff" strokeWidth={2.2} />
          </div>
          <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.03em', color: INK }}>
            Ancestree
          </span>
        </div>
        <nav style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <a href="/community" style={{ fontSize: 14, fontWeight: 600, color: INK, textDecoration: 'none', padding: '9px 14px', borderRadius: 10 }}>
            Communities
          </a>
          <a href="/login" style={{ fontSize: 14, fontWeight: 600, color: INK, textDecoration: 'none', padding: '9px 14px', borderRadius: 10 }}>
            Sign in
          </a>
          <a href="/signup" style={{
            fontSize: 14, fontWeight: 700, color: '#fff', textDecoration: 'none', padding: '9px 18px', borderRadius: 10,
            background: 'linear-gradient(135deg, var(--c-primary) 0%, var(--c-primary-strong) 100%)',
            boxShadow: '0 3px 12px rgb(var(--c-primary-rgb) / 0.32)',
          }}>
            Sign up
          </a>
        </nav>
      </header>

      {/* ── Centre hero ─────────────────────────────────────────────────────── */}
      <section style={{
        position: 'relative', zIndex: 10, flex: 1, fontFamily: SERIF,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        textAlign: 'center', padding: '0 24px 12vh',
      }}>
        <motion.h1
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: EASE }}
          style={{
            margin: '0 0 28px', lineHeight: 1.05,
            fontSize: 'clamp(34px, 6.5vw, 58px)', fontWeight: 800, letterSpacing: '-0.035em', color: INK,
          }}
        >
          Know your ancestry
        </motion.h1>

        {/* ── Search box ────────────────────────────────────────────────────── */}
        <motion.div
          ref={boxRef}
          initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.55, ease: EASE, delay: 0.1 }}
          style={{ position: 'relative', width: '100%', maxWidth: 560 }}
        >
          <div style={{ position: 'relative' }}>
            <IconSearch
              size={19} color={focused ? SAFFRON : MUTED}
              style={{ position: 'absolute', left: 18, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', transition: 'color 0.15s' }}
            />
            <input
              value={query}
              onChange={e => { setQuery(e.target.value); setTouched(true) }}
              onFocus={() => setFocused(true)}
              placeholder={query.length === 0 ? `Search "${typed}▌"` : 'Search a name'}
              style={{
                width: '100%', height: 60, boxSizing: 'border-box',
                padding: '0 18px 0 50px', fontSize: 16.5, fontFamily: 'inherit',
                color: INK, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)',
                border: `1.5px solid ${focused ? SAFFRON : 'rgba(0,0,0,0.10)'}`,
                borderRadius: 18, outline: 'none',
                boxShadow: focused
                  ? '0 0 0 4px rgb(var(--c-primary-rgb) / 0.10), 0 12px 36px rgba(0,0,0,0.08)'
                  : '0 12px 36px rgba(0,0,0,0.06)',
                transition: 'border-color 0.15s, box-shadow 0.2s',
              }}
            />
            {loading && (
              <motion.div
                animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
                style={{ position: 'absolute', right: 18, top: '50%', transform: 'translateY(-50%)' }}
              >
                <IconLoader2 size={18} color={MUTED} />
              </motion.div>
            )}
          </div>

          {/* Results dropdown */}
          <AnimatePresence>
            {showResults && (
              <motion.div
                initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.16 }}
                style={{
                  position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0, zIndex: 10,
                  background: '#fff', borderRadius: 16, border: '1px solid rgba(0,0,0,0.08)',
                  boxShadow: '0 16px 44px rgba(0,0,0,0.12)', overflow: 'hidden',
                  maxHeight: 340, overflowY: 'auto', textAlign: 'left',
                }}
              >
                {results.length > 0 ? (
                  results.map(r => (
                    <button
                      key={r.id}
                      onClick={() => router.push(`/p/${r.id}`)}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                        padding: '11px 16px', background: 'none', border: 'none', cursor: 'pointer',
                        textAlign: 'left', fontFamily: 'inherit',
                        borderBottom: '1px solid rgba(0,0,0,0.05)',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgb(var(--c-primary-rgb) / 0.05)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                    >
                      <div style={{
                        width: 38, height: 38, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: r.photo_url ? 'transparent' : 'rgb(var(--c-primary-rgb) / 0.10)',
                        color: SAFFRON, fontWeight: 700, fontSize: 15,
                      }}>
                        {r.photo_url
                          // eslint-disable-next-line @next/next/no-img-element
                          ? <img src={r.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : initial(r.full_name)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14.5, fontWeight: 600, color: INK, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {r.full_name}
                        </div>
                        <div style={{ fontSize: 12, color: MUTED, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {[r.family_name, metaLine(r)].filter(Boolean).join('  ·  ')}
                        </div>
                      </div>
                      <IconArrowRight size={15} color={MUTED} style={{ flexShrink: 0 }} />
                    </button>
                  ))
                ) : !loading && touched ? (
                  <div style={{ padding: '22px 16px', textAlign: 'center', color: MUTED, fontSize: 13.5 }}>
                    No public match for “{query.trim()}”.{' '}
                    <a href="/signup" style={{ color: SAFFRON, fontWeight: 700, textDecoration: 'none' }}>
                      Add them
                    </a>
                  </div>
                ) : null}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ── Quote ─────────────────────────────────────────────────────────── */}
        <motion.p
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE, delay: 0.24 }}
          style={{
            margin: '30px 0 0', maxWidth: 540, fontSize: 'clamp(14.5px, 2.2vw, 16.5px)',
            lineHeight: 1.65, color: MUTED,
          }}
        >
          One place to know where we all came from — build your family in
          private, share it publicly, or grow it together as a community.
        </motion.p>
      </section>
    </main>
  )
}
