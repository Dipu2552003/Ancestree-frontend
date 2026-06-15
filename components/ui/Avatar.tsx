'use client'

import type { CSSProperties } from 'react'
import { getInitials } from '@/lib/format/initials'

const GRADIENTS = {
  saffron:    ['var(--c-primary)', 'var(--c-primary-strong)'],  // self / primary CTA
  terracotta: ['var(--c-primary-strong)', 'var(--c-primary-deep)'],  // claimed members
  marigold:   ['var(--c-secondary)', 'var(--c-primary)'],  // proxy / invited
  slate:      ['#94A3B8', '#64748B'],  // deceased
  success:    ['#22C55E', '#16A34A'],  // newly-added in a merge preview
  neutral:    ['#C4A882', '#9A7B5A'],  // placeholder / empty
} as const

export type AvatarGradient = keyof typeof GRADIENTS

export interface AvatarProps {
  name:       string
  photoUrl?:  string | null
  size?:      number
  gradient?:  AvatarGradient
  /** Ring style around the avatar: 'soft' (default drop shadow),
   *  'highlight' (green focus ring used in merge previews), 'none'. */
  ring?:      'soft' | 'highlight' | 'none'
  shape?:     'circle' | 'rounded'
  style?:     CSSProperties
  className?: string
}

export function Avatar({
  name, photoUrl, size = 40,
  gradient = 'saffron', ring = 'soft', shape = 'circle',
  style, className,
}: AvatarProps) {
  const [from, to] = GRADIENTS[gradient]
  const radius = shape === 'circle' ? '50%' : `${Math.max(8, Math.round(size * 0.18))}px`

  const boxShadow =
    ring === 'highlight' ? '0 0 0 2px #22C55E, 0 4px 12px rgba(34,197,94,0.30)' :
    ring === 'none'      ? 'none' :
                           '0 2px 6px rgba(0,0,0,0.15)'

  const base: CSSProperties = {
    width: size, height: size, borderRadius: radius,
    flexShrink: 0, boxShadow,
    ...style,
  }

  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoUrl} alt={name}
        className={className}
        style={{ ...base, objectFit: 'cover' }}
      />
    )
  }

  return (
    <div
      className={className}
      style={{
        ...base,
        background: `linear-gradient(135deg, ${from}, ${to})`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontWeight: 700,
        fontSize: Math.round(size * 0.36),
        lineHeight: 1,
      }}
    >
      {getInitials(name)}
    </div>
  )
}

/** Resolves the canonical avatar gradient for a person, matching the
 *  rule used by PersonNode / CoupleNode / CollapsedCoupleNode. */
export function personAvatarGradient(p: {
  isSelf?:     boolean
  isDeceased?: boolean
  nodeState?:  string
}): AvatarGradient {
  if (p.isSelf)                  return 'saffron'
  if (p.isDeceased)              return 'slate'
  if (p.nodeState === 'claimed') return 'terracotta'
  return 'marigold'
}
