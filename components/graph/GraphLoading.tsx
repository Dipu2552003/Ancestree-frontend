'use client'

// Full-screen loading state shown while the family graph is being fetched.
// Shows a live elapsed timer beside the spinner so users understand a slow
// first load (Render cold start) is expected and worth waiting out.

import { getTheme } from '@/lib/theme'
import { useElapsedSeconds } from '@/hooks/useElapsedSeconds'

interface GraphLoadingProps {
  isDark: boolean
}

// After this many seconds we surface the "waking the server" hint so the wait
// feels intentional rather than broken.
const COLD_START_HINT_AFTER = 5

export default function GraphLoading({ isDark }: GraphLoadingProps) {
  const t = getTheme(isDark)
  const seconds = useElapsedSeconds(true)
  const slow = seconds >= COLD_START_HINT_AFTER

  return (
    <div style={{
      height: '100vh', background: t.pageBg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      transition: 'background 0.4s', padding: '0 24px',
    }}>
      <div style={{ textAlign: 'center', maxWidth: 360 }}>
        <div style={{
          width: '40px', height: '40px', borderRadius: '50%',
          border: '3px solid var(--c-tint)', borderTopColor: 'var(--c-primary)',
          animation: 'spin 0.8s linear infinite', margin: '0 auto 16px',
        }} />

        <p style={{
          color: '#9A6C3C', fontSize: '14px', margin: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          Loading your family tree…
          <span style={{
            fontVariantNumeric: 'tabular-nums',
            fontWeight: 600, color: 'var(--c-primary)',
            minWidth: 32, textAlign: 'left',
          }}>
            {seconds}s
          </span>
        </p>

        {slow && (
          <p style={{
            color: t.textMuted, fontSize: '12.5px', margin: '10px 0 0',
            lineHeight: 1.5, animation: 'fadeIn 0.4s ease',
          }}>
            Waking up the server — the first load after a quiet spell can take up
            to a minute. Hang tight…
          </p>
        )}
      </div>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
      `}</style>
    </div>
  )
}
