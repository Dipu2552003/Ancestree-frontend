'use client'

// SentRow — one row in the Sent tab. Read-only view of a merge request *this*
// user initiated. Status drives the accent colour (proposed/confirmed/rejected/
// reversed) and a contextual footer line.

import { IconGitMerge, IconClock } from '@tabler/icons-react'
import type { SentMergeRequest } from '@/lib/api'
import { getTheme } from '@/lib/theme'
import { StatusBadge } from '@/components/ui'
import { timeAgo } from './helpers'

interface SentRowProps {
  r:      SentMergeRequest
  isDark: boolean
}

export default function SentRow({ r, isDark }: SentRowProps) {
  const t = getTheme(isDark)

  const borderColor = {
    proposed: '#F59E0B',
    confirmed: '#22C55E',
    rejected:  '#EF4444',
    reversed:  '#9CA3AF',
  }[r.status]

  const bgColor = {
    proposed:  isDark ? 'rgba(234,179,8,0.05)'  : 'rgba(234,179,8,0.03)',
    confirmed: isDark ? 'rgba(34,197,94,0.06)'  : 'rgba(34,197,94,0.03)',
    rejected:  isDark ? 'rgba(239,68,68,0.06)'  : 'rgba(239,68,68,0.03)',
    reversed:  'transparent',
  }[r.status]

  return (
    <div style={{
      margin:       '0 0 10px',
      borderRadius: '13px',
      border:       `1.5px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}`,
      borderLeft:   `4px solid ${borderColor}`,
      background:   bgColor,
      overflow:     'hidden',
    }}>
      {/* Header row */}
      <div style={{
        padding:        '11px 14px 0',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        gap:            '8px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0 }}>
          <IconGitMerge size={13} color={borderColor} style={{ flexShrink: 0 }} />
          <span style={{
            fontSize:     '12.5px',
            fontWeight:   600,
            color:        t.text,
            overflow:     'hidden',
            textOverflow: 'ellipsis',
            whiteSpace:   'nowrap',
          }}>
            {r.merged_person_name}
          </span>
          <span style={{ fontSize: '11px', color: t.textMuted, flexShrink: 0 }}>→</span>
          <span style={{
            fontSize:     '12px',
            color:        t.textMuted,
            overflow:     'hidden',
            textOverflow: 'ellipsis',
            whiteSpace:   'nowrap',
          }}>
            {r.canonical_person_name}
          </span>
        </div>
        <StatusBadge status={r.status} />
      </div>

      {/* Detail row */}
      <div style={{ padding: '6px 14px 11px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <IconClock size={11} color={t.textMuted} style={{ flexShrink: 0 }} />
        <span style={{ fontSize: '10.5px', color: t.textMuted }}>
          Sent {timeAgo(r.created_at)}
          {r.status === 'confirmed' && r.merged_at && ` · Accepted ${timeAgo(r.merged_at)}`}
          {r.status === 'rejected'  && r.merged_at && ` · Rejected ${timeAgo(r.merged_at)}`}
        </span>
      </div>

      {/* Status message */}
      {r.status === 'proposed' && (
        <div style={{ padding: '0 14px 11px' }}>
          <span style={{ fontSize: '11px', color: '#B45309' }}>
            ⏳ Waiting for {r.canonical_person_name} to respond…
          </span>
        </div>
      )}
      {r.status === 'confirmed' && (
        <div style={{ padding: '0 14px 11px' }}>
          <span style={{ fontSize: '11px', color: '#15803D' }}>
            🎉 Your trees are now connected!
          </span>
        </div>
      )}
      {r.status === 'rejected' && (
        <div style={{ padding: '0 14px 11px' }}>
          <span style={{ fontSize: '11px', color: t.textMuted }}>
            This merge request was declined.
          </span>
        </div>
      )}
    </div>
  )
}
