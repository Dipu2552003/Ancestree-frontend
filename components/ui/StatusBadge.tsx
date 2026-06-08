'use client'

import type { ReactNode } from 'react'

const STATUSES = {
  proposed:  { label: 'Pending',  bg: 'rgba(234,179,8,0.12)',   color: '#B45309', dot: '#F59E0B' },
  confirmed: { label: 'Accepted', bg: 'rgba(34,197,94,0.12)',   color: '#15803D', dot: '#22C55E' },
  rejected:  { label: 'Rejected', bg: 'rgba(239,68,68,0.10)',   color: '#B91C1C', dot: '#EF4444' },
  reversed:  { label: 'Reversed', bg: 'rgba(107,114,128,0.10)', color: '#4B5563', dot: '#9CA3AF' },
} as const

export type Status = keyof typeof STATUSES

export interface StatusBadgeProps {
  status:  Status
  /** Override the default label (e.g. "Sent" instead of "Pending"). */
  label?:  ReactNode
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const cfg = STATUSES[status]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 9px', borderRadius: 999,
      background: cfg.bg, color: cfg.color,
      fontSize: 10.5, fontWeight: 700, whiteSpace: 'nowrap',
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%',
        background: cfg.dot, display: 'inline-block', flexShrink: 0,
      }} />
      {label ?? cfg.label}
    </span>
  )
}
