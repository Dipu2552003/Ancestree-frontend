'use client'

import { useCallback } from 'react'
import { useReactFlow } from '@xyflow/react'
import { IconHome2, IconSearch, IconUsers } from '@tabler/icons-react'
import type { Node } from '@xyflow/react'
import type { PersonData } from '@/types'

interface Props {
  isDark: boolean
  nodes: Node[]
  selectedNodeId: string | null
  familyName?: string
  onAddClick: () => void
  onSearchClick: () => void
  onMembersClick: () => void
  onFamilyClick: () => void
}

export default function BottomNav({
  isDark, nodes, selectedNodeId,
  familyName = 'Khandelwal',
  onAddClick, onSearchClick, onMembersClick, onFamilyClick,
}: Props) {
  const { setCenter } = useReactFlow()

  const handleHome = useCallback(() => {
    const selfNode = nodes.find(n => (n.data as unknown as PersonData)?.isSelf)
    if (selfNode) {
      setCenter(selfNode.position.x + 64, selfNode.position.y + 79, { zoom: 1.2, duration: 600 })
    }
  }, [nodes, setCenter])

  const addEnabled = !!selectedNodeId

  const bg      = isDark ? '#18160F' : '#FFFFFF'
  const border  = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'
  const ic      = isDark ? '#7A6A52' : '#9A6C3C'
  const addBg   = addEnabled ? '#EA580C' : (isDark ? '#2A2520' : '#EDD8C0')
  const addGlyph = addEnabled ? '#FFFFFF' : (isDark ? '#4A4038' : '#C4A882')

  const navBtn: React.CSSProperties = {
    flex: 1, display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', gap: '3px',
    height: '100%', background: 'none', border: 'none',
    cursor: 'pointer', padding: 0, fontFamily: 'inherit',
  }
  const label: React.CSSProperties = {
    fontSize: '9px', color: ic, letterSpacing: '0.03em',
  }

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 60,
      height: '64px',
      background: bg,
      borderTop: `1px solid ${border}`,
      display: 'flex', alignItems: 'center',
    }}>

      {/* ── Family / Logo ── */}
      <button style={navBtn} onClick={onFamilyClick}>
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="5"  r="2.4" fill={ic} />
          <circle cx="4"  cy="15" r="2"   fill={ic} opacity="0.70" />
          <circle cx="16" cy="15" r="2"   fill={ic} opacity="0.70" />
          <line x1="10" y1="7.4" x2="4"  y2="13" stroke={ic} strokeWidth="1.2" opacity="0.55" />
          <line x1="10" y1="7.4" x2="16" y2="13" stroke={ic} strokeWidth="1.2" opacity="0.55" />
        </svg>
        <span style={{ ...label, fontWeight: 500 }}>{familyName}</span>
      </button>

      {/* ── Home / re-center ── */}
      <button style={navBtn} onClick={handleHome}>
        <IconHome2 size={19} color={ic} />
        <span style={label}>Home</span>
      </button>

      {/* ── Add — raised saffron circle ── */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'flex-end', paddingBottom: '4px' }}>
        <button
          onClick={addEnabled ? onAddClick : undefined}
          style={{
            width: '52px', height: '52px', borderRadius: '50%',
            background: addBg,
            transform: 'translateY(-14px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: 'none',
            cursor: addEnabled ? 'pointer' : 'default',
            boxShadow: addEnabled ? '0 4px 16px rgba(234,88,12,0.38)' : 'none',
            transition: 'background 0.2s, box-shadow 0.2s',
            flexShrink: 0,
          }}
          title={addEnabled ? 'Add relation' : 'Select a person first'}
        >
          <span style={{ fontSize: '28px', lineHeight: 1, color: addGlyph, fontWeight: 300, marginTop: '-2px' }}>
            +
          </span>
        </button>
      </div>

      {/* ── Search ── */}
      <button style={navBtn} onClick={onSearchClick}>
        <IconSearch size={19} color={ic} />
        <span style={label}>Search</span>
      </button>

      {/* ── Members ── */}
      <button style={navBtn} onClick={onMembersClick}>
        <IconUsers size={19} color={ic} />
        <span style={label}>Members</span>
      </button>

    </div>
  )
}
