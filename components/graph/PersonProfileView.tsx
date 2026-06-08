'use client'

import { useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { IconArrowLeft, IconEdit } from '@tabler/icons-react'
import { useGraphStore } from '@/store/graphStore'
import { useIsMobile } from '@/hooks/useIsMobile'
import type { Node } from '@xyflow/react'
import type { PersonData } from '@/types'
import { getTheme } from '@/lib/theme'
import { Z } from '@/lib/zIndex'

interface PersonProfileViewProps {
  node: Node
  onBack: () => void
  onEdit?: () => void
}

const CURRENT_YEAR = new Date().getFullYear()
const EASE = [0.25, 0.1, 0.25, 1] as const

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const cap = (s?: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '')

export default function PersonProfileView({ node, onBack, onEdit }: PersonProfileViewProps) {
  const { isDark } = useGraphStore()
  const isMobile = useIsMobile()
  const d = node.data as unknown as PersonData
  const {
    fullName, birthYear, deathYear, isDeceased, isSelf, relationshipToSelf,
    photoUrl, nodeState, gender, gotra, religion, nativeVillage, currentCity, occupation,
  } = d

  // Move focus to the "Back" button after the entry animation settles.
  const backRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    const id = setTimeout(() => backRef.current?.focus(), 300)
    return () => clearTimeout(id)
  }, [])

  // Avatar / hero gradient (mirrors PersonNode logic)
  let gFrom = '#C4A882', gTo = '#9A7B5A'
  if (isSelf)                       { gFrom = '#EA580C'; gTo = '#C2410C' }
  else if (isDeceased)              { gFrom = '#94A3B8'; gTo = '#64748B' }
  else if (nodeState === 'claimed') { gFrom = '#C2410C'; gTo = '#9A3412' }
  else if (nodeState === 'proxy')   { gFrom = '#D97706'; gTo = '#B45309' }

  const t        = getTheme(isDark)
  const labelCol = isDark ? '#7A6A52' : '#B5956A'

  const age = !birthYear
    ? '—'
    : isDeceased && deathYear
      ? `${deathYear - birthYear} yrs`
      : `${CURRENT_YEAR - birthYear} yrs`

  const lifespan = !birthYear
    ? '—'
    : isDeceased && deathYear
      ? `${birthYear} – ${deathYear}`
      : `${birthYear} – present`

  // Build the details grid — only include fields that have a value.
  const details = [
    { label: 'Age',            value: age },
    { label: 'Lifespan',       value: lifespan },
    { label: 'Status',         value: isDeceased ? 'Deceased' : 'Alive' },
    { label: 'Relation',       value: isSelf ? 'You' : (relationshipToSelf || '—') },
    gotra         && { label: 'Gotra',          value: gotra },
    nativeVillage && { label: 'Native village', value: nativeVillage },
    gender        && { label: 'Gender',         value: cap(gender) },
    religion      && { label: 'Religion',       value: cap(religion) },
    occupation    && { label: 'Occupation',     value: occupation },
    currentCity   && { label: 'City',           value: currentCity },
  ].filter(Boolean) as { label: string; value: string }[]

  // nodeState pill copy
  const statePill = isSelf
    ? { text: 'You', bg: '#EA580C', fg: '#fff' }
    : nodeState === 'claimed'
      ? { text: 'On Ancestree', bg: isDark ? 'rgba(34,197,94,0.16)' : '#F0FDF4', fg: isDark ? '#4ADE80' : '#15803D' }
      : nodeState === 'invited'
        ? { text: 'Invite sent', bg: isDark ? 'rgba(234,179,8,0.16)' : '#FFFBEB', fg: isDark ? '#FCD34D' : '#B45309' }
        : { text: 'Not on Ancestree yet', bg: isDark ? 'rgba(255,255,255,0.06)' : '#F4F1EC', fg: t.textMuted }

  // ── Responsive sizing ──
  const heroH      = isMobile ? 210 : 300
  const polaroidW  = isMobile ? 168 : 224
  const photoH     = Math.round(polaroidW * 1.08)
  const framePad   = isMobile ? 9 : 12
  const captionH   = isMobile ? 38 : 46
  const polaroidH  = photoH + framePad + captionH
  const overlap    = Math.round(polaroidH * 0.52)

  const caption = isSelf ? 'You' : (relationshipToSelf || fullName.split(/\s+/)[0])

  return (
    <motion.div
      key="profile-view"
      initial={{ opacity: 0, filter: 'blur(24px)' }}
      animate={{ opacity: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, filter: 'blur(18px)' }}
      transition={{ duration: 0.5, ease: EASE }}
      style={{
        position: 'fixed', inset: 0, zIndex: Z.fullscreen,
        background: t.pageBg, overflowY: 'auto',
      }}
    >
      {/* ── Gradient hero band ── */}
      <div style={{ position: 'relative', height: heroH, overflow: 'hidden', flexShrink: 0 }}>
        <motion.div
          initial={{ scale: 1.08 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.7, ease: EASE }}
          style={{
            position: 'absolute', inset: 0,
            background: `linear-gradient(135deg, ${gFrom} 0%, ${gTo} 100%)`,
          }}
        >
          {/* soft radial highlight for depth */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(120% 90% at 20% 0%, rgba(255,255,255,0.28), transparent 55%)',
          }} />
          {/* oversized monogram watermark */}
          <span style={{
            position: 'absolute', right: isMobile ? -10 : 24, top: isMobile ? -28 : -48,
            fontSize: isMobile ? 200 : 300, fontWeight: 800, lineHeight: 1,
            color: 'rgba(255,255,255,0.12)', letterSpacing: '-0.04em',
            userSelect: 'none', pointerEvents: 'none',
          }}>
            {getInitials(fullName).charAt(0)}
          </span>
        </motion.div>

        {/* fade hero into page background */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: '55%',
          background: `linear-gradient(to bottom, transparent, ${t.pageBg})`,
          pointerEvents: 'none',
        }} />

        {/* Back + Edit */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.35 }}
          style={{ position: 'absolute', top: isMobile ? 14 : 20, left: isMobile ? 14 : 20, right: isMobile ? 14 : 'auto', display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <button
            ref={backRef}
            onClick={onBack}
            style={glassBtn(t, isDark, t.text)}
          >
            <IconArrowLeft size={15} /> Back to tree
          </button>
          {onEdit && (
            <button onClick={onEdit} style={glassBtn(t, isDark, '#EA580C')}>
              <IconEdit size={15} /> Edit
            </button>
          )}
        </motion.div>
      </div>

      {/* ── Polaroid + identity ── */}
      <div style={{
        maxWidth: 720, margin: '0 auto',
        padding: isMobile ? `0 16px ${48}px` : `0 28px 72px`,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}>
        {/* Polaroid photo card */}
        <motion.div
          initial={{ opacity: 0, y: 24, rotate: -6, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, rotate: -1.6, scale: 1 }}
          transition={{ type: 'spring', stiffness: 220, damping: 20, delay: 0.12 }}
          whileHover={{ rotate: 0, scale: 1.02 }}
          style={{
            marginTop: -overlap,
            background: '#FFFFFF',
            padding: `${framePad}px ${framePad}px 0`,
            borderRadius: 4,
            boxShadow: '0 18px 50px rgba(0,0,0,0.32), 0 4px 14px rgba(0,0,0,0.18)',
            flexShrink: 0,
          }}
        >
          <div style={{ width: polaroidW, height: photoH, overflow: 'hidden', background: '#EDE6DC', position: 'relative' }}>
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoUrl} alt={fullName} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            ) : (
              <div style={{
                width: '100%', height: '100%',
                background: `linear-gradient(150deg, ${gFrom}, ${gTo})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: polaroidW * 0.32, fontWeight: 700, letterSpacing: '-0.02em',
              }}>
                {getInitials(fullName)}
              </div>
            )}
            {isDeceased && (
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.18)', mixBlendMode: 'multiply' }} />
            )}
          </div>
          {/* caption strip */}
          <div style={{
            height: captionH, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#3A2A1A', fontSize: isMobile ? 13 : 14.5, fontWeight: 600,
            fontStyle: 'italic', letterSpacing: '0.01em',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: polaroidW,
          }}>
            {caption}
          </div>
        </motion.div>

        {/* Name */}
        <motion.h1
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.26, duration: 0.45, ease: EASE }}
          style={{
            margin: isMobile ? '20px 0 0' : '26px 0 0',
            fontSize: isMobile ? 28 : 38, fontWeight: 800, color: t.text,
            letterSpacing: '-0.025em', lineHeight: 1.1, textAlign: 'center',
          }}
        >
          {fullName}
        </motion.h1>

        {/* state pill */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.32, duration: 0.4 }}
          style={{ marginTop: 10 }}
        >
          <span style={{
            display: 'inline-block', padding: '5px 14px', borderRadius: 999,
            background: statePill.bg, color: statePill.fg,
            fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
          }}>
            {statePill.text}
          </span>
        </motion.div>

        {/* ── Details grid ── */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.34, duration: 0.5, ease: EASE }}
          style={{ width: '100%', marginTop: isMobile ? 28 : 40 }}
        >
          <div style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase',
            color: labelCol, marginBottom: 12, textAlign: 'center',
          }}>
            Details
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
            gap: isMobile ? 10 : 12,
          }}>
            {details.map(({ label, value }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.36 + i * 0.04 }}
                style={{
                  background: t.cardBg,
                  border: `1px solid ${t.border}`,
                  borderRadius: 12,
                  padding: isMobile ? '13px 14px' : '15px 17px',
                }}
              >
                <div style={{
                  fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.1em',
                  color: labelCol, marginBottom: 7, fontWeight: 600,
                }}>
                  {label}
                </div>
                <div style={{
                  fontSize: isMobile ? 14.5 : 15.5, fontWeight: 600, color: t.text,
                  lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }} title={value}>
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
              transition={{ delay: 0.6 }}
              style={{
                marginTop: 14, padding: '14px 18px', borderRadius: 12,
                background: isDark ? '#18100A' : '#FFF0E6',
                border: `1px solid ${isDark ? 'rgba(160,80,30,0.18)' : '#FDDCBC'}`,
                fontSize: 13, color: t.textMuted, fontStyle: 'italic',
                textAlign: 'center', letterSpacing: '0.01em',
              }}
            >
              In loving memory
            </motion.div>
          )}
        </motion.div>
      </div>
    </motion.div>
  )
}

function glassBtn(t: ReturnType<typeof getTheme>, isDark: boolean, color: string): React.CSSProperties {
  return {
    display: 'flex', alignItems: 'center', gap: 7,
    background: isDark ? 'rgba(10,8,6,0.55)' : 'rgba(255,251,244,0.78)',
    backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
    border: `1px solid ${isDark ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.6)'}`,
    borderRadius: 9, padding: '9px 15px',
    fontSize: 13, fontWeight: 600, color,
    cursor: 'pointer', fontFamily: 'inherit',
    boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.5)' : '0 2px 12px rgba(0,0,0,0.12)',
    whiteSpace: 'nowrap',
  }
}
