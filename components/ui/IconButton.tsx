'use client'

// IconButton — the rounded, theme-aware toggle button used across the HUD.
//
// Standardises the bell / theme toggle / profile cluster styling so all three
// stay in sync. Supports an optional notification badge (the orange dot/count
// shown on the bell).
//
// Sizing variants follow the existing HUD convention: desktop = 38×38,
// mobile = 44×44. Pass `size="mobile"` to opt in to the larger touch target.

import type { ReactNode } from 'react'
import { getTheme } from '@/lib/theme'

export type IconButtonSize = 'desktop' | 'mobile'

export interface IconButtonProps {
  children:  ReactNode
  isDark:    boolean
  size?:     IconButtonSize
  title?:    string
  onClick?:  () => void
  /** Optional unread/notification count shown as a corner badge. 0 = hidden. */
  badge?:    number
}

export function IconButton({ children, isDark, size = 'desktop', title, onClick, badge = 0 }: IconButtonProps) {
  const t = getTheme(isDark)
  const px = size === 'mobile' ? 44 : 38

  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        position: 'relative',
        width: px, height: px, borderRadius: 8,
        background: t.toggleBg, color: t.toggleColor,
        border: `1.5px solid ${t.toggleBorder}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer',
        boxShadow: isDark ? '0 2px 12px rgba(0,0,0,0.5)' : '0 2px 8px rgba(0,0,0,0.12)',
        transition: 'background 0.3s, color 0.3s',
      }}
    >
      {children}
      {badge > 0 && (
        <span style={{
          position: 'absolute', top: -4, right: -4,
          background: 'var(--c-primary)', color: '#fff',
          borderRadius: 999, fontSize: 9, fontWeight: 700,
          minWidth: 16, height: 16,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '0 3px', lineHeight: 1,
        }}>
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </button>
  )
}
