'use client'

// WizardNodeCard — polaroid-style preview card for the *new* node being added.
// Renders avatar / photo / initials and a name strip, with a "NEW" badge in the
// corner. Supports a compact variant used by TrioHero (smaller dimensions for
// the family-row preview).

import { AnimatePresence, motion } from 'framer-motion'
import { getTheme } from '@/lib/theme'
import { getInitials } from '@/lib/format/initials'
import { avatarGrad, splitName } from './helpers'

interface WizardNodeCardProps {
  fullName: string
  gender:   string
  photoUrl?: string
  isDark:   boolean
  compact?: boolean
}

export default function WizardNodeCard({
  fullName, gender, photoUrl, isDark, compact = false,
}: WizardNodeCardProps) {
  const W  = compact ? 112 : 154
  const PH = compact ? 102 : 142
  const SH = compact ? 36  : 48
  const H  = PH + SH
  const avatarSize = compact ? 44 : 64
  const symSize    = compact ? 20 : 26
  const initSize   = compact ? 15 : 22

  const t = getTheme(isDark)
  const hasName  = !!fullName.trim()
  const [from, to] = avatarGrad(gender)
  const [fn, ln]   = splitName(fullName)

  return (
    <div style={{
      width: W, height: H, flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden',
      background: t.cardBg,
      border: hasName
        ? (isDark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(0,0,0,0.09)')
        : `2px dashed ${isDark ? 'rgb(var(--c-primary-rgb) / 0.30)' : 'rgb(var(--c-primary-rgb) / 0.25)'}`,
      boxShadow: isDark
        ? '0 6px 28px rgba(0,0,0,0.70), 0 2px 6px rgba(0,0,0,0.40)'
        : '0 4px 16px rgba(0,0,0,0.14), 0 1px 4px rgba(0,0,0,0.08)',
      transition: 'border 0.25s',
    }}>
      <div style={{
        width: W, height: PH, flexShrink: 0, position: 'relative',
        background: t.photoBg,
        display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
      }}>
        {photoUrl ? (
          <img src={photoUrl} alt={fullName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{
            width: avatarSize, height: avatarSize, borderRadius: '50%',
            backgroundImage: `linear-gradient(135deg, ${from}, ${to})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
          }}>
            <AnimatePresence mode="wait">
              {hasName ? (
                <motion.span key="init"
                  initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.7 }}
                  style={{ fontSize: initSize, fontWeight: 500, letterSpacing: '0.02em' }}>
                  {getInitials(fullName)}
                </motion.span>
              ) : (
                <motion.span key="sym"
                  initial={{ opacity: 0 }} animate={{ opacity: 0.9 }} exit={{ opacity: 0 }}
                  style={{ fontSize: symSize, fontWeight: 300, lineHeight: 1 }}>
                  {gender === 'female' ? '♀' : '♂'}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        )}
        <div style={{
          position: 'absolute', top: 7, right: 7,
          fontSize: compact ? 7 : 7.5, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase',
          color: 'var(--c-primary)', background: isDark ? 'rgb(var(--c-primary-rgb) / 0.18)' : 'rgb(var(--c-primary-rgb) / 0.12)',
          border: '1px solid rgb(var(--c-primary-rgb) / 0.28)', padding: '2px 5px', borderRadius: 4,
        }}>
          NEW
        </div>
      </div>
      <div style={{
        width: W, height: SH, flexShrink: 0,
        background: isDark ? '#141210' : '#FFFFFF',
        borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'}`,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '0 6px', gap: 2, overflow: 'hidden',
      }}>
        <AnimatePresence mode="wait">
          {hasName ? (
            <motion.div key="name"
              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ width: '100%', textAlign: 'center' }}>
              <div style={{
                fontSize: compact ? 9.5 : 11.5, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
                color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {fn}
              </div>
              {ln && (
                <div style={{
                  fontSize: compact ? 8.5 : 10, fontWeight: 400, letterSpacing: '0.06em', textTransform: 'uppercase',
                  color: isDark ? 'rgba(237,232,227,0.50)' : 'rgba(26,10,0,0.42)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {ln}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.span key="placeholder"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{
                fontSize: compact ? 7.5 : 8.5, fontWeight: 600, letterSpacing: '0.10em', textTransform: 'uppercase',
                color: isDark ? 'rgb(var(--c-primary-rgb) / 0.35)' : 'rgb(var(--c-primary-rgb) / 0.28)',
              }}>
              type name…
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
