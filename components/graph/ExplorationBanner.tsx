'use client'

import { IconEye, IconGitMerge } from '@tabler/icons-react'
import { getTheme } from '@/lib/theme'

interface ExplorationBannerProps {
  mode:                'explore' | 'review'
  /** The person whose tree you've navigated into — the one you searched for
   *  or whose match you're reviewing. Anchors the banner so users always see
   *  which tree they're in, by person rather than by family name. */
  canonicalPersonName: string
  /** The user's own person they're attempting to merge against canonical. */
  personName:          string
  isDark:              boolean
}

export default function ExplorationBanner({ mode, canonicalPersonName, personName, isDark }: ExplorationBannerProps) {
  const bg     = isDark ? 'rgba(26,20,16,0.95)' : 'rgba(255,247,237,0.95)'
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(234,88,12,0.18)'
  const accent = '#EA580C'
  const text   = isDark ? '#E8DDD4' : '#7C3100'

  const Icon = mode === 'review' ? IconGitMerge : IconEye

  const treeName = <span style={{ fontWeight: 700, color: accent }}>{canonicalPersonName}&apos;s tree</span>

  const label = mode === 'review'
    ? <>Reviewing merge request · {treeName}</>
    : <>Exploring {treeName} · merge <span style={{ fontWeight: 700, color: accent }}>{personName}</span> with <span style={{ fontWeight: 700, color: accent }}>{canonicalPersonName}</span></>

  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0, zIndex: 40,
      height: '46px', boxSizing: 'border-box',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '0 16px',
      background: bg,
      borderBottom: `1px solid ${border}`,
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      boxShadow: isDark ? '0 2px 12px rgba(0,0,0,0.35)' : '0 2px 10px rgba(234,88,12,0.08)',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '9px',
        minWidth: 0, maxWidth: '100%',
      }}>
        <div style={{
          width: '26px', height: '26px', borderRadius: '7px', flexShrink: 0,
          background: 'rgba(234,88,12,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={13} color={accent} />
        </div>
        <span style={{
          fontSize: '13px', fontWeight: 500, color: text,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          minWidth: 0,
        }}>
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
