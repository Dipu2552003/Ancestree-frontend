'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { IconX, IconSearch, IconLoader2, IconGitMerge } from '@tabler/icons-react'
import { api, type SearchResult } from '@/lib/api'
import { useGraphStore } from '@/store/graphStore'
import { getTheme } from '@/lib/theme'
import { NodeCard, GhostCard, CARD_W, CARD_H, MiniNodeCard, searchMetaPieces } from './NodeCard'

interface Props {
  sourceNodeId:   string
  sourceNodeName: string
  onClose:        () => void
}

// ── State / label helpers ─────────────────────────────────────────────────────
const stateColor = (s: string) => s === 'claimed' ? '#22C55E' : s === 'invited' ? '#F59E0B' : '#D97706'
const stateLabel = (s: string) => s === 'claimed' ? 'Claimed' : s === 'invited' ? 'Invited' : 'Proxy'

// ── Animated connector between the two cards ──────────────────────────────────
function MergeConnector({ isDark }: { isDark: boolean }) {
  const dash = isDark
    ? 'repeating-linear-gradient(to right,rgba(234,88,12,0.5) 0,rgba(234,88,12,0.5) 5px,transparent 5px,transparent 10px)'
    : 'repeating-linear-gradient(to right,rgba(234,88,12,0.35) 0,rgba(234,88,12,0.35) 5px,transparent 5px,transparent 10px)'

  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 0, minWidth: 0 }}>
      {/* left dash */}
      <motion.div
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: 1, opacity: 1 }}
        transition={{ delay: 0.45, duration: 0.35 }}
        style={{ flex: 1, height: 2, background: dash, transformOrigin: 'left' }}
      />

      {/* merge icon bubble */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.62, type: 'spring', stiffness: 340, damping: 22 }}
        style={{
          width: 36, height: 36, borderRadius: '50%', flexShrink: 0, zIndex: 1,
          background: isDark ? '#1C1410' : '#FFF7ED',
          border: `2px solid ${isDark ? 'rgba(234,88,12,0.35)' : 'rgba(234,88,12,0.28)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 0 0 6px ${isDark ? 'rgba(234,88,12,0.07)' : 'rgba(234,88,12,0.06)'}`,
        }}
      >
        <motion.div
          animate={{ rotate: [0, 8, -8, 0], scale: [1, 1.15, 1] }}
          transition={{ duration: 2.8, repeat: Infinity, repeatDelay: 1.5, ease: 'easeInOut' }}
        >
          <IconGitMerge size={16} color="#EA580C" />
        </motion.div>
      </motion.div>

      {/* right dash */}
      <motion.div
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: 1, opacity: 1 }}
        transition={{ delay: 0.72, duration: 0.35 }}
        style={{ flex: 1, height: 2, background: dash, transformOrigin: 'right' }}
      />
    </div>
  )
}

