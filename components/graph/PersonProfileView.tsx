'use client'

import { motion } from 'framer-motion'
import { IconArrowLeft, IconEdit } from '@tabler/icons-react'
import { useGraphStore } from '@/store/graphStore'
import type { Node } from '@xyflow/react'
import type { PersonData } from '@/types'
import { getTheme } from '@/lib/theme'

interface PersonProfileViewProps {
  node: Node
  onBack: () => void
  onEdit?: () => void
}

const CURRENT_YEAR = new Date().getFullYear()

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default function PersonProfileView({ node, onBack, onEdit }: PersonProfileViewProps) {
  const { isDark } = useGraphStore()
  const d = node.data as unknown as PersonData
  const { fullName, birthYear, deathYear, isDeceased, isSelf, relationshipToSelf, photoUrl, nodeState } = d

  // Avatar gradient (mirrors PersonNode logic)
  let avatarFrom = '#C4A882', avatarTo = '#9A7B5A'
  if (isSelf)                      { avatarFrom = '#EA580C'; avatarTo = '#C2410C' }
  else if (isDeceased)             { avatarFrom = '#94A3B8'; avatarTo = '#64748B' }
  else if (nodeState === 'claimed') { avatarFrom = '#C2410C'; avatarTo = '#9A3412' }
  else if (nodeState === 'proxy')   { avatarFrom = '#D97706'; avatarTo = '#B45309' }

  // Theme
  const t        = getTheme(isDark)
  const labelCol = isDark ? '#4A3A2A' : '#C4A882'

  const age = !birthYear
    ? '—'
    : isDeceased && deathYear
      ? `${deathYear - birthYear} years old`
      : `${CURRENT_YEAR - birthYear} years old`

  const lifespan = !birthYear
    ? '—'
    : isDeceased && deathYear
      ? `${birthYear} – ${deathYear}`
      : `${birthYear} – present`

  const stats: { label: string; value: string }[] = [
    { label: 'Age',      value: age },
    { label: 'Lifespan', value: lifespan },
    { label: 'Status',   value: isDeceased ? 'Deceased' : 'Alive' },
    { label: 'Relation', value: isSelf ? 'You' : (relationshipToSelf || '—') },
  ]

  return (
    <motion.div
      key="profile-view"
      initial={{ opacity: 0, filter: 'blur(28px)' }}
      animate={{ opacity: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, filter: 'blur(20px)' }}
      transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: t.pageBg, overflowY: 'auto',
      }}
    >
      {/* ── Hero ── */}
      <motion.div
        initial={{ scale: 1.06 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.65, ease: [0.25, 0.1, 0.25, 1] }}
        style={{ position: 'relative', height: '52vh', overflow: 'hidden', flexShrink: 0 }}
      >
        {photoUrl ? (
          <img
            src={photoUrl} alt={fullName}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div style={{
            width: '100%', height: '100%',
            background: `linear-gradient(160deg, ${avatarFrom}, ${avatarTo})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 0.22, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              style={{ fontSize: '110px', fontWeight: 700, color: 'white', letterSpacing: '-0.03em', userSelect: 'none' }}
            >
              {getInitials(fullName)}
            </motion.span>
          </div>
        )}

        {/* Vignette — fades hero into background */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: '65%',
          background: `linear-gradient(to bottom, transparent, ${t.pageBg})`,
          pointerEvents: 'none',
        }} />

        {/* Back button + Edit button */}
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.25, duration: 0.35 }}
          style={{
            position: 'absolute', top: '20px', left: '20px',
            display: 'flex', alignItems: 'center', gap: '8px',
          }}
        >
          <button
            onClick={onBack}
            style={{
              display: 'flex', alignItems: 'center', gap: '7px',
              background: isDark ? 'rgba(10,8,6,0.60)' : 'rgba(255,251,244,0.75)',
              backdropFilter: 'blur(14px)',
              WebkitBackdropFilter: 'blur(14px)',
              border: `1px solid ${t.border}`,
              borderRadius: '8px', padding: '9px 16px',
              fontSize: '13px', fontWeight: 500, color: t.text,
              cursor: 'pointer', fontFamily: 'inherit',
              boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.5)' : '0 2px 12px rgba(0,0,0,0.08)',
            }}
          >
            <IconArrowLeft size={15} /> Back to tree
          </button>
          {onEdit && (
            <button
              onClick={onEdit}
              style={{
                display: 'flex', alignItems: 'center', gap: '7px',
                background: isDark ? 'rgba(10,8,6,0.60)' : 'rgba(255,251,244,0.75)',
                backdropFilter: 'blur(14px)',
                WebkitBackdropFilter: 'blur(14px)',
                border: `1px solid ${t.border}`,
                borderRadius: '8px', padding: '9px 16px',
                fontSize: '13px', fontWeight: 500, color: '#EA580C',
                cursor: 'pointer', fontFamily: 'inherit',
                boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.5)' : '0 2px 12px rgba(0,0,0,0.08)',
              }}
            >
              <IconEdit size={15} /> Edit
            </button>
          )}
        </motion.div>

        {/* YOU badge */}
        {isSelf && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            style={{
              position: 'absolute', bottom: '22px', left: '28px',
              background: '#EA580C', color: '#fff',
              fontSize: '9px', fontWeight: 700, letterSpacing: '0.14em',
              padding: '4px 12px', textTransform: 'uppercase',
            }}
          >
            YOU
          </motion.div>
        )}
      </motion.div>

      {/* ── Content ── */}
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.18, ease: [0.25, 0.1, 0.25, 1] }}
        style={{ padding: '12px 28px 56px', maxWidth: '640px', margin: '0 auto' }}
      >
        {/* Name + relation */}
        <h1 style={{
          fontSize: '34px', fontWeight: 700, color: t.text,
          margin: '0 0 6px', letterSpacing: '-0.025em', lineHeight: 1.1,
        }}>
          {fullName}
        </h1>

        {(relationshipToSelf || isSelf) && (
          <span style={{
            fontSize: '11px', fontWeight: 600, color: t.textMuted,
            textTransform: 'uppercase', letterSpacing: '0.1em',
          }}>
            {isSelf ? 'Your profile' : relationshipToSelf}
          </span>
        )}

        {/* Divider */}
        <div style={{ height: '1px', background: t.border, margin: '22px 0' }} />

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {stats.map(({ label, value }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.28 + i * 0.06 }}
              style={{
                background: t.cardBg,
                border: `1px solid ${t.border}`,
                borderRadius: '10px',
                padding: '16px 18px',
              }}
            >
              <div style={{
                fontSize: '9px', textTransform: 'uppercase',
                letterSpacing: '0.1em', color: labelCol, marginBottom: '8px',
              }}>
                {label}
              </div>
              <div style={{
                fontSize: '16px', fontWeight: 600, color: t.text,
                letterSpacing: label === 'Lifespan' ? '-0.01em' : 0,
              }}>
                {value}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Deceased memorial note */}
        {isDeceased && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.55 }}
            style={{
              marginTop: '12px', padding: '14px 18px', borderRadius: '10px',
              background: isDark ? '#18100A' : '#FFF0E6',
              border: `1px solid ${isDark ? 'rgba(160,80,30,0.18)' : '#FDDCBC'}`,
              fontSize: '13px', color: t.textMuted, fontStyle: 'italic',
              letterSpacing: '0.01em',
            }}
          >
            In loving memory
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  )
}
