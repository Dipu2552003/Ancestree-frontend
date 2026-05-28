'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  IconHome2, IconPlus, IconSearch, IconUsersGroup, IconX,
  IconArrowUp, IconArrowDown, IconHeart, IconUsers, IconTrash, IconLoader2,
  IconSitemap, IconTimeline, IconBinaryTree2,
} from '@tabler/icons-react'
import type { LayoutId } from '@/lib/layouts'

export type RelAction = 'father' | 'mother' | 'son' | 'daughter' | 'brother' | 'sister' | 'spouse'

interface NavbarProps {
  familyName: string
  selectedNodeId: string | null
  selectedNodeName: string
  canDeleteSelected: boolean
  layoutId: LayoutId
  onHome: () => void
  onAddRelation: (action: RelAction) => void
  onDeleteSelected: () => Promise<void>
  onLayoutChange: (id: LayoutId) => void
  isDark: boolean
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
  { action: 'brother',  label: 'Brother',  icon: <IconUsers size={18} />,     color: '#D97706' },
  { action: 'sister',   label: 'Sister',   icon: <IconUsers size={18} />,     color: '#E06070' },
  { action: 'spouse',   label: 'Spouse',   icon: <IconHeart size={18} />,     color: '#EA580C' },
]

type DeleteState = 'idle' | 'confirm' | 'deleting'

