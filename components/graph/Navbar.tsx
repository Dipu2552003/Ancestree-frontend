'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  IconHome2, IconPlus, IconX,
  IconArrowUp, IconArrowDown, IconHeart, IconTrash, IconLoader2,
  IconLogout, IconPencil, IconEye, IconUsers, IconHandClick,
} from '@tabler/icons-react'
import type { WomanView } from '@/lib/layouts/familySideFilter'
import { getTheme } from '@/lib/theme'
import { Z } from '@/lib/zIndex'
import { clearToken } from '@/lib/api'
import { useIsMobile } from '@/hooks/useIsMobile'

export type RelAction = 'father' | 'mother' | 'son' | 'daughter' | 'brother' | 'sister' | 'spouse'

interface NavbarProps {
  familyName: string
  /** Breadcrumb journey trail, stacked just above the navbar pill. */
  timeline?: React.ReactNode
  selectedNodeId: string | null
  selectedNodeName: string
  canDeleteSelected: boolean
  /** Tooltip explaining why the trash button is disabled. */
  deleteDisabledReason?: string
  /** Other-parent name when the person's children stay linked through them —
   *  shown as a note in the delete confirm popup. */
  deleteChildrenNote?: string | null
  panelMode: 'none' | 'edit' | 'view'
  /** Whether the selected node's profile may be edited by the viewer. Owned
   *  (claimed-by-someone-else) nodes are read-only, so the Edit button hides. */
  canEditSelected: boolean
  onHome: () => void
  onStartWizard: (action: RelAction) => void
  onDeleteSelected: () => Promise<void>
  onEdit: () => void
  onView: () => void
  isMarriedWoman: boolean
  womanView: WomanView
  onWomanViewChange: (v: WomanView) => void
  isDark: boolean
  forceAddOpen?: number
}

const RELATIONS: {
  action: RelAction
  label: string
  icon: React.ReactNode
  color: string
}[] = [
  { action: 'father',   label: 'Father',   icon: <IconArrowUp size={18} />,   color: '#4F86C6' },
  { action: 'mother',   label: 'Mother',   icon: <IconArrowUp size={18} />,   color: '#C06FAE' },
  { action: 'son',      label: 'Son',      icon: <IconArrowDown size={18} />, color: '#2EAA7C' },
  { action: 'daughter', label: 'Daughter', icon: <IconArrowDown size={18} />, color: '#9C6FD6' },
  { action: 'brother',  label: 'Brother',  icon: <IconUsers size={18} />,     color: '#0E9F78' },
  { action: 'sister',   label: 'Sister',   icon: <IconUsers size={18} />,     color: '#A855F7' },
  { action: 'spouse',   label: 'Spouse',   icon: <IconHeart size={18} />,     color: 'var(--c-primary)' },
]

type DeleteState = 'idle' | 'confirm' | 'deleting'

