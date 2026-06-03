'use client'

import { IconEye, IconGitMerge } from '@tabler/icons-react'
import { getTheme } from '@/lib/theme'

interface ExplorationBannerProps {
  mode:                'explore' | 'review'
  familyName:          string
  personName:          string
  canonicalPersonName?: string
  isDark:              boolean
}

export default function ExplorationBanner({ mode, familyName, personName, canonicalPersonName, isDark }: ExplorationBannerProps) {
  const bg     = isDark ? 'rgba(26,20,16,0.95)' : 'rgba(255,247,237,0.95)'
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(234,88,12,0.18)'
  const accent = '#EA580C'
  const text   = isDark ? '#E8DDD4' : '#7C3100'

  const Icon = mode === 'review' ? IconGitMerge : IconEye

  const label = mode === 'review'
    ? <>Reviewing merge request · <span style={{ fontWeight: 700, color: accent }}>{familyName}</span></>
    : <>Exploring <span style={{ fontWeight: 700, color: accent }}>{familyName}</span> · merge <span style={{ fontWeight: 700, color: accent }}>{personName}</span> with <span style={{ fontWeight: 700, color: accent }}>{canonicalPersonName ?? 'matched node'}</span></>

  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0, zIndex: 40,
      display: 'flex', alignItems: 'center',
      padding: '10px 18px',
      background: bg,
      borderBottom: `1px solid ${border}`,
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{
          width: '26px', height: '26px', borderRadius: '7px', flexShrink: 0,
          background: 'rgba(234,88,12,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={13} color={accent} />
        </div>
        <span style={{ fontSize: '13px', fontWeight: 500, color: text }}>
          {label}
        </span>
        <span style={{
          width: '6px', height: '6px', borderRadius: '50%',
          background: accent, flexShrink: 0,
          animation: 'pulse-dot 2s ease-in-out infinite',
        }} />
      </div>

      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.4; transform: scale(0.7); }
        }
      `}</style>
    </div>
  )
}
