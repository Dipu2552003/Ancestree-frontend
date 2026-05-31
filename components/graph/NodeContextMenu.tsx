'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { IconEye, IconPencil, IconRoute, IconSend } from '@tabler/icons-react'
import { useGraphStore } from '@/store/graphStore'
import { getTheme } from '@/lib/theme'

interface NodeContextMenuProps {
  nodeId: string
  x: number
  y: number
  personName: string
  gender?: string
  canEdit: boolean
  canInvite: boolean
  isSelf: boolean
  isViewerNode?: boolean
  onViewTree: () => void
  onEdit: () => void
  onInvite: () => void
  onClose: () => void
}

export default function NodeContextMenu({
  nodeId, x, y, personName, gender,
  canEdit, canInvite, isSelf, isViewerNode,
  onViewTree, onEdit, onInvite, onClose,
}: NodeContextMenuProps) {
  const { isDark } = useGraphStore()
  const t = getTheme(isDark)
  const menuRef = useRef<HTMLDivElement>(null)

  const treeLinkLabel = gender === 'female' ? 'View her family tree' : gender === 'male' ? 'View his family tree' : 'View their family tree'

  // Close on outside click or Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    const onMousedown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onMousedown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onMousedown)
    }
  }, [onClose])

  // Clamp to viewport
  const MENU_W = 220
  const MENU_H = canEdit && canInvite ? 160 : canEdit || canInvite ? 132 : 104
  const left = x + MENU_W > window.innerWidth  ? x - MENU_W : x
  const top  = y + MENU_H > window.innerHeight ? y - MENU_H : y

  const bg     = isDark ? '#1A1410' : '#FFFAF5'
  const border = isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.10)'
  const shadow = isDark ? '0 8px 32px rgba(0,0,0,0.6)' : '0 8px 24px rgba(0,0,0,0.14)'
  const divider = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'
  const itemHover = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'
  const textColor = isDark ? '#E8DDD4' : '#1A0A00'
  const subColor  = isDark ? '#7A6A5A' : '#9A7B5A'
  const disabledColor = isDark ? '#4A4040' : '#C4B8A8'

  const item = (
    icon: ReactNode,
    label: string,
    onClick: () => void,
    disabled = false,
    danger = false,
  ) => (
    <button
      onClick={disabled ? undefined : () => { onClick(); onClose() }}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
        padding: '8px 14px', background: 'none', border: 'none',
        cursor: disabled ? 'default' : 'pointer',
        color: disabled ? disabledColor : danger ? '#E53E3E' : textColor,
        fontSize: '12.5px', fontWeight: 500, textAlign: 'left',
        borderRadius: '4px', transition: 'background 0.12s',
        opacity: disabled ? 0.5 : 1,
      }}
      onMouseEnter={e => { if (!disabled) (e.currentTarget as HTMLButtonElement).style.background = itemHover }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none' }}
    >
      {icon}
      <span>{label}</span>
      {disabled && <span style={{ marginLeft: 'auto', fontSize: '10px', color: disabledColor }}>soon</span>}
    </button>
  )

  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed', left, top, zIndex: 9999,
        width: `${MENU_W}px`,
        background: bg, border: `1px solid ${border}`,
        borderRadius: '8px', boxShadow: shadow,
        overflow: 'hidden', userSelect: 'none',
      }}
    >
      {/* Header */}
      <div style={{ padding: '10px 14px 8px', borderBottom: `1px solid ${divider}` }}>
        <div style={{ fontSize: '12px', fontWeight: 600, color: textColor, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {personName}
        </div>
      </div>

      {/* Items */}
      <div style={{ padding: '4px' }}>
        {!isSelf && !isViewerNode && item(<IconEye size={14} />, treeLinkLabel, onViewTree)}
        {canEdit && item(<IconPencil size={14} />, 'Edit details', onEdit)}
        {item(<IconRoute size={14} />, 'View connection to me', () => {}, true)}
        {canInvite && item(<IconSend size={14} />, 'Invite to join', onInvite)}
      </div>
    </div>
  )
}
