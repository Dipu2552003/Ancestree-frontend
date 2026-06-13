'use client'

// Top bar of the AddNodeWizard modal — back/close button on the left, title
// + "to <anchor>'s family" subtitle, animated step-progress dots, and a close
// X on the right. Pure presentation — all behavior comes from props.

import { motion } from 'framer-motion'
import { IconX, IconArrowLeft, IconSearch } from '@tabler/icons-react'
import { COLORS, type Theme } from '@/lib/theme'
import type { StepId } from './types'

interface WizardHeaderProps {
  isDark:         boolean
  t:              Theme
  title:          string          // e.g. "Add Father"
  anchorName:     string
  stepIdx:        number
  steps:          StepId[]
  onBack:         () => void      // called instead of onClose when stepIdx > 0
  onClose:        () => void
  isSearchMode?:  boolean
  onToggleSearch?: () => void     // switches between add and search mode
}

export default function WizardHeader({
  isDark, t, title, anchorName, stepIdx, steps, onBack, onClose,
  isSearchMode = false, onToggleSearch,
}: WizardHeaderProps) {
  const iconBtn: React.CSSProperties = {
    width: 32, height: 32, borderRadius: 9, flexShrink: 0, border: 'none', cursor: 'pointer',
    background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)', color: t.textMuted,
    display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.12s',
  }
  const hoverIn  = (e: React.MouseEvent<HTMLButtonElement>) =>
    (e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.12)')
  const hoverOut = (e: React.MouseEvent<HTMLButtonElement>) =>
    (e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)')

  // In search mode the left button always goes back to add mode (never closes directly).
  const leftAction = isSearchMode ? onToggleSearch! : (stepIdx === 0 ? onClose : onBack)
  const leftIcon   = isSearchMode || stepIdx > 0 ? <IconArrowLeft size={14} /> : <IconX size={14} />

  const searchBtnBg = isSearchMode
    ? isDark ? 'rgba(234,88,12,0.25)' : 'rgba(234,88,12,0.14)'
    : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)'

  return (
    <div style={{
      padding: '16px 20px 14px',
      borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}`,
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <button onClick={leftAction} style={iconBtn} onMouseEnter={hoverIn} onMouseLeave={hoverOut}>
        {leftIcon}
      </button>

      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: t.text, lineHeight: 1.2 }}>
          {isSearchMode ? 'Search People' : title}
        </div>
        <div style={{ fontSize: 11, color: t.textMuted, marginTop: 2 }}>
          {isSearchMode
            ? 'Find an existing person to link'
            : <>to <span style={{ color: COLORS.saffron, fontWeight: 600 }}>{anchorName}</span>&apos;s family</>
          }
        </div>
      </div>

      {/* Step dots — hidden in search mode */}
      {!isSearchMode && (
        <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
          {steps.map((_, i) => (
            <motion.div key={i}
              animate={{
                width: i === stepIdx ? 18 : 6,
                background: i <= stepIdx ? COLORS.saffron : isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.10)',
              }}
              transition={{ duration: 0.22 }}
              style={{ height: 5, borderRadius: 3 }}
            />
          ))}
        </div>
      )}

      {/* Search toggle — only shown when onToggleSearch is provided */}
      {onToggleSearch && (
        <button
          onClick={isSearchMode ? undefined : onToggleSearch}
          title={isSearchMode ? 'Searching' : 'Search existing people'}
          style={{
            ...iconBtn,
            background: searchBtnBg,
            color: isSearchMode ? COLORS.saffron : t.textMuted,
            cursor: isSearchMode ? 'default' : 'pointer',
          }}
          onMouseEnter={isSearchMode ? undefined : hoverIn}
          onMouseLeave={isSearchMode ? undefined : hoverOut}
        >
          <IconSearch size={14} />
        </button>
      )}

      <button onClick={onClose} style={iconBtn} onMouseEnter={hoverIn} onMouseLeave={hoverOut}>
        <IconX size={14} />
      </button>
    </div>
  )
}
