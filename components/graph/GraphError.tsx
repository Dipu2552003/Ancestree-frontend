'use client'

// Full-screen error state shown when the family graph fails to load (e.g. the
// backend cold start timed out). First failure offers a "Try again"; a second
// failure tells the user to reach out to the admin.

import { IconRefresh, IconAlertTriangle } from '@tabler/icons-react'
import { getTheme } from '@/lib/theme'

interface GraphErrorProps {
  isDark: boolean
  /** Number of consecutive failed load attempts. */
  attempts: number
  onRetry: () => void
}

export default function GraphError({ isDark, attempts, onRetry }: GraphErrorProps) {
  const t = getTheme(isDark)
  const exhausted = attempts >= 2

  return (
    <div style={{
      height: '100vh', background: t.pageBg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      transition: 'background 0.4s', padding: '0 24px',
    }}>
      <div style={{ textAlign: 'center', maxWidth: 380 }}>
        <div style={{
          width: 48, height: 48, borderRadius: '50%', margin: '0 auto 18px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgb(var(--c-primary-rgb) / 0.10)',
        }}>
          <IconAlertTriangle size={24} color="var(--c-primary)" />
        </div>

        <h2 style={{
          margin: '0 0 8px', fontSize: 17, fontWeight: 700, color: t.text,
          letterSpacing: '-0.01em',
        }}>
          {exhausted ? 'It seems something is wrong' : 'This is taking longer than usual'}
        </h2>

        <p style={{ margin: '0 0 22px', fontSize: 13.5, color: t.textMuted, lineHeight: 1.6 }}>
          {exhausted
            ? 'We still couldn’t reach the server. Please reach out to the admin so we can look into it.'
            : 'The server may be waking up after being idle. Give it a moment, then try again.'}
        </p>

        <button
          onClick={onRetry}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            height: 44, padding: '0 22px', borderRadius: 12, border: 'none',
            background: 'linear-gradient(135deg, var(--c-primary) 0%, var(--c-primary-strong) 100%)',
            color: '#fff', fontSize: 14, fontWeight: 700, fontFamily: 'inherit',
            cursor: 'pointer', boxShadow: '0 3px 14px rgb(var(--c-primary-rgb) / 0.40)',
          }}
        >
          <IconRefresh size={16} strokeWidth={2.5} />
          Try again
        </button>
      </div>
    </div>
  )
}
