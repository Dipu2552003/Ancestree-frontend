'use client'

// ConnectionsList — list of relationship cards rendered below the form.
// Each card shows avatar / name / relation label and a View button.

import { IconEye } from '@tabler/icons-react'
import { getTheme } from '@/lib/theme'

export interface ConnectionRow {
  edgeId:    string
  personId:  string
  fullName:  string
  photoUrl?: string
  nodeState: string
  relLabel:  string
}

interface ConnectionsListProps {
  connections:        ConnectionRow[]
  isDark:             boolean
  onViewNode?:        (id: string) => void
  onRemoveConnection?: (edgeId: string) => Promise<void>
}

export default function ConnectionsList({
  connections, isDark, onViewNode, onRemoveConnection,
}: ConnectionsListProps) {
  const t = getTheme(isDark)

  return (
    <div style={{ padding: '10px 16px 4px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {connections.map(conn => {
        const initials = conn.fullName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
        const avatarBg = conn.nodeState === 'claimed' ? 'var(--c-primary-strong)'
          : conn.nodeState === 'proxy' || conn.nodeState === 'invited' ? 'var(--c-secondary)'
          : '#94A3B8'
        return (
          <div
            key={conn.edgeId}
            style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '9px 12px',
              borderRadius: '10px',
              background: isDark ? 'rgba(255,255,255,0.04)' : 'var(--c-page)',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'var(--c-tint)'}`,
            }}
          >
            {/* Avatar */}
            <div style={{
              width: '34px', height: '34px', borderRadius: '6px', flexShrink: 0,
              overflow: 'hidden', background: avatarBg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {conn.photoUrl
                ? <img src={conn.photoUrl} alt={conn.fullName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ fontSize: '12px', fontWeight: 700, color: '#fff', letterSpacing: '0.02em' }}>{initials}</span>
              }
            </div>

            {/* Name + label */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {conn.fullName}
              </div>
              <div style={{ fontSize: '10px', color: t.textMuted, marginTop: '1px' }}>{conn.relLabel}</div>
            </div>

            {/* View button */}
            <button
              onClick={() => onViewNode?.(conn.personId)}
              title="View"
              style={{
                width: '28px', height: '28px', borderRadius: '6px', border: 'none',
                background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: t.textMuted, flexShrink: 0,
                transition: 'background 0.15s, color 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.13)' : 'rgba(0,0,0,0.10)'; e.currentTarget.style.color = 'var(--c-primary)' }}
              onMouseLeave={e => { e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'; e.currentTarget.style.color = t.textMuted }}
            >
              <IconEye size={14} />
            </button>

          </div>
        )
      })}
    </div>
  )
}
