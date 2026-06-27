'use client'

// Final wizard step — a summary of the person about to be added, plus an
// OPT-IN duplicate search. The search is off by default; only when the user
// ticks the box do we look for possible matches (same family AND other
// families) and surface them inline, so the old "modal appears out of nowhere
// after adding" never happens.

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { IconLoader2, IconCheck, IconSearch, IconArrowRight } from '@tabler/icons-react'
import { api, type SearchResult } from '@/lib/api'
import { COLORS, type Theme } from '@/lib/theme'
import type { RelAction } from '@/components/graph/Navbar'
import { slide } from '../helpers'
import type { WizardStyles } from '../styles'
import { MiniNodeCard, searchMetaPieces } from '@/components/graph/NodeCard'
import { getInitials } from '@/lib/format/initials'

interface StepReviewProps {
  dir:            number
  isDark:         boolean
  t:              Theme
  styles:         WizardStyles
  relAction:      RelAction
  relLabel:       string
  anchorName:     string
  fullName:       string
  gender:         string
  gotra?:         string
  birthDate?:     string | null
  photoUrl?:      string
  saving:         boolean
  saved:          boolean
  onCreate:       () => void
  onAddForMerge?: (action: RelAction, match: SearchResult) => Promise<void>
  onViewExisting?: (personId: string) => void
}

