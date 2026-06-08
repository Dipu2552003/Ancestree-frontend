'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { IconGenderMale, IconGenderFemale, IconGenderGenderless, IconUser } from '@tabler/icons-react'
import { useGraphStore } from '@/store/graphStore'
import { getTheme } from '@/lib/theme'
import { getInitials } from '@/lib/format/initials'

export type PolaroidGender = 'male' | 'female' | 'other' | ''

export interface AuthPolaroidData {
  /** Pre-split or full name. Empty string renders as a placeholder line. */
  fullName:    string
  gender?:     PolaroidGender
  birthYear?:  number | null
  photoUrl?:   string | null
  /** Show YOU badge + saffron border. */
  isSelf?:     boolean
  /** Affects badge & avatar gradient when not self. */
  nodeState?:  'proxy' | 'invited' | 'claimed'
  /** Sub-line shown below the card (e.g. family name, "Welcome back"). */
  subtitle?:   string
  /** Optional pill under the polaroid (e.g. "Joining ___"). */
  pill?:       string
}

const W = 196
const PHOTO_H = 196
const STRIP_H = 64

function splitName(fullName: string): [string, string] {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  return [parts[0] ?? '', parts.slice(1).join(' ')]
}

export default function AuthPolaroid({
  fullName, gender = '', birthYear, photoUrl,
  isSelf = false, nodeState = 'proxy', subtitle, pill,
}: AuthPolaroidData) {
  const isDark = useGraphStore(s => s.isDark)
  const t = getTheme(isDark)

  const trimmed = fullName.trim()
  const [first, last] = splitName(trimmed)
  const hasName = !!trimmed

  // ── Avatar gradient (matches PersonNode rules) ─────────────────────────────
  let avatarFrom = '#C4A882', avatarTo = '#9A7B5A'
  if (isSelf)                       { avatarFrom = '#EA580C'; avatarTo = '#C2410C' }
  else if (nodeState === 'claimed') { avatarFrom = '#C2410C'; avatarTo = '#9A3412' }
  else if (nodeState === 'proxy')   { avatarFrom = '#D97706'; avatarTo = '#B45309' }

  const stripBg       = isDark ? '#141210' : '#FFFFFF'
  const stripBorder   = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)'
  const lastNameColor = isDark ? 'rgba(237,232,227,0.55)' : 'rgba(26,10,0,0.45)'
  const cardBorder    = isSelf
    ? '2.5px solid #EA580C'
    : isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.09)'
  const cardShadow    = isDark
    ? '0 14px 50px rgba(0,0,0,0.62), 0 4px 14px rgba(0,0,0,0.40)'
    : '0 14px 50px rgba(0,0,0,0.16), 0 4px 14px rgba(0,0,0,0.08)'

  // Gender icon — bigger so it reads from a distance
  const GenderIcon =
    gender === 'male'   ? IconGenderMale   :
    gender === 'female' ? IconGenderFemale :
    gender === 'other'  ? IconGenderGenderless :
    null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', pointerEvents: 'none' }}>

      {/* ── Soft saffron radial halo behind the card ─────────────────── */}
      <div style={{
        position: 'absolute', width: 460, height: 460,
        background: isDark
          ? 'radial-gradient(circle, rgba(234,88,12,0.18) 0%, rgba(234,88,12,0) 65%)'
          : 'radial-gradient(circle, rgba(234,88,12,0.22) 0%, rgba(234,88,12,0) 65%)',
        pointerEvents: 'none', zIndex: 0,
      }} />

      {/* ── YOU badge ─────────────────────────────────────────────────── */}
      {isSelf && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18, duration: 0.32 }}
          style={{
            background: '#EA580C', color: '#fff',
            fontSize: 10, fontWeight: 800, letterSpacing: '0.18em',
            padding: '4px 14px', marginBottom: 10,
            textTransform: 'uppercase',
            boxShadow: '0 3px 14px rgba(234,88,12,0.45)',
            zIndex: 2, position: 'relative',
          }}
        >
          YOU
        </motion.div>
      )}

      {/* ── Card ──────────────────────────────────────────────────────── */}
      <motion.div
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          width: W, height: PHOTO_H + STRIP_H,
          background: t.cardBg,
          border: cardBorder,
          boxShadow: cardShadow,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          position: 'relative', zIndex: 1,
        }}
      >
        {/* Photo area */}
        <div style={{
          width: W, height: PHOTO_H,
          background: t.photoBg,
          flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden', position: 'relative',
        }}>
          <AnimatePresence mode="wait">
            {photoUrl ? (
              <motion.img
                key="photo"
                src={photoUrl}
                alt={trimmed || 'photo'}
                initial={{ opacity: 0, scale: 1.08 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            ) : (
              <motion.div
                key={`avatar-${gender}-${hasName ? 'i' : 'blank'}`}
                initial={{ opacity: 0, scale: 0.86 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.86 }}
                transition={{ type: 'spring', stiffness: 360, damping: 22 }}
                style={{
                  width: 108, height: 108, borderRadius: '50%',
                  backgroundImage: `linear-gradient(135deg, ${avatarFrom}, ${avatarTo})`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: 38, fontWeight: 500,
                  letterSpacing: '0.03em',
                  boxShadow: 'inset 0 -8px 22px rgba(0,0,0,0.18)',
                }}
              >
                {GenderIcon ? (
                  <GenderIcon size={56} strokeWidth={1.5} />
                ) : hasName ? (
                  getInitials(trimmed)
                ) : (
                  <IconUser size={50} strokeWidth={1.4} />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Name strip */}
        <div style={{
          width: W, height: STRIP_H,
          background: stripBg,
          borderTop: `1px solid ${stripBorder}`,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '0 10px', flexShrink: 0, gap: 2,
        }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={first || 'placeholder-first'}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              style={{
                fontSize: 16, fontWeight: 600, letterSpacing: '0.10em',
                textTransform: 'uppercase',
                color: hasName ? t.text : (isDark ? 'rgba(237,232,227,0.30)' : 'rgba(26,10,0,0.25)'),
                textAlign: 'center',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                maxWidth: W - 20,
              }}
            >
              {first || '—'}
            </motion.div>
          </AnimatePresence>

          <AnimatePresence>
            {last && (
              <motion.div
                key={last}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.22, delay: 0.06 }}
                style={{
                  fontSize: 12, fontWeight: 400, letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: lastNameColor,
                  textAlign: 'center',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  maxWidth: W - 20,
                }}
              >
                {last}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* ── Subtitle (small italic below card) ─────────────────────────── */}
      {(subtitle || birthYear) && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28, duration: 0.30 }}
          style={{
            marginTop: 14, fontSize: 11.5, letterSpacing: '0.10em',
            color: isDark ? '#9A8870' : '#9A6C3C',
            fontStyle: 'italic', textAlign: 'center',
            textTransform: 'uppercase',
            zIndex: 2, position: 'relative',
            maxWidth: 260,
          }}
        >
          {subtitle}
          {subtitle && birthYear ? ' · ' : ''}
          {birthYear ? `Born ${birthYear}` : ''}
        </motion.div>
      )}

      {/* ── Optional pill (e.g. "Joining Khandelwal Family") ───────────── */}
      {pill && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.40, duration: 0.30 }}
          style={{
            marginTop: 12,
            padding: '6px 14px', borderRadius: 999,
            background: isDark ? 'rgba(234,88,12,0.12)' : 'rgba(234,88,12,0.08)',
            border: `1px solid ${isDark ? 'rgba(234,88,12,0.30)' : 'rgba(234,88,12,0.22)'}`,
            color: '#EA580C',
            fontSize: 11.5, fontWeight: 700, letterSpacing: '0.04em',
            zIndex: 2, position: 'relative',
          }}
        >
          {pill}
        </motion.div>
      )}
    </div>
  )
}
