'use client'

// Top-left HUD pill: blossom emoji + "FAMILY" label + family name + divider +
// member-count icon. Pure presentation — every piece flows in via props.

import { IconUsers } from '@tabler/icons-react'
import { getTheme, COLORS } from '@/lib/theme'

type CountMode = 'side' | 'family' | 'community'

// What each count view means — used for the label under the number and the
// hover tooltip.
const COUNT_META: Record<CountMode, { label: string; title: (n: number) => string }> = {
  side:      { label: 'in view',   title: n => `${n} shown on the side you're viewing — click to switch count` },
  family:    { label: 'this tree', title: n => `${n} in this whole family tree (both sides + married-in) — click to switch count` },
  community: { label: 'community', title: n => `${n} across all trees in the community — click to switch count` },
}

interface FamilyBadgeProps {
  familyName:  string
  memberCount: number
  /** Which count is shown; clicking the number cycles side → family → community. */
  countMode?:  CountMode
  onCycleCount?: () => void
  isDark:      boolean
  /** Mobile: shrink padding and let the family name truncate so the badge fits
   *  the space left of the icon cluster (member count always stays visible). */
  compact?:    boolean
  /** Community mode: clicking the badge opens the family's admin list. */
  onClick?:    () => void
}

export default function FamilyBadge({ familyName, memberCount, countMode, onCycleCount, isDark, compact = false, onClick }: FamilyBadgeProps) {
  const t = getTheme(isDark)
  const meta = countMode ? COUNT_META[countMode] : null

  return (
    <div
      data-tour="family-badge"
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

      <div style={{ width: '1px', height: '22px', background: t.controlBorder, margin: '0 2px', flexShrink: 0 }} aria-hidden="true" />
      <div
        onClick={onCycleCount ? (e => { e.stopPropagation(); onCycleCount() }) : undefined}
        role={onCycleCount ? 'button' : undefined}
        tabIndex={onCycleCount ? 0 : undefined}
        onKeyDown={onCycleCount ? (e => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); onCycleCount() } }) : undefined}
        title={meta ? meta.title(memberCount) : `${memberCount} ${memberCount === 1 ? 'member' : 'members'} in this family`}
        style={{
          display: 'flex', alignItems: 'center', gap: '4px', color: t.textMuted, flexShrink: 0,
          cursor: onCycleCount ? 'pointer' : undefined,
          padding: onCycleCount ? '2px 4px' : undefined,
          borderRadius: '6px',
        }}
      >
        <IconUsers size={14} stroke={1.8} />
        <span style={{ fontSize: '13px', fontWeight: 700, color: t.text, lineHeight: 1 }}>
          {memberCount}
        </span>
        {meta && !compact && (
          <span style={{ fontSize: '8.5px', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: t.textMuted, marginLeft: '1px' }}>
            {meta.label}
          </span>
        )}
      </div>
    </div>
  )
}
