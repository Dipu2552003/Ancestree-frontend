'use client'

import { IconArrowLeft, IconGitMerge } from '@tabler/icons-react'

interface MergeSourceBannerProps {
  sourceNodeName: string
  onCancel:       () => void
  isDark:         boolean
}

export default function MergeSourceBanner({ sourceNodeName, onCancel, isDark }: MergeSourceBannerProps) {
  const bg     = isDark ? 'rgba(26,20,16,0.95)' : 'rgba(255,247,237,0.95)'
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
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{
          width: '26px', height: '26px', borderRadius: '7px', flexShrink: 0,
          background: 'rgba(234,88,12,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <IconGitMerge size={13} color={accent} />
        </div>
        <span style={{ fontSize: '13px', fontWeight: 500, color: text }}>
          Merging{' '}
          <span style={{ fontWeight: 700, color: accent }}>{sourceNodeName}</span>
          {' · Click any node in this tree to send a merge request'}
        </span>
        <span style={{
          width: '6px', height: '6px', borderRadius: '50%',
          background: accent, flexShrink: 0,
          animation: 'pulse-dot 2s ease-in-out infinite',
        }} />
      </div>

      <button
        onClick={onCancel}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '5px 12px', borderRadius: '6px',
          background: isDark ? 'rgba(234,88,12,0.15)' : 'rgba(234,88,12,0.10)',
          border: `1px solid ${isDark ? 'rgba(234,88,12,0.3)' : 'rgba(234,88,12,0.25)'}`,
          color: accent, fontSize: '12px', fontWeight: 600,
          cursor: 'pointer', transition: 'background 0.15s', whiteSpace: 'nowrap',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = isDark ? 'rgba(234,88,12,0.25)' : 'rgba(234,88,12,0.18)')}
        onMouseLeave={e => (e.currentTarget.style.background = isDark ? 'rgba(234,88,12,0.15)' : 'rgba(234,88,12,0.10)')}
      >
        <IconArrowLeft size={13} />
        Cancel merge
      </button>

      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.4; transform: scale(0.7); }
        }
      `}</style>
    </div>
  )
}
