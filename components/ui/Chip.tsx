'use client'

import type { CSSProperties, ReactNode } from 'react'

const TONES = {
  saffron: { fg: '#EA580C', bg: 'rgba(234,88,12,0.08)',  border: 'rgba(234,88,12,0.20)' },
  success: { fg: '#15803D', bg: 'rgba(34,197,94,0.08)',  border: 'rgba(34,197,94,0.20)' },
  warning: { fg: '#B45309', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.20)' },
  danger:  { fg: '#B91C1C', bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.20)' },
  neutral: { fg: '#4B5563', bg: 'rgba(107,114,128,0.08)',border: 'rgba(107,114,128,0.20)' },
} as const

export type ChipTone = keyof typeof TONES

export interface ChipProps {
  tone?:     ChipTone
  size?:     'sm' | 'md'
  style?:    CSSProperties
  children:  ReactNode
}

export function Chip({ tone = 'saffron', size = 'sm', style, children }: ChipProps) {
  const t = TONES[tone]
  const dims = size === 'sm'
    ? { fs: 10,   pad: '2px 8px',  radius: 6 }
    : { fs: 11.5, pad: '3px 10px', radius: 7 }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: dims.pad, borderRadius: dims.radius,
      fontSize: dims.fs, fontWeight: 600,
      color: t.fg, background: t.bg, border: `1px solid ${t.border}`,
      ...style,
    }}>
      {children}
    </span>
  )
}
