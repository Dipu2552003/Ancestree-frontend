'use client'

// Full-screen loading state shown while the family graph is being fetched.

import { getTheme } from '@/lib/theme'

interface GraphLoadingProps {
  isDark: boolean
}

export default function GraphLoading({ isDark }: GraphLoadingProps) {
  const t = getTheme(isDark)
  return (
    <div style={{
      height: '100vh', background: t.pageBg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      transition: 'background 0.4s',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: '40px', height: '40px', borderRadius: '50%',
          border: '3px solid var(--c-tint)', borderTopColor: 'var(--c-primary)',
          animation: 'spin 0.8s linear infinite', margin: '0 auto 16px',
        }} />
        <p style={{ color: '#9A6C3C', fontSize: '14px', margin: 0 }}>
          Loading your family tree…
        </p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
