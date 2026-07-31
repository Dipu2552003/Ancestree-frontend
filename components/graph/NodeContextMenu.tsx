'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { IconEye, IconPencil, IconGitMerge, IconUserCircle, IconUserPlus, IconBinaryTree2, IconChecklist } from '@tabler/icons-react'
import { useGraphStore } from '@/store/graphStore'
import { getTheme } from '@/lib/theme'

interface NodeContextMenuProps {
  nodeId: string
  x: number
  y: number
  personName: string
  gender?: string
  canEdit: boolean
  /** Any member of your own family can add relations to any node (owned or not),
   *  including while viewing a member's tree in perspective. Hidden only on
   *  another family's tree. */
  canAddRelation: boolean
  /** Merge requests can start from any tree/view: own-family nodes merge
   *  forward (ours → theirs); foreign nodes flip to a reverse merge where
   *  they become the canonical target. */
  canMerge: boolean
  isSelf: boolean
  isViewerNode?: boolean
  /** Community/family admin — unlocks the bulk-selection tools. */
  isAdmin?: boolean
  onViewProfile: () => void
  onViewTree: () => void
  onAddRelation: () => void
  onEdit: () => void
  onMergeNode: () => void
  /** Select this node's whole paternal bloodline for a bulk gotra/village edit. */
  onSelectBloodline?: () => void
  /** Begin a manual multi-select starting from this node. */
  onSelectMultiple?: () => void
  onClose: () => void
}

export default function NodeContextMenu({
  nodeId, x, y, personName, gender,
  canEdit, canAddRelation, canMerge, isSelf, isViewerNode, isAdmin,
  onViewProfile, onViewTree, onAddRelation, onEdit, onMergeNode,
  onSelectBloodline, onSelectMultiple, onClose,
}: NodeContextMenuProps) {
  const { isDark } = useGraphStore()
  const t = getTheme(isDark)
  const menuRef   = useRef<HTMLDivElement>(null)
  const mountedAt = useRef(Date.now())

  const treeLinkLabel = gender === 'female' ? 'View her family tree' : gender === 'male' ? 'View his family tree' : 'View their family tree'

  // Close on outside click/tap or Escape.
  // Guard: ignore pointer events within 300 ms of mount so the touchend that
  // triggered a long-press doesn't immediately close the menu.
  useEffect(() => {
    mountedAt.current = Date.now()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    const outsideClose = (e: Event) => {
      if (Date.now() - mountedAt.current < 300) return
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', outsideClose)
    document.addEventListener('touchstart', outsideClose, { passive: true })
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', outsideClose)
      document.removeEventListener('touchstart', outsideClose)
    }
  }, [onClose])

  // Clamp to viewport
  // Base: header (~50px) + list padding (8px) = 58px. Each item ~34px.
  const MENU_W = 220
  const adminTools = !!isAdmin && (!!onSelectBloodline || !!onSelectMultiple)
  const itemCount = 1 // View profile — always present
    + (canMerge ? 1 : 0)
    + (!isSelf && !isViewerNode ? 1 : 0)
    + (canAddRelation ? 1 : 0)
    + (canEdit ? 1 : 0)
    + (onSelectBloodline ? 1 : 0)
    + (onSelectMultiple ? 1 : 0)
  const MENU_H = 58 + itemCount * 34
  // Open down-right of the pointer; flip when it would overflow that edge, then
  // clamp so the menu is ALWAYS fully on-screen — including near corners, where a
  // bare flip could still push it past the opposite edge (mobile especially).
  const M = 8
  const vw = typeof window !== 'undefined' ? window.innerWidth  : 1024
  const vh = typeof window !== 'undefined' ? window.innerHeight : 768
  const left = Math.min(Math.max(M, x + MENU_W > vw - M ? x - MENU_W : x), vw - MENU_W - M)
  const top  = Math.min(Math.max(M, y + MENU_H > vh - M ? y - MENU_H : y), vh - MENU_H - M)

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
      role="menuitem"
      aria-disabled={disabled}
      onClick={disabled ? undefined : () => { onClick(); onClose() }}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
        padding: '8px 14px', background: 'none', border: 'none',
        cursor: disabled ? 'default' : 'pointer',
        color: disabled ? disabledColor : danger ? '#E53E3E' : textColor,
        fontSize: '12.5px', fontWeight: 500, textAlign: 'left',
        borderRadius: '6px', transition: 'background 0.12s',
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
      role="menu"
      aria-label={`Actions for ${personName}`}
      style={{
        position: 'fixed', left, top, zIndex: 9999,
        width: `${MENU_W}px`,
        background: bg, border: `1px solid ${border}`,
        borderRadius: '12px', boxShadow: shadow,
        maxHeight: `${vh - 2 * M}px`, overflowX: 'hidden', overflowY: 'auto',
        userSelect: 'none',
      }}
    >
      {/* Header — presentational, not part of the menu list */}
      <div role="presentation" style={{ padding: '10px 14px 8px', borderBottom: `1px solid ${divider}` }}>
        <div style={{ fontSize: '12px', fontWeight: 600, color: textColor, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {personName}
        </div>
      </div>

      {/* Menu items */}
      <div role="presentation" style={{ padding: '4px' }}>
        {item(<IconUserCircle size={14} />, 'View profile', onViewProfile)}
        {!isSelf && !isViewerNode && item(<IconEye size={14} />, treeLinkLabel, onViewTree)}
        {canAddRelation && item(<IconUserPlus size={14} />, 'Add relation', onAddRelation)}
        {canEdit && item(<IconPencil size={14} />, 'Edit details', onEdit)}
        {canMerge && item(<IconGitMerge size={14} />, 'Merge node', onMergeNode)}

        {/* Admin-only bulk-selection tools */}
        {adminTools && (
          <div role="presentation" style={{ height: 1, background: divider, margin: '4px 6px' }} />
        )}
        {adminTools && onSelectBloodline &&
          item(<IconBinaryTree2 size={14} />, 'Select bloodline family', onSelectBloodline)}
        {adminTools && onSelectMultiple &&
          item(<IconChecklist size={14} />, 'Select multiple people', onSelectMultiple)}
      </div>
    </div>
  )
}
