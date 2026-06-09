'use client'

// ConnectionsList — list of relationship cards rendered below the form.
// Each card shows avatar / name / relation label and View + Remove buttons.
// The list itself derives `connections` upstream from rawNodes/rawEdges;
// this component is purely presentational + owns its per-row "removing"
// spinner state.

import { useState } from 'react'
import { motion } from 'framer-motion'
import { IconEye, IconLoader2, IconScissors } from '@tabler/icons-react'
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
  const [removingEdgeId, setRemovingEdgeId] = useState<string | null>(null)

  return (
    <div style={{ padding: '10px 16px 4px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {connections.map(conn => {
        const initials = conn.fullName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
        const avatarBg = conn.nodeState === 'claimed' ? '#C2410C'
          : conn.nodeState === 'proxy' || conn.nodeState === 'invited' ? '#D97706'
          : '#94A3B8'
        const isRemoving = removingEdgeId === conn.edgeId
        return (
          <div
            key={conn.edgeId}
            style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '9px 12px',
              borderRadius: '10px',
              background: isDark ? 'rgba(255,255,255,0.04)' : '#FFF7ED',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : '#FDE8CC'}`,
              opacity: isRemoving ? 0.5 : 1,
              transition: 'opacity 0.2s',
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
              disabled={isRemoving}
              title="View"
              style={{
                width: '28px', height: '28px', borderRadius: '6px', border: 'none',
                background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: t.textMuted, flexShrink: 0,
                transition: 'background 0.15s, color 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.13)' : 'rgba(0,0,0,0.10)'; e.currentTarget.style.color = '#EA580C' }}
              onMouseLeave={e => { e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'; e.currentTarget.style.color = t.textMuted }}
            >
              <IconEye size={14} />
            </button>

            {/* Remove button */}
            <button
              onClick={async () => {
                if (!onRemoveConnection || isRemoving) return
                setRemovingEdgeId(conn.edgeId)
                try { await onRemoveConnection(conn.edgeId) }
                finally { setRemovingEdgeId(null) }
              }}
              disabled={isRemoving}
              title="Remove connection"
              style={{
                width: '28px', height: '28px', borderRadius: '6px', border: 'none',
                background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
                cursor: isRemoving ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: t.textMuted, flexShrink: 0,
                transition: 'background 0.15s, color 0.15s',
              }}
              onMouseEnter={e => { if (!isRemoving) { e.currentTarget.style.background = isDark ? 'rgba(239,68,68,0.18)' : '#FEE2E2'; e.currentTarget.style.color = '#EF4444' } }}
              onMouseLeave={e => { e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'; e.currentTarget.style.color = t.textMuted }}
            >
              {isRemoving
                ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}><IconLoader2 size={13} /></motion.div>
                : <IconScissors size={13} />
              }
            </button>
          </div>
        )
      })}
    </div>
  )
}
