'use client'

import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react'
import { Spinner } from './Spinner'

/** Filled CTA gradients used across the app. Ghost/outline buttons usually
 *  need to pull theme tokens at the call site, so they take a `style`
 *  override rather than baking colours in here. */
const VARIANTS = {
  primary: { bg: 'linear-gradient(135deg, var(--c-primary), var(--c-primary-strong))', fg: '#fff', shadow: '0 2px 8px rgb(var(--c-primary-rgb) / 0.30)', border: 'none' },
  success: { bg: 'linear-gradient(135deg, #22C55E, #16A34A)', fg: '#fff', shadow: '0 2px 8px rgba(34,197,94,0.30)', border: 'none' },
  warning: { bg: 'linear-gradient(135deg, #F59E0B, var(--c-secondary))', fg: '#fff', shadow: '0 2px 8px rgba(245,158,11,0.30)', border: 'none' },
  danger:  { bg: 'linear-gradient(135deg, #EF4444, #DC2626)', fg: '#fff', shadow: '0 2px 8px rgba(239,68,68,0.30)', border: 'none' },
  /** Border + transparent bg — caller overrides borderColor / color via style
   *  to pick up the active theme. */
  ghost:   { bg: 'transparent', fg: 'currentColor', shadow: 'none', border: '1.5px solid currentColor' },
} as const

export type ButtonVariant = keyof typeof VARIANTS

const SIZES = {
  sm: { h: 30, px: 12, fs: 11.5, gap: 5, radius: 8  },
  md: { h: 38, px: 16, fs: 12.5, gap: 6, radius: 10 },
  lg: { h: 42, px: 22, fs: 13,   gap: 7, radius: 11 },
} as const

export type ButtonSize = keyof typeof SIZES

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:   ButtonVariant
  size?:      ButtonSize
  leftIcon?:  ReactNode
  rightIcon?: ReactNode
  loading?:   boolean
  /** When true, button stretches to fill its container. */
  full?:      boolean
}

export function Button({
  variant = 'primary', size = 'md',
  leftIcon, rightIcon, loading = false, full = false,
  disabled, children, style, type = 'button', ...rest
}: ButtonProps) {
  const v = VARIANTS[variant]
  const s = SIZES[size]
  const isDisabled = disabled || loading

  const merged: CSSProperties = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    gap: s.gap,
    height: s.h, padding: `0 ${s.px}px`, borderRadius: s.radius,
    border: v.border, background: v.bg, color: v.fg,
    fontSize: s.fs, fontWeight: 600, fontFamily: 'inherit',
    boxShadow: v.shadow,
    cursor: isDisabled ? 'default' : 'pointer',
    opacity: isDisabled ? 0.7 : 1,
    width: full ? '100%' : undefined,
    transition: 'opacity 0.15s',
    ...style,
  }

  return (
    <button type={type} disabled={isDisabled} style={merged} {...rest}>
      {loading ? <Spinner size={Math.round(s.fs * 1.05)} /> : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  )
}