export default function Navbar({
  familyName, timeline, selectedNodeId, selectedNodeName,
  canDeleteSelected, deleteDisabledReason, deleteChildrenNote, panelMode,
  canEditSelected,
  onHome, onStartWizard, onDeleteSelected,
  onEdit, onView,
  isMarriedWoman, womanView, onWomanViewChange, isDark,
  forceAddOpen,
}: NavbarProps) {
  const router = useRouter()
  const isMobile = useIsMobile()
  const [addOpen,      setAddOpen]      = useState(false)
  const [deleteState,  setDeleteState]  = useState<DeleteState>('idle')
  const [deleteError,  setDeleteError]  = useState('')
  const menuRef = useRef<HTMLDivElement>(null)

  const closeAdd = () => setAddOpen(false)

  const handleLogout = () => {
    clearToken()
    localStorage.removeItem('user')
    // Drop the community association so a normal sign-in isn't bounced back
    // to /community/{slug}. Only a fresh community login should re-set this.
    localStorage.removeItem('community_slug')
    router.replace('/login')
  }

  const handleRelationSelect = (action: RelAction) => {
    closeAdd()
    onStartWizard(action)
  }

  useEffect(() => {
    if (!addOpen && deleteState === 'idle') return
    const handler = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) {
        closeAdd()
        setDeleteState('idle')
        setDeleteError('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [addOpen, deleteState])

  useEffect(() => {
    if (!selectedNodeId) {
      closeAdd()
      setDeleteState('idle')
      setDeleteError('')
    }
  }, [selectedNodeId])

  useEffect(() => {
    if (forceAddOpen && addEnabled) setAddOpen(true)
  }, [forceAddOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  // Briefly nudge the user to pick a person when they tap an action that needs
  // a selection but none is set.
  const [selectHint, setSelectHint] = useState(false)
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const nudgeSelect = () => {
    setSelectHint(true)
    if (hintTimer.current) clearTimeout(hintTimer.current)
    hintTimer.current = setTimeout(() => setSelectHint(false), 2400)
  }
  // Dismiss the hint as soon as a person is selected; clean up on unmount.
  useEffect(() => { if (selectedNodeId) setSelectHint(false) }, [selectedNodeId])
  useEffect(() => () => { if (hintTimer.current) clearTimeout(hintTimer.current) }, [])

  const t = getTheme(isDark)

  const addEnabled = !!selectedNodeId

  const delEnabled = canDeleteSelected
  const delColor   = delEnabled ? '#EF4444' : (isDark ? '#4A3F35' : '#C4A882')
  const delBg      = deleteState !== 'idle'
    ? (isDark ? 'rgba(239,68,68,0.18)' : 'rgba(239,68,68,0.10)')
    : delEnabled
      ? (isDark ? 'rgba(239,68,68,0.10)' : 'rgba(239,68,68,0.06)')
      : (isDark ? '#2A2520' : '#F5F0EA')

  const editActive = panelMode === 'edit'
  const viewActive = panelMode === 'view'
  const actionEnabled = !!selectedNodeId
  // Edit affordance: enabled only when the selected node is editable. Hidden
  // entirely once an un-editable (owned) node is selected, so other family
  // members never see an Edit control for someone else's account. With nothing
  // selected it stays visible-but-disabled ("Select a person first").
  const editEnabled = canEditSelected
  const editVisible = !selectedNodeId || canEditSelected

  const actionBg = (active: boolean) => active
    ? (isDark ? 'rgb(var(--c-primary-rgb) / 0.18)' : 'rgb(var(--c-primary-rgb) / 0.10)')
    : actionEnabled
      ? (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)')
      : (isDark ? '#2A2520' : '#F5F0EA')

  const actionColor = (active: boolean) => active
    ? 'var(--c-primary)'
    : actionEnabled
      ? t.textMuted
      : (isDark ? '#4A3F35' : '#C4A882')

  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        bottom: isMobile ? 'max(16px, calc(env(safe-area-inset-bottom) + 8px))' : '24px',
        left: '50%',
        transform: 'translateX(-50%)', zIndex: Z.navbar,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
        maxWidth: 'calc(100vw - 24px)',
      }}
    >
      {/* ── Journey trail — sits above everything, just above the pill ── */}
      {timeline}

      {/* ── Add relation menu ── */}
      <AnimatePresence>
        {addOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            style={{
              background: t.panelBg,
              border: `1px solid ${t.borderNeutral}`,
              borderRadius: '16px',
              padding: '16px',
              boxShadow: t.shadow,
              width: '260px',
              maxWidth: 'calc(100vw - 32px)',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div>
                <p style={{ margin: 0, fontSize: '11px', color: t.textMuted, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  Add relation
                </p>
                <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: t.text, maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {selectedNodeName || 'Selected person'}
                </p>
              </div>
              <button onClick={closeAdd} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textMuted, padding: '2px', display: 'flex' }}>
                <IconX size={15} />
              </button>
            </div>

            {/* Relation type grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              {RELATIONS.map(r => (
                <button
                  key={r.action}
                  onClick={() => handleRelationSelect(r.action)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '9px 12px', borderRadius: '10px',
                    border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                    background: 'transparent', color: t.text,
                    fontSize: '12.5px', fontWeight: 500,
                    transition: 'background 0.12s',
                    gridColumn: r.action === 'spouse' ? '1 / -1' : 'auto',
                    justifyContent: r.action === 'spouse' ? 'center' : 'flex-start',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = t.itemHoverBg)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <span style={{ color: r.color, display: 'flex' }}>{r.icon}</span>
                  {r.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Delete / Remove-from-tree confirm popup ── */}
      <AnimatePresence>
        {deleteState !== 'idle' && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            style={{
              background: t.panelBg,
              border: `1px solid rgba(239,68,68,0.30)`,
              borderRadius: '16px',
              padding: '16px',
              boxShadow: t.shadow,
              width: '260px',
              maxWidth: 'calc(100vw - 32px)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <p style={{ margin: 0, fontSize: '11px', color: '#EF4444', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>
                Remove person
              </p>
              <button
                onClick={() => { setDeleteState('idle'); setDeleteError('') }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textMuted, padding: '2px', display: 'flex' }}
              >
                <IconX size={15} />
              </button>
            </div>

            <p style={{ margin: '0 0 12px', fontSize: '13px', color: t.text, lineHeight: 1.45 }}>
              Remove <strong>{selectedNodeName}</strong> and all their connections from the tree? This cannot be undone.
            </p>

            {deleteChildrenNote && (
              <p style={{
                margin: '0 0 12px', padding: '8px 10px', borderRadius: '8px',
                background: isDark ? 'rgb(var(--c-secondary-rgb) / 0.12)' : '#FFFBEB',
                border: `1px solid ${isDark ? 'rgb(var(--c-secondary-rgb) / 0.25)' : '#FDE68A'}`,
                fontSize: '12px', color: isDark ? '#FCD34D' : '#B45309', lineHeight: 1.45,
              }}>
                Their children will stay in the tree, linked to <strong>{deleteChildrenNote}</strong>.
              </p>
            )}

            {deleteError && (
              <p style={{ margin: '0 0 10px', fontSize: '11.5px', color: '#EF4444' }}>{deleteError}</p>
            )}

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => { setDeleteState('idle'); setDeleteError('') }}
                disabled={deleteState === 'deleting'}
                style={{
                  flex: 1, height: '36px', borderRadius: '10px',
                  border: `1px solid ${t.borderNeutral}`,
                  background: 'transparent', cursor: 'pointer',
                  fontSize: '13px', fontFamily: 'inherit', color: t.textMuted,
                }}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setDeleteState('deleting')
                  setDeleteError('')
                  try {
                    await onDeleteSelected()
                    setDeleteState('idle')
                  } catch (err: unknown) {
                    setDeleteState('confirm')
                    setDeleteError(err instanceof Error ? err.message : 'Action failed')
                  }
                }}
                disabled={deleteState === 'deleting'}
                style={{
                  flex: 1, height: '36px', borderRadius: '10px',
                  border: 'none',
                  cursor: deleteState === 'deleting' ? 'default' : 'pointer',
                  background: '#EF4444', color: '#fff',
                  fontSize: '13px', fontWeight: 600, fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  opacity: deleteState === 'deleting' ? 0.75 : 1,
                  transition: 'opacity 0.15s',
                }}
              >
                {deleteState === 'deleting'
                  ? <><motion.div animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}><IconLoader2 size={14} /></motion.div>Deleting…</>
                  : <><IconTrash size={14} />Delete</>
                }
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Mayka / Sasural toggle (married women only) ── */}
      {isMarriedWoman && (
        <motion.div
          initial={{ opacity: 0, y: 6, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 6, scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          style={{
            background: t.cardBg,
            border: `1px solid ${t.borderNeutral}`,
            borderRadius: '14px',
            boxShadow: t.shadow,
            display: 'flex',
            padding: '4px',
            gap: '2px',
          }}
        >
          {(['sasural', 'mayka'] as WomanView[]).map(v => {
            const active = womanView === v
            return (
              <button
                key={v}
                onClick={() => onWomanViewChange(v)}
                title={v === 'sasural' ? 'Sasural — husband\'s family side' : 'Mayka — birth / parents\' side'}
                style={{
                  padding: '5px 16px',
                  borderRadius: '10px',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  letterSpacing: '0.03em',
                  background: active
                    ? (isDark ? 'rgb(var(--c-primary-rgb) / 0.18)' : 'rgb(var(--c-primary-rgb) / 0.10)')
                    : 'transparent',
                  color: active ? 'var(--c-primary)' : t.textMuted,
                  transition: 'background 0.15s, color 0.15s',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px',
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = t.itemHoverBg }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
              >
                <span style={{ fontSize: '12px', fontWeight: active ? 700 : 500 }}>
                  {v === 'sasural' ? 'Sasural' : 'Mayka'}
                </span>
                <span style={{ fontSize: '8.5px', letterSpacing: '0.04em', opacity: 0.65, fontWeight: 500 }}>
                  {v === 'sasural' ? "husband's side" : 'birth side'}
                </span>
              </button>
            )
          })}
        </motion.div>
      )}

      {/* ── "Select a person" hint — shown when an action needs a selection ── */}
      <AnimatePresence>
        {selectHint && !selectedNodeId && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            style={{
              background: 'var(--c-primary)', color: '#fff',
              borderRadius: '12px', padding: '8px 14px',
              boxShadow: t.shadow, maxWidth: 'calc(100vw - 32px)',
              fontSize: '12.5px', fontWeight: 600, letterSpacing: '0.01em',
              display: 'flex', alignItems: 'center', gap: '7px', whiteSpace: 'nowrap',
            }}
          >
            <IconHandClick size={15} stroke={2} />
            {isMobile ? 'Tap a person to add, edit or view' : 'Click a person to add, edit or view'}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Navbar pill ── */}
      <div style={{
        background: t.cardBg,
        border: `1px solid ${t.borderNeutral}`,
        borderRadius: '20px',
        boxShadow: t.shadow,
        display: 'flex', alignItems: 'center',
        padding: '6px 8px',
        gap: '2px',
      }}>

        {/* Home */}
        <NavItem isDark={isDark} onClick={onHome} label="Home">
          <IconHome2 size={19} color={t.textMuted} />
        </NavItem>

        <Divider isDark={isDark} />

        {/* + Add */}
        <div style={{ padding: '0 2px' }}>
          <motion.button
            onClick={() => { if (!addEnabled) { nudgeSelect(); return } if (addOpen) closeAdd(); else setAddOpen(true) }}
            whileHover={addEnabled ? { scale: 1.04 } : {}}
            whileTap={addEnabled ? { scale: 0.96 } : {}}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: isMobile ? 0 : '5px',
              padding: isMobile ? '8px 10px' : '8px 14px', borderRadius: '14px',
              background: actionBg(addOpen), border: 'none',
              color: actionColor(addOpen), fontFamily: 'inherit',
              fontSize: '13px', fontWeight: addOpen ? 700 : 500,
              cursor: addEnabled ? 'pointer' : 'default',
              transition: 'background 0.2s, color 0.2s',
              letterSpacing: '0.01em',
              minWidth: isMobile ? '40px' : undefined,
            }}
            title={addEnabled ? `Add relation to ${selectedNodeName}` : 'Select a person first'}
          >
            <IconPlus size={15} strokeWidth={2.5} />
            {!isMobile && 'Add'}
          </motion.button>
        </div>

        {/* Edit */}
        {editVisible && (
        <div style={{ padding: '0 2px' }}>
          <motion.button
            onClick={() => editEnabled ? onEdit() : nudgeSelect()}
            whileHover={editEnabled ? { scale: 1.04 } : {}}
            whileTap={editEnabled ? { scale: 0.96 } : {}}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: isMobile ? 0 : '5px',
              padding: isMobile ? '8px 10px' : '8px 14px', borderRadius: '14px',
              background: actionBg(editActive), border: 'none',
              color: actionColor(editActive), fontFamily: 'inherit',
              fontSize: '13px', fontWeight: editActive ? 700 : 500,
              cursor: editEnabled ? 'pointer' : 'default',
              transition: 'background 0.2s, color 0.2s',
              letterSpacing: '0.01em',
              minWidth: isMobile ? '40px' : undefined,
            }}
            title={editEnabled ? `Edit ${selectedNodeName}` : 'Select a person first'}
          >
            <IconPencil size={15} strokeWidth={2} />
            {!isMobile && 'Edit'}
          </motion.button>
        </div>
        )}

        {/* View */}
        <div style={{ padding: '0 2px' }}>
          <motion.button
            onClick={() => actionEnabled ? onView() : nudgeSelect()}
            whileHover={actionEnabled ? { scale: 1.04 } : {}}
            whileTap={actionEnabled ? { scale: 0.96 } : {}}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: isMobile ? 0 : '5px',
              padding: isMobile ? '8px 10px' : '8px 14px', borderRadius: '14px',
              background: actionBg(viewActive), border: 'none',
              color: actionColor(viewActive), fontFamily: 'inherit',
              fontSize: '13px', fontWeight: viewActive ? 700 : 500,
              cursor: actionEnabled ? 'pointer' : 'default',
              transition: 'background 0.2s, color 0.2s',
              letterSpacing: '0.01em',
              minWidth: isMobile ? '40px' : undefined,
            }}
            title={actionEnabled ? `View ${selectedNodeName}` : 'Select a person first'}
          >
            <IconEye size={15} strokeWidth={2} />
            {!isMobile && 'View'}
          </motion.button>
        </div>

        <Divider isDark={isDark} />

        {/* 🗑 Delete */}
        <div style={{ padding: '0 2px' }}>
          <motion.button
            onClick={() => {
              if (!delEnabled) { if (!selectedNodeId) nudgeSelect(); return }
              if (deleteState !== 'idle') { setDeleteState('idle'); setDeleteError('') }
              else setDeleteState('confirm')
            }}
            whileHover={delEnabled ? { scale: 1.04 } : {}}
            whileTap={delEnabled ? { scale: 0.96 } : {}}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '36px', height: '36px', borderRadius: '12px',
              background: delBg, border: 'none',
              color: delColor, fontFamily: 'inherit',
              cursor: delEnabled ? 'pointer' : 'default',
              transition: 'background 0.2s, color 0.2s',
            }}
            title={!selectedNodeId
              ? 'Select a person first'
              : !delEnabled
                ? (deleteDisabledReason ?? 'This person cannot be removed')
                : `Remove ${selectedNodeName}`}
          >
            <IconTrash size={16} strokeWidth={1.8} />
          </motion.button>
        </div>

        <Divider isDark={isDark} />

        {/* Logout */}
        <NavItem isDark={isDark} onClick={handleLogout} label="Logout">
          <IconLogout size={19} color={isDark ? '#9A6A5A' : '#C4A882'} />
        </NavItem>
      </div>
    </div>
  )
}

function NavItem({ children, onClick, label, isDark }: {
  children: React.ReactNode
  onClick: () => void
  label?: string
  isDark: boolean
}) {
  const [hovered, setHovered] = useState(false)
  const hoverBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: '2px', padding: '8px 10px', borderRadius: '14px',
        background: hovered ? hoverBg : 'transparent',
        border: 'none', cursor: 'pointer', fontFamily: 'inherit',
        transition: 'background 0.12s', minWidth: '44px',
      }}
    >
      {children}
      {label && (
        <span style={{
          fontSize: '9.5px', color: isDark ? '#5A4A38' : '#B8956A',
          letterSpacing: '0.04em', fontWeight: 500,
        }}>
          {label}
        </span>
      )}
    </button>
  )
}

function Divider({ isDark }: { isDark: boolean }) {
  return (
    <div style={{
      width: '1px', height: '24px', flexShrink: 0,
      background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
      margin: '0 4px',
    }} />
  )
}