export default function StepReview({
  dir, isDark, t, styles,
  relAction, relLabel, anchorName, fullName, gender, gotra, birthDate, photoUrl,
  saving, saved,
  onCreate, onAddForMerge, onViewExisting,
}: StepReviewProps) {
  const [doSearch, setDoSearch] = useState(false)
  const [results,  setResults]  = useState<SearchResult[]>([])
  const [loading,  setLoading]  = useState(false)
  const [searched, setSearched] = useState(false)
  const [busyId,   setBusyId]   = useState<string | null>(null)

  // Run the search only once the box is ticked. Debounced lightly so the cold
  // backend isn't hit on the very first paint of the toggle.
  useEffect(() => {
    if (!doSearch || !fullName.trim()) { setResults([]); setSearched(false); return }
    setLoading(true)
    const id = setTimeout(() => {
      api.search.persons(fullName.trim(), 'all')
        .then(({ results: r }) => setResults(r))
        .catch(() => setResults([]))
        .finally(() => { setLoading(false); setSearched(true) })
    }, 150)
    return () => clearTimeout(id)
  }, [doSearch, fullName])

  const genderLabel = gender === 'male' ? 'Male' : gender === 'female' ? 'Female' : null
  const relationLine = [
    relLabel && anchorName ? `${relLabel} of ${anchorName}` : relLabel,
    genderLabel,
  ].filter(Boolean).join('  ·  ')

  // Name / Gotra / Birthdate review rows — only the ones we actually have.
  const detailRows: [string, string][] = [
    ['Name', fullName || 'Unknown'],
    ...(gotra ? [['Gotra', gotra]] as [string, string][] : []),
    ...(birthDate ? [['Born', birthDate]] as [string, string][] : []),
  ]

  const handleMerge = async (r: SearchResult) => {
    if (!onAddForMerge || busyId) return
    setBusyId(r.id)
    try { await onAddForMerge(relAction, r) }
    catch { setBusyId(null) }
  }

  const primaryLabel = saving ? 'Adding…' : saved ? 'Added!'
    : results.length > 0 ? '✓ Add as a new person' : '✓ Add to family tree'

  return (
    <motion.div key="review" custom={dir} variants={slide} initial="enter" animate="center" exit="exit"
      transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
      style={{ padding: '24px 28px 26px', display: 'flex', flexDirection: 'column', gap: 16 }}>

      <div>
        <h2 style={{ margin: 0, fontSize: 19, fontWeight: 700, color: t.text, letterSpacing: '-0.01em', lineHeight: 1.2 }}>
          Review &amp; add
        </h2>
        <p style={{ margin: '5px 0 0', fontSize: 12.5, color: t.textMuted }}>
          Check the details before adding to the tree.
        </p>
      </div>

      {/* Summary card — photo top-left, then Name / Gotra / Birthdate as review
          rows, with the relation we're adding underneath. */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: 14, padding: '14px',
        borderRadius: 14,
        border: `1.5px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
        background: isDark ? 'rgba(255,255,255,0.02)' : '#FFFAF5',
      }}>
        {/* Photo / avatar */}
        <div style={{
          width: 66, height: 66, borderRadius: 12, flexShrink: 0, overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: photoUrl ? 'transparent' : (isDark ? '#2A211B' : '#FDE8CC'),
        }}>
          {photoUrl ? (
            <img src={photoUrl} alt={fullName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{
              width: 52, height: 52, borderRadius: '50%',
              backgroundImage: `linear-gradient(135deg, ${COLORS.saffron}, ${COLORS.terracotta})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 17, fontWeight: 600, letterSpacing: '0.03em',
            }}>
              {getInitials(fullName || 'Unknown')}
            </div>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
          {detailRows.map(([label, value]) => (
            <div key={label} style={{ display: 'flex', gap: 8, fontSize: 12.5, lineHeight: 1.3 }}>
              <span style={{ width: 48, flexShrink: 0, color: t.textMuted, fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', paddingTop: 1 }}>
                {label}
              </span>
              <span style={{
                color: t.text, fontWeight: label === 'Name' ? 700 : 500,
                fontSize: label === 'Name' ? 15 : 13,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0,
              }}>
                {value}
              </span>
            </div>
          ))}

          {relationLine && (
            <div style={{
              marginTop: 4, paddingTop: 7,
              borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}`,
              fontSize: 12, fontWeight: 600, color: COLORS.saffron,
            }}>
              {relationLine}
            </div>
          )}
        </div>
      </div>

      {/* Opt-in duplicate search */}
      <label style={{
        display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer',
        padding: '11px 13px', borderRadius: 12,
        border: `1.5px solid ${doSearch ? COLORS.saffron : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.09)'}`,
        background: doSearch ? (isDark ? 'rgb(var(--c-primary-rgb) / 0.10)' : 'rgb(var(--c-primary-rgb) / 0.06)') : 'transparent',
        transition: 'border-color 0.15s, background 0.15s',
      }}>
        <input type="checkbox" checked={doSearch} onChange={e => setDoSearch(e.target.checked)}
          style={{ marginTop: 2, width: 16, height: 16, accentColor: COLORS.saffron, cursor: 'pointer' }} />
        <span style={{ fontSize: 12.5, color: t.text, lineHeight: 1.45 }}>
          <strong style={{ fontWeight: 600 }}>Search if this person already exists</strong>
          <span style={{ display: 'block', color: t.textMuted, fontSize: 11.5, marginTop: 1 }}>
            Off by default. Check to look across your family and other families before adding.
          </span>
        </span>
      </label>

      {/* Search results — only when opted in */}
      <AnimatePresence>
        {doSearch && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden' }}
          >
            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', padding: '14px 0', color: t.textMuted, fontSize: 12.5 }}>
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}>
                  <IconLoader2 size={15} />
                </motion.div>
                Searching…
              </div>
            )}

            {!loading && searched && results.length === 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', padding: '12px 0', color: t.textMuted, fontSize: 12.5 }}>
                <IconSearch size={14} /> No existing match found — safe to add.
              </div>
            )}

            <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {results.map(r => {
                const meta = searchMetaPieces(r)
                const busy = busyId === r.id
                return (
                  <div key={r.id} style={{
                    display: 'flex', alignItems: 'center', gap: 11, padding: '8px 10px', borderRadius: 11,
                    border: `1.5px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}`,
                  }}>
                    <MiniNodeCard fullName={r.full_name} photoUrl={r.photo_url}
                      nodeState={r.node_state as 'proxy' | 'invited' | 'claimed'} isDark={isDark} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: t.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {r.full_name}
                      </div>
                      {meta.length > 0 && (
                        <div style={{ fontSize: 11, color: t.textMuted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {meta.join(' · ')}
                        </div>
                      )}
                      <div style={{ fontSize: 10.5, fontWeight: 500, marginTop: 1, color: r.is_own_family ? COLORS.saffron : t.textMuted }}>
                        {r.is_own_family ? 'In your family' : r.family_name}
                      </div>
                    </div>

                    {r.is_own_family ? (
                      onViewExisting && (
                        <button onClick={() => onViewExisting(r.id)} disabled={!!busyId}
                          style={reviewActionBtn(isDark, false)}>
                          View <IconArrowRight size={13} />
                        </button>
                      )
                    ) : (
                      onAddForMerge && (
                        <button onClick={() => handleMerge(r)} disabled={!!busyId}
                          style={reviewActionBtn(isDark, true)}>
                          {busy ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}><IconLoader2 size={13} /></motion.div> : null}
                          {busy ? 'Sending…' : 'Send merge request'}
                        </button>
                      )
                    )}
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button onClick={onCreate} disabled={saving || saved || !!busyId}
        whileHover={!saving && !saved ? { scale: 1.015 } : {}}
        whileTap={!saving && !saved ? { scale: 0.98 } : {}}
        style={styles.btnPrimary}>
        {saving && <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}><IconLoader2 size={15} /></motion.div>}
        {saved  && <IconCheck size={15} strokeWidth={2.5} />}
        {primaryLabel}
      </motion.button>
    </motion.div>
  )
}

function reviewActionBtn(isDark: boolean, filled: boolean): React.CSSProperties {
  return {
    flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: '6px 10px', borderRadius: 9, cursor: 'pointer', fontFamily: 'inherit',
    fontSize: 11.5, fontWeight: 600, whiteSpace: 'nowrap',
    border: `1.5px solid ${filled ? COLORS.saffron : isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.12)'}`,
    background: filled ? COLORS.saffron : 'transparent',
    color: filled ? '#fff' : isDark ? '#E5E5E5' : '#374151',
  }
}
