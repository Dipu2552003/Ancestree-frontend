'use client'

import { IconArrowLeft, IconEye } from '@tabler/icons-react'
import { getTheme } from '@/lib/theme'

interface PerspectiveBannerProps {
  personName: string
  onBack: () => void
  isDark: boolean
}

export default function PerspectiveBanner({ personName, onBack, isDark }: PerspectiveBannerProps) {
  const t = getTheme(isDark)

  const bg     = isDark ? 'rgba(26,20,16,0.92)' : 'rgba(255,247,237,0.92)'
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(234,88,12,0.18)'
  const text   = isDark ? '#E8DDD4' : '#7C3100'
  const accent = '#EA580C'

  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0, zIndex: 40,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 18px',
      background: bg,
      borderBottom: `1px solid ${border}`,
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <IconEye size={15} color={accent} />
        <span style={{ fontSize: '13px', fontWeight: 500, color: text }}>
          Viewing{' '}
          <span style={{ fontWeight: 700, color: accent }}>{personName}</span>
          {"'s family tree"}
        </span>
      </div>

      <button
        onClick={onBack}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '5px 12px', borderRadius: '6px',
          background: isDark ? 'rgba(234,88,12,0.15)' : 'rgba(234,88,12,0.10)',
          border: `1px solid ${isDark ? 'rgba(234,88,12,0.3)' : 'rgba(234,88,12,0.25)'}`,
          color: accent, fontSize: '12px', fontWeight: 600,
          cursor: 'pointer', transition: 'background 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = isDark ? 'rgba(234,88,12,0.25)' : 'rgba(234,88,12,0.18)')}
        onMouseLeave={e => (e.currentTarget.style.background = isDark ? 'rgba(234,88,12,0.15)' : 'rgba(234,88,12,0.10)')}
      >
        <IconArrowLeft size={13} />
        Back to my tree
      </button>
    </div>
  )
}
