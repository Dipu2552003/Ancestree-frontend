'use client'

// SectionHeader — labelled strip that introduces a form section. When given a
// `sectionKey`, it becomes a button that collapses/expands the section and
// shows a count badge of filled fields while collapsed. Without a sectionKey
// it renders as a static label (used for Identity / Birth & Death which are
// always open).

import { motion } from 'framer-motion'
import { IconChevronDown } from '@tabler/icons-react'
import { getTheme } from '@/lib/theme'
import type { Draft } from './draft'

export type SectionKey = 'contact' | 'currentLocation' | 'nativeOrigin' | 'workEducation'

interface SectionHeaderProps {
  title:     string
  isDark:    boolean
  sectionKey?: SectionKey
  isOpen?:    boolean
  // Counted while collapsed to display a small "n filled" badge.
  fields?:    (keyof Draft)[]
  draft?:     Draft
  onToggle?:  () => void
}

export default function SectionHeader({
  title, isDark, sectionKey, isOpen = true, fields, draft, onToggle,
}: SectionHeaderProps) {
  const t = getTheme(isDark)
  const filled = (fields && draft && !isOpen)
    ? fields.filter(k => Boolean(draft[k])).length
    : 0

  const baseStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: '8px',
    padding: '10px 16px 8px',
    borderTop: `1px solid ${t.border}`,
    background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)',
    marginTop: '4px',
    userSelect: 'none',
    fontFamily: 'inherit',
    textAlign: 'left',
  }

  const inner = (
    <>
      <div style={{
        width: '2px', height: '12px', borderRadius: '1px', flexShrink: 0,
        background: isDark ? 'rgba(234,88,12,0.45)' : 'rgba(234,88,12,0.35)',
      }} />
      <span style={{
        flex: 1, fontSize: '10px', fontWeight: 700,
        letterSpacing: '0.10em', textTransform: 'uppercase' as const,
        color: isDark ? 'rgba(237,232,227,0.60)' : 'rgba(26,10,0,0.50)',
      }}>
        {title}
      </span>
      {sectionKey && !isOpen && filled > 0 && (
        <span style={{
          fontSize: '9px', fontWeight: 700, color: '#EA580C',
          background: isDark ? 'rgba(234,88,12,0.15)' : 'rgba(234,88,12,0.10)',
          padding: '1px 7px', borderRadius: '10px',
        }}>
          {filled}
        </span>
      )}
      {sectionKey && (
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          style={{ display: 'flex', color: isDark ? '#4A3F35' : '#C4A882', lineHeight: 0 }}
        >
          <IconChevronDown size={13} strokeWidth={2} />
        </motion.span>
      )}
    </>
  )

  if (!sectionKey) {
    return <div style={baseStyle}>{inner}</div>
  }
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={isOpen}
      style={{ ...baseStyle, width: '100%', cursor: 'pointer', border: 'none' }}
    >
      {inner}
    </button>
  )
}