export default function Navbar({
  familyName, selectedNodeId, selectedNodeName,
  canDeleteSelected, layoutId, onHome, onAddRelation, onDeleteSelected, onLayoutChange, isDark,
}: NavbarProps) {
  const [addOpen, setAddOpen]         = useState(false)
  const [layoutOpen, setLayoutOpen]   = useState(false)
  const [deleteState, setDeleteState] = useState<DeleteState>('idle')
  const [deleteError, setDeleteError] = useState('')
  const menuRef = useRef<HTMLDivElement>(null)

  // close menus on outside click
  useEffect(() => {
    if (!addOpen && deleteState === 'idle' && !layoutOpen) return
    const handler = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) {
        setAddOpen(false)
        setDeleteState('idle')
        setDeleteError('')
        setLayoutOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [addOpen, deleteState, layoutOpen])

  // close menus when node deselects
  useEffect(() => {
    if (!selectedNodeId) {
      setAddOpen(false)
      setDeleteState('idle')
      setDeleteError('')
    }
  }, [selectedNodeId])

  const bg      = isDark ? '#1C1A12' : '#FFFFFF'
  const border  = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'
  const shadow  = isDark
    ? '0 -2px 24px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.4)'
    : '0 -2px 24px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.10)'
  const textPrimary = isDark ? '#EDE8E3' : '#1A0A00'
  const textMuted   = isDark ? '#7A6A52' : '#9A6C3C'
  const menuBg      = isDark ? '#18160F' : '#FFFFFF'
  const menuBorder  = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'
  const itemHoverBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'

  const addEnabled = !!selectedNodeId
  const addColor   = addEnabled ? '#EA580C' : (isDark ? '#4A3F35' : '#C4A882')
  const addBg      = addEnabled
    ? (isDark ? 'rgba(234,88,12,0.15)' : 'rgba(234,88,12,0.08)')
    : (isDark ? '#2A2520' : '#F5F0EA')

  const delEnabled = !!selectedNodeId && canDeleteSelected
  const delColor   = delEnabled ? '#EF4444' : (isDark ? '#4A3F35' : '#C4A882')
  const delBg      = deleteState !== 'idle'
    ? (isDark ? 'rgba(239,68,68,0.18)' : 'rgba(239,68,68,0.10)')
    : delEnabled
      ? (isDark ? 'rgba(239,68,68,0.10)' : 'rgba(239,68,68,0.06)')
      : (isDark ? '#2A2520' : '#F5F0EA')

  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed', bottom: '24px', left: '50%',
        transform: 'translateX(-50%)', zIndex: 200,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
      }}
    >
      {/* ── Add relation menu ── */}
      <AnimatePresence>
        {addOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            style={{
              background: menuBg,
              border: `1px solid ${menuBorder}`,
              borderRadius: '16px',
              padding: '16px',
              boxShadow: shadow,
              width: '248px',
            }}
          >
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: '12px',
            }}>
              <div>
                <p style={{ margin: 0, fontSize: '11px', color: textMuted, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  Add relation
                </p>
                <p style={{
                  margin: 0, fontSize: '13px', fontWeight: 600, color: textPrimary,
                  maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {selectedNodeName || 'Selected person'}
                </p>
              </div>
              <button
                onClick={() => setAddOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: textMuted, padding: '2px', display: 'flex' }}
              >
                <IconX size={15} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              {RELATIONS.map(r => (
                <button
                  key={r.action}
                  onClick={() => { onAddRelation(r.action); setAddOpen(false) }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '9px 12px', borderRadius: '10px',
                    border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                    background: 'transparent', color: textPrimary,
                    fontSize: '12.5px', fontWeight: 500,
                    transition: 'background 0.12s',
                    gridColumn: r.action === 'spouse' ? '1 / -1' : 'auto',
                    justifyContent: r.action === 'spouse' ? 'center' : 'flex-start',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = itemHoverBg)}
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

      {/* ── Delete confirm popup ── */}
      <AnimatePresence>
        {deleteState !== 'idle' && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            style={{
              background: menuBg,
              border: `1px solid rgba(239,68,68,0.30)`,
              borderRadius: '16px',
              padding: '16px',
              boxShadow: shadow,
              width: '260px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <p style={{ margin: 0, fontSize: '11px', color: '#EF4444', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>
                Remove person
              </p>
              <button
                onClick={() => { setDeleteState('idle'); setDeleteError('') }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: textMuted, padding: '2px', display: 'flex' }}
              >
                <IconX size={15} />
              </button>
            </div>

            <p style={{ margin: '0 0 12px', fontSize: '13px', color: textPrimary, lineHeight: 1.45 }}>
              Remove <strong>{selectedNodeName}</strong> and all their relationships? This cannot be undone.
            </p>

            {deleteError && (
              <p style={{ margin: '0 0 10px', fontSize: '11.5px', color: '#EF4444' }}>{deleteError}</p>
            )}

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => { setDeleteState('idle'); setDeleteError('') }}
                disabled={deleteState === 'deleting'}
                style={{
                  flex: 1, height: '36px', borderRadius: '10px',
                  border: `1px solid ${menuBorder}`,
                  background: 'transparent', cursor: 'pointer',
                  fontSize: '13px', fontFamily: 'inherit', color: textMuted,
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
                    setDeleteError(err instanceof Error ? err.message : 'Delete failed')
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

      {/* ── Layout picker dropdown ── */}
      <AnimatePresence>
        {layoutOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            style={{
              background: menuBg,
              border: `1px solid ${menuBorder}`,
              borderRadius: '14px',
              padding: '6px',
              boxShadow: shadow,
              width: '152px',
            }}
          >
            {(
              [
                { id: 'default',  label: 'Default',   icon: <IconSitemap     size={16} /> },
                { id: 'timeline', label: 'Timeline',  icon: <IconTimeline    size={16} /> },
                { id: 'fullView', label: 'Full View', icon: <IconBinaryTree2 size={16} /> },
              ] as const
            ).map(opt => {
              const isActive = layoutId === opt.id
              return (
                <button
                  key={opt.id}
                  onClick={() => { onLayoutChange(opt.id); setLayoutOpen(false) }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    width: '100%', padding: '9px 12px', borderRadius: '10px',
                    border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                    fontSize: '12.5px', fontWeight: isActive ? 600 : 500,
                    background: isActive
                      ? (isDark ? 'rgba(234,88,12,0.15)' : 'rgba(234,88,12,0.08)')
                      : 'transparent',
                    color: isActive ? '#EA580C' : textPrimary,
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={e => {
                    if (!isActive) e.currentTarget.style.background = itemHoverBg
                  }}
                  onMouseLeave={e => {
                    if (!isActive) e.currentTarget.style.background = 'transparent'
                  }}
                >
                  <span style={{ color: isActive ? '#EA580C' : textMuted, display: 'flex' }}>
                    {opt.icon}
                  </span>
                  {opt.label}
                </button>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Navbar pill ── */}
      <div style={{
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: '20px',
        boxShadow: shadow,
        display: 'flex', alignItems: 'center',
        padding: '6px 8px',
        gap: '2px',
      }}>

        {/* Family name */}
        <NavItem isDark={isDark} onClick={() => {}}>
          <span style={{ fontSize: '16px', lineHeight: 1 }}>🌸</span>
          <span style={{
            fontSize: '11.5px', fontWeight: 600, color: textPrimary,
            maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {familyName}
          </span>
        </NavItem>

        <Divider isDark={isDark} />

        {/* Home */}
        <NavItem isDark={isDark} onClick={onHome} label="Home">
          <IconHome2 size={19} color={textMuted} />
        </NavItem>

        {/* + Add — primary CTA */}
        <div style={{ padding: '0 2px' }}>
          <motion.button
            onClick={() => addEnabled && setAddOpen(v => !v)}
            whileHover={addEnabled ? { scale: 1.04 } : {}}
            whileTap={addEnabled ? { scale: 0.96 } : {}}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '8px 14px', borderRadius: '14px',
              background: addBg, border: 'none',
              color: addColor, fontFamily: 'inherit',
              fontSize: '13px', fontWeight: 600,
              cursor: addEnabled ? 'pointer' : 'default',
              transition: 'background 0.2s, color 0.2s',
              letterSpacing: '0.01em',
            }}
            title={addEnabled ? `Add relation to ${selectedNodeName}` : 'Select a person first'}
          >
            <IconPlus size={15} strokeWidth={2.5} />
            Add
          </motion.button>
        </div>

        {/* 🗑 Delete */}
        <div style={{ padding: '0 2px' }}>
          <motion.button
            onClick={() => {
              if (!delEnabled) return
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
            title={!selectedNodeId ? 'Select a person first' : `Remove ${selectedNodeName}`}
          >
            <IconTrash size={16} strokeWidth={1.8} />
          </motion.button>
        </div>

        {/* Search */}
        <NavItem isDark={isDark} onClick={() => {}} label="Search">
          <IconSearch size={19} color={textMuted} />
        </NavItem>

        <Divider isDark={isDark} />

        {/* Members */}
        <NavItem isDark={isDark} onClick={() => {}} label="Members">
          <IconUsersGroup size={19} color={textMuted} />
        </NavItem>

        <Divider isDark={isDark} />

        {/* Layout dropdown */}
        <button
          onClick={() => setLayoutOpen(v => !v)}
          title="Switch layout"
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: '2px', padding: '8px 10px', borderRadius: '14px',
            background: layoutId !== 'default'
              ? (isDark ? 'rgba(234,88,12,0.15)' : 'rgba(234,88,12,0.08)')
              : layoutOpen
                ? (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)')
                : 'transparent',
            border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            transition: 'background 0.15s', minWidth: '52px',
          }}
        >
          {layoutId === 'timeline'
            ? <IconTimeline    size={19} color="#EA580C" />
            : layoutId === 'fullView'
              ? <IconBinaryTree2 size={19} color="#EA580C" />
              : <IconSitemap     size={19} color={textMuted} />
          }
          <span style={{
            fontSize: '9.5px',
            color: layoutId !== 'default' ? '#EA580C' : (isDark ? '#5A4A38' : '#B8956A'),
            letterSpacing: '0.04em', fontWeight: 500,
          }}>
            {layoutId === 'default' ? 'Default' : layoutId === 'timeline' ? 'Timeline' : 'Full View'}
          </span>
        </button>
      </div>
    </div>
  )
}

// ── tiny sub-components ───────────────────────────────────────────

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
