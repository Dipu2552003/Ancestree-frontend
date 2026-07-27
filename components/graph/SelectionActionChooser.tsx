'use client'

// After "Select multiple → Done", ask what to do with the picked people:
// edit their details in bulk, or group them into a home. Two big icon cards.

import { motion } from 'framer-motion'
import { IconX, IconPencil, IconHome } from '@tabler/icons-react'
import { getTheme } from '@/lib/theme'

interface Props {
  count:   number
  isDark:  boolean
  onEdit:  () => void
  onHome:  () => void
  onClose: () => void
}

export default function SelectionActionChooser({ count, isDark, onEdit, onHome, onClose }: Props) {
  const t = getTheme(isDark)
  const cardBg = isDark ? '#141210' : '#fff'
  const border = `1px solid ${t.borderNeutral}`

  const card = (icon: React.ReactNode, title: string, sub: string, onClick: () => void, primary: boolean): React.ReactNode => (
    <button
      onClick={onClick}
      style={{
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        padding: '20px 14px', borderRadius: 14, cursor: 'pointer', fontFamily: 'inherit',
        border: primary ? '1.5px solid var(--c-primary)' : border,
        background: primary ? (isDark ? 'rgb(var(--c-primary-rgb) / 0.10)' : 'rgb(var(--c-primary-rgb) / 0.06)') : 'transparent',
        transition: 'transform 0.12s',
      }}
      onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
      onMouseLeave={e => (e.currentTarget.style.transform = 'none')}
    >
      <span style={{
        width: 46, height: 46, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: primary ? 'var(--c-primary)' : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'),
        color: primary ? '#fff' : t.textMuted,
      }}>
        {icon}
      </span>
      <span style={{ fontSize: 14, fontWeight: 700, color: t.text }}>{title}</span>
      <span style={{ fontSize: 11.5, color: t.textMuted, textAlign: 'center', lineHeight: 1.4 }}>{sub}</span>
    </button>
  )

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 4000, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
    >
      <motion.div
        onClick={e => e.stopPropagation()}
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
        style={{ width: 'min(420px, 100%)', background: cardBg, border, borderRadius: 16, boxShadow: t.shadow, padding: 20 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 4 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: t.text }}>
            <span style={{ color: 'var(--c-primary)' }}>{count}</span> selected
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textMuted, display: 'flex', padding: 2 }}>
            <IconX size={18} />
          </button>
        </div>
        <p style={{ margin: '0 0 16px', fontSize: 12.5, color: t.textMuted }}>What would you like to do with these people?</p>

        <div style={{ display: 'flex', gap: 12 }}>
          {card(<IconHome size={22} />, 'Make a home', 'Group who lives together', onHome, true)}
          {card(<IconPencil size={22} />, 'Edit details', 'Set gotra, village, city', onEdit, false)}
        </div>
      </motion.div>
    </div>
  )
}
