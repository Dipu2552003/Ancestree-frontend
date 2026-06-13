'use client'

// GotraToggle — compact floating button that opens a panel for choosing
// the gotra highlight mode: Off / Node / Edge.
//
// Design rules:
//   • Off   — no gotra highlight; graph shows default state colors
//   • Node  — each person's avatar + border reflects their gotra color
//   • Edge  — PARENT_OF edges (and family brackets) reflect the parent's gotra color
//
// Adding new gotras: edit lib/familyOptions.json — no code changes needed here.

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGraphStore, type GotraMode } from '@/store/graphStore'
import { GOTRA_PALETTE } from '@/lib/graph/gotraColors'
import { getTheme } from '@/lib/theme'

const MODES: { value: GotraMode; label: string }[] = [
  { value: 'none', label: 'Off'   },
  { value: 'node', label: 'Node'  },
  { value: 'edge', label: 'Edge'  },
]

interface Props {
  isDark:   boolean
  isMobile: boolean
}

export default function GotraToggle({ isDark, isMobile }: Props) {
  const gotraMode    = useGraphStore(s => s.gotraMode)
  const setGotraMode = useGraphStore(s => s.setGotraMode)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const t   = getTheme(isDark)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const isActive = gotraMode !== 'none'
  const btnSize  = isMobile ? 34 : 32

  // Active mode label shown in button
  const modeLabel: Record<GotraMode, string> = { none: '', node: 'N', edge: 'E' }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(v => !v)}
        title="Gotra highlight"
        style={{
          width:  btnSize, height: btnSize,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: '8px',
          border: isActive
            ? `1.5px solid ${isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.18)'}`
            : `1px solid ${t.controlBorder}`,
          background: isActive
            ? (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)')
            : t.controlBg,
          cursor: 'pointer',
          gap: 3,
          flexDirection: 'column' as const,
          position: 'relative',
          transition: 'background 0.15s, border-color 0.15s',
        }}
      >
        {/* DNA / gotra icon — 3 stacked circles (simplified gotra symbol) */}
        <GotraIcon isDark={isDark} active={isActive} />
        {isActive && (
          <span style={{
            position: 'absolute', bottom: 3, right: 4,
            fontSize: '7px', fontWeight: 700, letterSpacing: '0.04em',
            color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.55)',
            lineHeight: 1,
          }}>
            {modeLabel[gotraMode]}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0,  scale: 1    }}
            exit={{    opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.14 }}
            style={{
              position: 'absolute',
              top: btnSize + 6,
              right: 0,
              width: 196,
              background: t.panelBg,
              border: `1px solid ${t.border}`,
              borderRadius: '10px',
              boxShadow: t.shadow,
              padding: '12px',
              zIndex: 200,
            }}
          >
            {/* Header */}
            <div style={{
              fontSize: '9px', fontWeight: 700, letterSpacing: '0.1em',
              textTransform: 'uppercase' as const,
              color: t.textMuted,
              marginBottom: 8,
            }}>
              Gotra Highlight
            </div>

            {/* Mode segmented control */}
            <div style={{
              display: 'flex', gap: 4,
              background: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.05)',
              padding: '3px',
              borderRadius: '7px',
              marginBottom: 10,
            }}>
              {MODES.map(m => {
                const active = gotraMode === m.value
                return (
                  <button
                    key={m.value}
                    onClick={() => { setGotraMode(m.value); if (m.value === 'none') setOpen(false) }}
                    style={{
                      flex: 1,
                      height: 26,
                      borderRadius: '5px',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '11px',
                      fontWeight: active ? 600 : 400,
                      background: active
                        ? (isDark ? 'rgba(255,255,255,0.12)' : '#FFFFFF')
                        : 'transparent',
                      color: active ? t.text : t.textMuted,
                      boxShadow: active
                        ? (isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.10)')
                        : 'none',
                      transition: 'background 0.12s, color 0.12s',
                    }}
                  >
                    {m.label}
                  </button>
                )
              })}
            </div>

            {/* Rule hint */}
            {gotraMode !== 'none' && (
              <div style={{
                fontSize: '10px',
                color: t.textMuted,
                marginBottom: 8,
                lineHeight: 1.45,
              }}>
                {gotraMode === 'node'
                  ? 'Each person\'s avatar reflects their gotra color.'
                  : 'Parent-to-child lines reflect the parent\'s gotra color.'}
              </div>
            )}

            {/* Gotra legend */}
            {gotraMode !== 'none' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {GOTRA_PALETTE.map(g => (
                  <div key={g.name} style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                  }}>
                    <div style={{
                      width: 10, height: 10,
                      borderRadius: '50%',
                      background: g.color,
                      flexShrink: 0,
                      boxShadow: `0 0 0 2px ${g.color}33`,
                    }} />
                    <span style={{
                      fontSize: '11px',
                      color: t.text,
                      fontWeight: 500,
                    }}>
                      {g.name}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function GotraIcon({ isDark, active }: { isDark: boolean; active: boolean }) {
  const color = active
    ? (isDark ? '#EDE8E3' : '#1A0A00')
    : (isDark ? '#7A6A52' : '#9A6C3C')
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      {/* Simple stylised "lotus / gotra" symbol: 3 arcs */}
      <circle cx="7.5" cy="4"   r="2.2" stroke={color} strokeWidth="1.4" fill="none" />
      <circle cx="4"   cy="10"  r="2.2" stroke={color} strokeWidth="1.4" fill="none" />
      <circle cx="11"  cy="10"  r="2.2" stroke={color} strokeWidth="1.4" fill="none" />
      <line x1="7.5" y1="6.2" x2="5.4" y2="7.8"  stroke={color} strokeWidth="1.1" strokeLinecap="round" />
      <line x1="7.5" y1="6.2" x2="9.6" y2="7.8"  stroke={color} strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  )
}
