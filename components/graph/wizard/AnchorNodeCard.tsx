'use client'

// AnchorNodeCard — polaroid card representing the *existing* anchor node
// (the person the new node is being attached to). Same dimensions as
// WizardNodeCard so the two sit cleanly together in NodeHero / TrioHero.

import { getTheme } from '@/lib/theme'
import { getInitials } from '@/lib/format/initials'
import { splitName } from './helpers'

interface AnchorNodeCardProps {
  fullName: string
  isDark:   boolean
  compact?: boolean
}

export default function AnchorNodeCard({ fullName, isDark, compact = false }: AnchorNodeCardProps) {
  const W  = compact ? 112 : 154
  const PH = compact ? 102 : 142
  const SH = compact ? 36  : 48
  const H  = PH + SH
  const avatarSize = compact ? 44 : 64
  const initSize   = compact ? 15 : 22

  const t = getTheme(isDark)
  const [fn, ln] = splitName(fullName)

  return (
    <div style={{
      width: W, height: H, flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden',
      background: t.cardBg,
      border: isDark ? '1.5px solid rgb(var(--c-primary-rgb) / 0.28)' : '1.5px solid rgb(var(--c-primary-rgb) / 0.22)',
      boxShadow: isDark
        ? '0 6px 28px rgba(0,0,0,0.70), 0 2px 6px rgba(0,0,0,0.40)'
        : '0 4px 16px rgba(0,0,0,0.14), 0 1px 4px rgba(0,0,0,0.08)',
    }}>
      <div style={{
        width: W, height: PH, flexShrink: 0,
        background: t.photoBg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          width: avatarSize, height: avatarSize, borderRadius: '50%',
          backgroundImage: 'linear-gradient(135deg, var(--c-primary), var(--c-primary-strong))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: initSize, fontWeight: 500, letterSpacing: '0.02em',
        }}>
          {getInitials(fullName)}
        </div>
      </div>
      <div style={{
        width: W, height: SH, flexShrink: 0,
        background: isDark ? '#141210' : '#FFFFFF',
        borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'}`,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '0 6px', gap: 2,
      }}>
        <div style={{
          fontSize: compact ? 9.5 : 11.5, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
          color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: W - 12, textAlign: 'center',
        }}>
          {fn}
        </div>
        {ln && (
          <div style={{
            fontSize: compact ? 8.5 : 10, fontWeight: 400, letterSpacing: '0.06em', textTransform: 'uppercase',
            color: isDark ? 'rgba(237,232,227,0.50)' : 'rgba(26,10,0,0.42)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: W - 12, textAlign: 'center',
          }}>
            {ln}
          </div>
        )}
      </div>
    </div>
  )
}