// ── Main modal ────────────────────────────────────────────────────────────────
export default function MergeSearchModal({ sourceNodeId, sourceNodeName, onClose }: Props) {
  const router = useRouter()
  const { isDark } = useGraphStore()
  const t = getTheme(isDark)

  const [query,    setQuery]    = useState('')
  const [results,  setResults]  = useState<SearchResult[]>([])
  const [loading,  setLoading]  = useState(false)
  const [touched,  setTouched]  = useState(false)
  const [hovered,  setHovered]  = useState<SearchResult | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 500)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 100) }, [])

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    setLoading(true)
    const id = setTimeout(() => {
      api.search.persons(query.trim(), 'all')
        .then(({ results: r }) => setResults(r))
        .catch(() => setResults([]))
        .finally(() => setLoading(false))
    }, 280)
    return () => clearTimeout(id)
  }, [query])

  function handleSelect(r: SearchResult) {
    router.push(`/merge?perspective=${r.id}&source=${sourceNodeId}&sourceName=${encodeURIComponent(sourceNodeName)}`)
    onClose()
  }

  return (
    <>
      {/* ── Backdrop ── */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 300,
          background: isDark ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.45)',
          backdropFilter: 'blur(8px)',
        }}
      />

      {/* ── Card ── */}
      {/* Centering wrapper — flexbox owns the centering; motion.div owns the animation */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 301,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'none',
      }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 24 }}
        animate={{ opacity: 1, scale: 1,    y: 0 }}
        exit={{    opacity: 0, scale: 0.92, y: 24 }}
        transition={{ type: 'spring', stiffness: 300, damping: 26 }}
        style={{
          pointerEvents: 'all',
          width: 600, maxWidth: 'calc(100vw - 24px)',
          maxHeight: 'calc(100vh - 40px)',
          background: isDark ? '#1C1410' : '#FFFAF5',
          border: `1.5px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(234,88,12,0.14)'}`,
          borderRadius: 22,
          boxShadow: isDark
            ? '0 40px 100px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.04)'
            : '0 40px 100px rgba(0,0,0,0.2),  0 0 0 1px rgba(234,88,12,0.06)',
          overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
        }}
      >
        {/* ── Header ── */}
        <div style={{
          padding: '18px 22px 16px',
          borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 9,
              background: 'rgba(234,88,12,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <IconGitMerge size={16} color="#EA580C" />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: t.text, lineHeight: 1.2 }}>Merge node</div>
              <div style={{ fontSize: 11.5, color: t.textMuted, marginTop: 2 }}>
                Linking <span style={{ color: '#EA580C', fontWeight: 600 }}>{sourceNodeName}</span> to someone from another family
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, borderRadius: 8, flexShrink: 0, border: 'none', cursor: 'pointer',
              background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)',
              color: t.textMuted,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.12s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.12)')}
            onMouseLeave={e => (e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)')}
          >
            <IconX size={14} />
          </button>
        </div>

        {/* ── Hero: both node cards ── */}
        <div style={{
          padding: isMobile ? '20px 16px 16px' : '28px 32px 20px',
          borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(234,88,12,0.09)'}`,
          background: isDark ? 'rgba(255,255,255,0.015)' : 'rgba(234,88,12,0.025)',
        }}>
          {/* Mobile: source card only (target swaps in on tap via results) */}
          {isMobile ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 24 }}>
                  <NodeCard fullName={sourceNodeName} isDark={isDark} nodeState="proxy" />
                </motion.div>
                <span style={{ fontSize: 10, fontWeight: 600, color: '#EA580C', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Your node</span>
              </div>
              <MergeConnector isDark={isDark} />
              <div style={{ width: CARD_W, height: CARD_H, position: 'relative', flexShrink: 0 }}>
                <AnimatePresence mode="wait">
                  {hovered ? (
                    <motion.div key={hovered.id} initial={{ opacity: 0, scale: 0.88 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.88 }}
                      transition={{ type: 'spring', stiffness: 340, damping: 26 }} style={{ position: 'absolute', inset: 0 }}>
                      <NodeCard fullName={hovered.full_name} photoUrl={hovered.photo_url} nodeState={hovered.node_state as 'proxy' | 'invited' | 'claimed'} isDark={isDark} />
                    </motion.div>
                  ) : (
                    <motion.div key="ghost" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'absolute', inset: 0 }}>
                      <GhostCard isDark={isDark} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          ) : (
          /* Desktop: both cards + connector side by side */
          <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>

            {/* Source card — always visible */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 24 }}
              >
                <NodeCard fullName={sourceNodeName} isDark={isDark} nodeState="proxy" />
              </motion.div>
              <span style={{ fontSize: 10, fontWeight: 600, color: '#EA580C', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Your node
              </span>
            </div>

            {/* Animated connector */}
            <MergeConnector isDark={isDark} />

            {/* Target card — ghost → real on hover */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <div style={{ width: CARD_W, height: CARD_H, position: 'relative' }}>
                <AnimatePresence mode="wait">
                  {hovered ? (
                    <motion.div
                      key={hovered.id}
                      initial={{ opacity: 0, scale: 0.88, y: 8 }}
                      animate={{ opacity: 1, scale: 1,    y: 0 }}
                      exit={{    opacity: 0, scale: 0.88, y: 8 }}
                      transition={{ type: 'spring', stiffness: 340, damping: 26 }}
                      style={{ position: 'absolute', inset: 0 }}
                    >
                      <NodeCard
                        fullName={hovered.full_name}
                        photoUrl={hovered.photo_url}
                        nodeState={hovered.node_state as 'proxy' | 'invited' | 'claimed'}
                        isDark={isDark}
                      />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="ghost"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{    opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      style={{ position: 'absolute', inset: 0 }}
                    >
                      <GhostCard isDark={isDark} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <AnimatePresence mode="wait">
                {hovered ? (
                  <motion.span
                    key="target-name"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{    opacity: 0, y: -4 }}
                    style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase',
                      color: hovered.node_state === 'claimed' ? '#C2410C' : '#D97706',
                      maxWidth: CARD_W, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  >
                    {hovered.full_name}
                  </motion.span>
                ) : (
                  <motion.span
                    key="target-hint"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{    opacity: 0 }}
                    style={{ fontSize: 10, fontWeight: 500, color: t.textMuted, letterSpacing: '0.04em' }}
                  >
                    hover to preview
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </div>
          )} {/* end desktop branch */}
        </div>

        {/* ── Search input ── */}
        <div style={{ padding: isMobile ? '14px 14px 8px' : '16px 22px 10px' }}>
          <div style={{ position: 'relative' }}>
            <IconSearch
              size={15} color={t.textMuted}
              style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
            />
            <input
              ref={inputRef}
              value={query}
              onChange={e => { setQuery(e.target.value); setTouched(true) }}
              placeholder="Search by name…"
              style={{
                width: '100%', height: 42, borderRadius: 11,
                border: `1.5px solid ${isDark ? 'rgba(255,255,255,0.11)' : 'rgba(0,0,0,0.1)'}`,
                background: isDark ? 'rgba(255,255,255,0.05)' : '#fff',
                color: t.text, fontSize: 13.5,
                padding: '0 38px 0 36px',
                outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
                transition: 'border-color 0.15s, box-shadow 0.15s',
              }}
              onFocus={e => {
                e.currentTarget.style.borderColor = '#FB923C'
                e.currentTarget.style.boxShadow  = '0 0 0 3px rgba(234,88,12,0.1)'
              }}
              onBlur={e => {
                e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.11)' : 'rgba(0,0,0,0.1)'
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
        </div>

        {/* ── Results ── */}
        <div style={{ overflowY: 'auto', padding: '2px 12px 16px', flex: 1, minHeight: 0 }}>
          <AnimatePresence>
            {results.map((r, i) => {
              const isHov = hovered?.id === r.id
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
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 14,
                    padding: '10px 12px', borderRadius: 12, textAlign: 'left',
                    border: `1.5px solid ${isHov
                      ? (isDark ? 'rgba(234,88,12,0.3)' : 'rgba(234,88,12,0.2)')
                      : 'transparent'}`,
                    background: isHov
                      ? (isDark ? 'rgba(234,88,12,0.08)' : 'rgba(234,88,12,0.05)')
                      : 'transparent',
                    cursor: 'pointer',
                    transition: 'background 0.12s, border-color 0.12s',
                  }}
                >
                  <MiniNodeCard
                    fullName={r.full_name}
                    photoUrl={r.photo_url}
                    nodeState={r.node_state as 'proxy' | 'invited' | 'claimed'}
                    isDark={isDark}
                  />

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <div style={{
                      fontSize: 13.5, fontWeight: 600, color: t.text,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      lineHeight: 1.25,
                    }}>
                      {r.full_name}
                    </div>
                    {meta.length > 0 && (
                      <div style={{
                        fontSize: 11.5,
                        color: isHov ? '#EA580C' : t.textMuted,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        lineHeight: 1.3,
                        transition: 'color 0.1s',
                      }}>
                        {meta.join(' · ')}
                      </div>
                    )}
                  </div>

                  {/* Badge */}
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

          {/* Empty state */}
          {touched && !loading && query.trim() && results.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ padding: '32px 0', textAlign: 'center' }}
            >
              <div style={{ fontSize: 30, marginBottom: 10 }}>🔍</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: t.text, marginBottom: 4 }}>No one found</div>
              <div style={{ fontSize: 12, color: t.textMuted }}>No match for "{query}" in other families</div>
            </motion.div>
          )}

          {/* Idle hint */}
          {!touched && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }}
              style={{ padding: '20px 8px 8px', textAlign: 'center' }}
            >
              <p style={{ margin: 0, fontSize: 12.5, color: t.textMuted, lineHeight: 1.8 }}>
                Search for someone from <strong style={{ color: t.text }}>another family's tree</strong>.<br />
                Hover their name to preview · click to open their tree.
              </p>
            </motion.div>
          )}
        </div>
      </motion.div>
      </div>
    </>
  )
}
