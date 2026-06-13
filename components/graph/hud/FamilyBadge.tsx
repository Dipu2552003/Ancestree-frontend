'use client'

// Top-left HUD pill: blossom emoji + "FAMILY" label + family name + divider +
// member-count icon. Pure presentation — every piece flows in via props.

import { IconUsers } from '@tabler/icons-react'
import { getTheme, COLORS } from '@/lib/theme'

interface FamilyBadgeProps {
  familyName:  string
  memberCount: number
  isDark:      boolean
  /** Mobile: shrink padding, drop the member count, and let the family name
   *  truncate so the badge fits the space left of the icon cluster. */
  compact?:    boolean
  /** Community mode: clicking the badge opens the family's admin list. */
  onClick?:    () => void
}

export default function FamilyBadge({ familyName, memberCount, isDark, compact = false, onClick }: FamilyBadgeProps) {
  const t = getTheme(isDark)

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e => { if (e.key === 'Enter' || e.key === ' ') onClick() }) : undefined}
      title={onClick ? `View ${familyName} admins` : undefined}
      style={{
        display: 'flex', alignItems: 'center', gap: compact ? '6px' : '8px',
        padding: compact ? '6px 10px' : '7px 14px',
        width: compact ? 'fit-content' : undefined,
        maxWidth: '100%', boxSizing: 'border-box',
        background: t.cardBg,
        border: `1.5px solid ${t.controlBorder}`,
        borderRadius: '10px',
        boxShadow: isDark ? '0 2px 12px rgba(0,0,0,0.45)' : '0 2px 8px rgba(0,0,0,0.08)',
        userSelect: 'none',
        cursor: onClick ? 'pointer' : undefined,
        transition: 'background 0.3s',
      }}>
      <span style={{ fontSize: '15px', lineHeight: 1, flexShrink: 0 }} aria-hidden="true">🌸</span>
      <div style={{ lineHeight: 1.2, minWidth: 0 }}>
        <div style={{ fontSize: '8.5px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: t.textMuted }}>
          Family
        </div>
        <div style={{
          fontSize: compact ? '12px' : '13px', fontWeight: 700, color: COLORS.saffron, letterSpacing: '0.01em',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {familyName}
        </div>
      </div>

      {!compact && (<>
        <div style={{ width: '1px', height: '22px', background: t.controlBorder, margin: '0 2px' }} aria-hidden="true" />
        <div
          style={{ display: 'flex', alignItems: 'center', gap: '4px', color: t.textMuted }}
          title={`${memberCount} ${memberCount === 1 ? 'member' : 'members'} in this family`}
        >
          <IconUsers size={14} stroke={1.8} />
          <span style={{ fontSize: '13px', fontWeight: 700, color: t.text, lineHeight: 1 }}>
            {memberCount}
          </span>
        </div>
      </>)}
    </div>
  )
}
