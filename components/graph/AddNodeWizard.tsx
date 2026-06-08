'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  IconX, IconArrowLeft, IconCamera, IconLoader2, IconCheck,
  IconArrowDown, IconHeart, IconArrowsLeftRight,
} from '@tabler/icons-react'
import { getTheme, COLORS } from '@/lib/theme'
import { Z } from '@/lib/zIndex'
import { getInitials } from '@/lib/format/initials'
import type { RelAction } from '@/components/graph/Navbar'

// ── Photo compression ─────────────────────────────────────────────────────────
function compressPhoto(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) return Promise.reject(new Error('Not an image'))
  return new Promise((resolve, reject) => {
    const img = new Image()
    const blobUrl = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(blobUrl)
      const MAX = 480
      const scale = Math.min(1, MAX / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width  = Math.round(img.width  * scale)
      canvas.height = Math.round(img.height * scale)
      const ctx = canvas.getContext('2d')
      if (!ctx) { resolve(canvas.toDataURL()); return }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', 0.78))
    }
    img.onerror = reject
    img.src = blobUrl
  })
}

// ── Types ─────────────────────────────────────────────────────────────────────
type Direction = 'above' | 'below' | 'beside'
type StepId    = 'name' | 'gender' | 'birthdate' | 'photo' | 'marriage' | 'relationship' | 'mother' | 'bio-parents'

export type MarriageStatus =
  | 'married' | 'partner' | 'divorced' | 'widowed' | 'separated' | 'annulled' | 'unknown'

export type AdoptionStatus = 'biological' | 'adopted'

/** Identifies the chosen mother for a new child. Strings are person IDs;
 *  'unknown' means user picked "I don't know"; null means there's only one
 *  spouse so we should auto-fill at the caller. */
export type MotherChoice = string | 'unknown' | null

interface RelConfig {
  label:         string
  impliedGender: 'male' | 'female' | null
  direction:     Direction
  steps:         StepId[]
}

export interface WizardExtras {
  gender?:          string
  birthYear?:       number
  birthMonth?:      number
  birthDay?:        number
  photoUrl?:        string
  // Spouse-only — collected on the 'marriage' step.
  marriageStatus?:  MarriageStatus
  unionYear?:       number
  separationYear?:  number
  // Son/daughter-only — adoption + mother choice + optional bio parents.
  adoptionStatus?:  AdoptionStatus
  motherChoice?:    MotherChoice
  bioMotherName?:   string
  bioFatherName?:   string
}

interface AddNodeWizardProps {
  relAction:  RelAction
  anchorName: string
  isDark:     boolean
  /**
   * Candidate mothers presented on the 'mother' step.
   *   - For son/daughter: anchor's spouses.
   *   - For brother/sister: anchor's multi-spouse parent's spouses,
   *                         anchor's own mother first.
   * The step shows only when this list has 2+ entries.
   * gender/photoUrl are optional — used by the TrioHero preview.
   */
  motherOptions?: { id: string; name: string; gender?: string; photoUrl?: string }[]
  /** Father name for the TrioHero preview. Defaults to anchorName (correct for
   *  child-add, where the anchor IS the father). Pass explicitly for sibling-add
   *  where the father is the anchor's multi-spouse parent, not the anchor itself. */
  fatherName?: string
  onAdd:      (action: RelAction, fullName: string, extras: WizardExtras) => Promise<void>
  onClose:    () => void
}

// ── Relation config ───────────────────────────────────────────────────────────
const REL_CONFIG: Record<RelAction, RelConfig> = {
  father:   { label: 'Father',   impliedGender: 'male',   direction: 'above',  steps: ['name', 'birthdate', 'photo'] },
  mother:   { label: 'Mother',   impliedGender: 'female', direction: 'above',  steps: ['name', 'birthdate', 'photo'] },
  son:      { label: 'Son',      impliedGender: 'male',   direction: 'below',  steps: ['name', 'birthdate', 'photo'] },
  daughter: { label: 'Daughter', impliedGender: 'female', direction: 'below',  steps: ['name', 'birthdate', 'photo'] },
  brother:  { label: 'Brother',  impliedGender: 'male',   direction: 'beside', steps: ['name', 'birthdate', 'photo'] },
  sister:   { label: 'Sister',   impliedGender: 'female', direction: 'beside', steps: ['name', 'birthdate', 'photo'] },
  spouse:   { label: 'Spouse',   impliedGender: null,     direction: 'beside', steps: ['name', 'gender', 'birthdate', 'photo', 'marriage'] },
}

export const RELATION_LABELS: Record<RelAction, string> = {
  father: 'Father', mother: 'Mother', son: 'Son', daughter: 'Daughter',
  brother: 'Brother', sister: 'Sister', spouse: 'Spouse',
}

const GENDER_OPTIONS = [
  { value: 'male',   label: 'Male',          symbol: '♂', color: '#4F86C6' },
  { value: 'female', label: 'Female',        symbol: '♀', color: '#C06FAE' },
  { value: 'other',  label: 'Other/Unknown', symbol: '○', color: '#9CA3AF' },
]

const CURRENT_YEAR = new Date().getFullYear()

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

// ── Helpers ───────────────────────────────────────────────────────────────────
function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? ''
}

function splitName(name: string): [string, string] {
  const p = name.trim().split(/\s+/)
  return [p[0] ?? '', p.slice(1).join(' ')]
}

function avatarGrad(gender: string): [string, string] {
  if (gender === 'male')   return ['#4F86C6', '#2D5E9A']
  if (gender === 'female') return ['#C06FAE', '#9A4A8A']
  return ['#D97706', '#B45309']
}

function labelColor(gender: string): string {
  if (gender === 'male')   return '#4F86C6'
  if (gender === 'female') return '#C06FAE'
  return '#D97706'
}

// ── Slide animation ───────────────────────────────────────────────────────────
const slide = {
  enter:  (d: number) => ({ x: d > 0 ?  48 : -48, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit:   (d: number) => ({ x: d > 0 ? -48 :  48, opacity: 0 }),
}

// ── WizardNodeCard ────────────────────────────────────────────────────────────
function WizardNodeCard({
  fullName, gender, photoUrl, isDark, compact = false,
}: {
  fullName: string; gender: string; photoUrl?: string
  isDark: boolean; compact?: boolean
}) {
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
        : `2px dashed ${isDark ? 'rgba(234,88,12,0.30)' : 'rgba(234,88,12,0.25)'}`,
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
          color: '#EA580C', background: isDark ? 'rgba(234,88,12,0.18)' : 'rgba(234,88,12,0.12)',
          border: '1px solid rgba(234,88,12,0.28)', padding: '2px 5px', borderRadius: 4,
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
                color: isDark ? 'rgba(234,88,12,0.35)' : 'rgba(234,88,12,0.28)',
              }}>
              type name…
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ── AnchorNodeCard ────────────────────────────────────────────────────────────
function AnchorNodeCard({ fullName, isDark, compact = false }: { fullName: string; isDark: boolean; compact?: boolean }) {
  const W  = compact ? 112 : 154
  const PH = compact ? 102 : 142
  const SH = compact ? 36  : 48
  const H  = PH + SH
  const avatarSize = compact ? 44 : 64
  const initSize   = compact ? 15 : 22

  const t = getTheme(isDark)
  const [fn, ln] = splitName(fullName)

  return (
    <div style={{
      width: W, height: H, flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden',
      background: t.cardBg,
      border: isDark ? '1.5px solid rgba(234,88,12,0.28)' : '1.5px solid rgba(234,88,12,0.22)',
      boxShadow: isDark
        ? '0 6px 28px rgba(0,0,0,0.70), 0 2px 6px rgba(0,0,0,0.40)'
        : '0 4px 16px rgba(0,0,0,0.14), 0 1px 4px rgba(0,0,0,0.08)',
    }}>
      <div style={{
        width: W, height: PH, flexShrink: 0,
        background: t.photoBg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          width: avatarSize, height: avatarSize, borderRadius: '50%',
          backgroundImage: 'linear-gradient(135deg, #EA580C, #C2410C)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: initSize, fontWeight: 500, letterSpacing: '0.02em',
        }}>
          {getInitials(fullName)}
        </div>
      </div>
      <div style={{
        width: W, height: SH, flexShrink: 0,
        background: isDark ? '#141210' : '#FFFFFF',
        borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'}`,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '0 6px', gap: 2,
      }}>
        <div style={{
          fontSize: compact ? 9.5 : 11.5, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
          color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: W - 12, textAlign: 'center',
        }}>
          {fn}
        </div>
        {ln && (
          <div style={{
            fontSize: compact ? 8.5 : 10, fontWeight: 400, letterSpacing: '0.06em', textTransform: 'uppercase',
            color: isDark ? 'rgba(237,232,227,0.50)' : 'rgba(26,10,0,0.42)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: W - 12, textAlign: 'center',
          }}>
            {ln}
          </div>
        )}
      </div>
    </div>
  )
}

// ── NodeConnector ─────────────────────────────────────────────────────────────
function NodeConnector({ direction, relAction, isDark }: { direction: Direction; relAction: RelAction; isDark: boolean }) {
  const dashH = `repeating-linear-gradient(to right,${isDark ? 'rgba(234,88,12,0.45)' : 'rgba(234,88,12,0.32)'} 0 5px,transparent 5px 10px)`
  const dashV = `repeating-linear-gradient(to bottom,${isDark ? 'rgba(234,88,12,0.45)' : 'rgba(234,88,12,0.32)'} 0 5px,transparent 5px 10px)`

  const bubbleIcon = direction !== 'beside'
    ? <IconArrowDown size={14} color="#EA580C" />
    : relAction === 'spouse'
      ? <IconHeart size={14} color="#EA580C" />
      : <IconArrowsLeftRight size={14} color="#EA580C" />

  const bubble = (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.5, type: 'spring', stiffness: 340, damping: 22 }}
      style={{
        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
        background: isDark ? '#1C1410' : '#FFF7ED',
        border: `2px solid ${isDark ? 'rgba(234,88,12,0.35)' : 'rgba(234,88,12,0.28)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: `0 0 0 5px ${isDark ? 'rgba(234,88,12,0.07)' : 'rgba(234,88,12,0.06)'}`,
      }}
    >
      {bubbleIcon}
    </motion.div>
  )

  if (direction === 'beside') {
    return (
      <div style={{ flex: '0 1 72px', minWidth: 40, display: 'flex', alignItems: 'center' }}>
        <motion.div
          initial={{ scaleX: 0, opacity: 0 }} animate={{ scaleX: 1, opacity: 1 }}
          transition={{ delay: 0.28, duration: 0.3 }}
          style={{ flex: 1, height: 2, background: dashH, transformOrigin: 'left' }}
        />
        {bubble}
        <motion.div
          initial={{ scaleX: 0, opacity: 0 }} animate={{ scaleX: 1, opacity: 1 }}
          transition={{ delay: 0.65, duration: 0.3 }}
          style={{ flex: 1, height: 2, background: dashH, transformOrigin: 'right' }}
        />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: 60 }}>
      <motion.div
        initial={{ scaleY: 0, opacity: 0 }} animate={{ scaleY: 1, opacity: 1 }}
        transition={{ delay: 0.28, duration: 0.3 }}
        style={{ flex: 1, width: 2, background: dashV, transformOrigin: 'top' }}
      />
      {bubble}
      <motion.div
        initial={{ scaleY: 0, opacity: 0 }} animate={{ scaleY: 1, opacity: 1 }}
        transition={{ delay: 0.65, duration: 0.3 }}
        style={{ flex: 1, width: 2, background: dashV, transformOrigin: 'bottom' }}
      />
    </div>
  )
}

// ── NodeHero ──────────────────────────────────────────────────────────────────
function NodeHero({
  anchorName, newName, gender, direction, relAction, isDark,
}: {
  anchorName: string; newName: string; gender: string
  direction: Direction; relAction: RelAction; isDark: boolean
}) {
  const compact = direction !== 'beside'

  const anchorCard = (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <AnchorNodeCard fullName={anchorName} isDark={isDark} compact={compact} />
      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#EA580C' }}>
        {firstName(anchorName) || 'You'}
      </span>
    </div>
  )

  const newCard = (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <WizardNodeCard fullName={newName} gender={gender} isDark={isDark} compact={compact} />
      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: labelColor(gender) }}>
        {newName.trim() ? firstName(newName) : 'New node'}
      </span>
    </div>
  )

  const connector = <NodeConnector direction={direction} relAction={relAction} isDark={isDark} />

  if (direction === 'above') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {newCard}{connector}{anchorCard}
      </div>
    )
  }
  if (direction === 'below') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {anchorCard}{connector}{newCard}
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      {anchorCard}{connector}{newCard}
    </div>
  )
}

// ── SingleNodePreview ─────────────────────────────────────────────────────────
function SingleNodePreview({ fullName, gender, photoUrl, isDark }: {
  fullName: string; gender: string; photoUrl?: string; isDark: boolean
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <WizardNodeCard fullName={fullName} gender={gender} photoUrl={photoUrl} isDark={isDark} />
      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: labelColor(gender) }}>
        {fullName.trim() ? firstName(fullName) : 'New node'}
      </span>
    </div>
  )
}

// ── Small connectors for TrioHero ─────────────────────────────────────────────
function SmallCoupleLink({ isDark }: { isDark: boolean }) {
  const dashH = `repeating-linear-gradient(to right,${isDark ? 'rgba(234,88,12,0.45)' : 'rgba(234,88,12,0.32)'} 0 5px,transparent 5px 10px)`
  return (
    <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0, padding: '0 4px' }}>
      <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.18, duration: 0.28 }}
        style={{ width: 16, height: 2, background: dashH, transformOrigin: 'left' }} />
      <motion.div
        initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.32, type: 'spring', stiffness: 360, damping: 22 }}
        style={{
          width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
          background: isDark ? '#1C1410' : '#FFF7ED',
          border: `1.5px solid ${isDark ? 'rgba(234,88,12,0.35)' : 'rgba(234,88,12,0.28)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 0 0 3px ${isDark ? 'rgba(234,88,12,0.07)' : 'rgba(234,88,12,0.05)'}`,
        }}>
        <IconHeart size={11} color="#EA580C" />
      </motion.div>
      <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.42, duration: 0.28 }}
        style={{ width: 16, height: 2, background: dashH, transformOrigin: 'right' }} />
    </div>
  )
}

function SmallChildLink({ isDark }: { isDark: boolean }) {
  const dashV = `repeating-linear-gradient(to bottom,${isDark ? 'rgba(234,88,12,0.45)' : 'rgba(234,88,12,0.32)'} 0 5px,transparent 5px 10px)`
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4px 0' }}>
      <motion.div initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ delay: 0.20, duration: 0.28 }}
        style={{ width: 2, height: 14, background: dashV, transformOrigin: 'top' }} />
      <motion.div
        initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.34, type: 'spring', stiffness: 360, damping: 22 }}
        style={{
          width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
          background: isDark ? '#1C1410' : '#FFF7ED',
          border: `1.5px solid ${isDark ? 'rgba(234,88,12,0.35)' : 'rgba(234,88,12,0.28)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
        <IconArrowDown size={11} color="#EA580C" />
      </motion.div>
      <motion.div initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ delay: 0.46, duration: 0.28 }}
        style={{ width: 2, height: 14, background: dashV, transformOrigin: 'bottom' }} />
    </div>
  )
}

// ── VacantMotherSlot — empty placeholder while no wife is picked ──────────────
function VacantMotherSlot({ isDark, label }: { isDark: boolean; label: string }) {
  const W = 112, PH = 102, SH = 36, H = PH + SH
  return (
    <div style={{
      width: W, height: H, flexShrink: 0,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      background: 'transparent',
      border: `2px dashed ${isDark ? 'rgba(234,88,12,0.40)' : 'rgba(234,88,12,0.35)'}`,
      borderRadius: 4,
      color: isDark ? 'rgba(234,88,12,0.62)' : 'rgba(234,88,12,0.55)',
      textAlign: 'center', padding: '0 6px',
    }}>
      <span style={{ fontSize: 26, fontWeight: 300, lineHeight: 1, marginBottom: 6, opacity: 0.65 }}>?</span>
      <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</span>
    </div>
  )
}

// ── TrioHero ──────────────────────────────────────────────────────────────────
// Mother-slot + Father couple-bar, with new-child dropped below. Shown on the
// 'mother' step so the user sees the family forming as they pick the wife.
function TrioHero({
  fatherName, motherName, motherGender, motherPhotoUrl,
  newName, newGender, newPhotoUrl, vacantLabel, isDark,
}: {
  fatherName:   string
  motherName:   string | null      // null = vacant slot
  motherGender?: string
  motherPhotoUrl?: string
  newName:      string
  newGender:    string
  newPhotoUrl?: string
  vacantLabel:  string
  isDark:       boolean
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* Couple row */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <AnimatePresence mode="wait">
            {motherName ? (
              <motion.div key={`mom-${motherName}`}
                initial={{ opacity: 0, scale: 0.86, y: 4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.86, y: -4 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}>
                <WizardNodeCard fullName={motherName} gender={motherGender ?? 'female'} photoUrl={motherPhotoUrl} isDark={isDark} compact />
              </motion.div>
            ) : (
              <motion.div key="mom-vacant"
                initial={{ opacity: 0, scale: 0.86 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.86 }}
                transition={{ duration: 0.18 }}>
                <VacantMotherSlot isDark={isDark} label={vacantLabel} />
              </motion.div>
            )}
          </AnimatePresence>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
            color: motherName ? labelColor(motherGender ?? 'female') : (isDark ? 'rgba(234,88,12,0.55)' : 'rgba(234,88,12,0.50)') }}>
            {motherName ? firstName(motherName) : vacantLabel}
          </span>
        </div>

        <SmallCoupleLink isDark={isDark} />

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <AnchorNodeCard fullName={fatherName} isDark={isDark} compact />
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#EA580C' }}>
            {firstName(fatherName) || 'Father'}
          </span>
        </div>
      </div>

      <SmallChildLink isDark={isDark} />

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <WizardNodeCard fullName={newName} gender={newGender} photoUrl={newPhotoUrl} isDark={isDark} compact />
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: labelColor(newGender) }}>
          {newName.trim() ? firstName(newName) : 'New node'}
        </span>
      </div>
    </div>
  )
}

// ── GenderCard ────────────────────────────────────────────────────────────────
function GenderCard({
  option, selected, isDark, t, fullWidth, onClick,
}: {
  option: typeof GENDER_OPTIONS[0]; selected: boolean
  isDark: boolean; t: ReturnType<typeof getTheme>; fullWidth?: boolean; onClick: () => void
}) {
  const [hov, setHov] = useState(false)
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', flexDirection: fullWidth ? 'row' : 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: fullWidth ? '10px' : '6px',
        padding: fullWidth ? '12px 20px' : '18px 14px',
        borderRadius: '13px', cursor: 'pointer', fontFamily: 'inherit',
        border: `2px solid ${selected ? COLORS.saffron : hov ? option.color + '77' : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.09)'}`,
        background: selected
          ? (isDark ? 'rgba(234,88,12,0.12)' : 'rgba(234,88,12,0.07)')
          : hov ? t.itemHoverBg : isDark ? 'rgba(255,255,255,0.02)' : '#FFFAF5',
        transition: 'border-color 0.15s, background 0.15s',
      }}
    >
      <span style={{ fontSize: fullWidth ? 18 : 24, color: selected ? COLORS.saffron : option.color, lineHeight: 1 }}>
        {option.symbol}
      </span>
      <span style={{ fontSize: 12.5, fontWeight: 600, color: selected ? COLORS.saffron : t.text, transition: 'color 0.15s' }}>
        {option.label}
      </span>
    </motion.button>
  )
}

// ── Main AddNodeWizard ────────────────────────────────────────────────────────
export default function AddNodeWizard({ relAction, anchorName, isDark, motherOptions, fatherName, onAdd, onClose }: AddNodeWizardProps) {
  const t    = getTheme(isDark)
  const cfg  = REL_CONFIG[relAction]

  const [stepIdx,          setStepIdx]          = useState(0)
  const [dir,              setDir]              = useState(1)
  const [fullName,         setFullName]         = useState('')
  const [nameError,        setNameError]        = useState('')
  const [gender,           setGender]           = useState<string>(cfg.impliedGender ?? '')
  const [birthDay,         setBirthDay]         = useState('')
  const [birthMonth,       setBirthMonth]       = useState('')
  const [birthYear,        setBirthYear]        = useState('')
  const [dateError,        setDateError]        = useState('')
  const [dateFieldFocused, setDateFieldFocused] = useState(false)
  const [photoUrl,         setPhotoUrl]         = useState<string | undefined>()
  const [photoUploading,   setPhotoUploading]   = useState(false)
  const [photoHovered,     setPhotoHovered]     = useState(false)
  const [dragOver,         setDragOver]         = useState(false)
  const [saving,           setSaving]           = useState(false)
  const [saved,            setSaved]            = useState(false)

  // Spouse-only — marriage step state
  const [marriageStatus,   setMarriageStatus]   = useState<MarriageStatus>('married')
  const [unionYear,        setUnionYear]        = useState('')
  const [separationYear,   setSeparationYear]   = useState('')
  const [marriageError,    setMarriageError]    = useState('')

  // Son/daughter & brother/sister — adoption + mother choice + bio parents
  const [adoptionStatus,   setAdoptionStatus]   = useState<AdoptionStatus>('biological')
  // Default to the first option so Continue is immediately enabled.
  // First option is: spouse[0] (child case) or anchor's own mother (sibling case).
  const [motherChoice,     setMotherChoice]     = useState<MotherChoice>(
    () => motherOptions?.[0]?.id ?? null,
  )
  const [addBioParents,    setAddBioParents]    = useState(false)
  const [bioMotherName,    setBioMotherName]    = useState('')
  const [bioFatherName,    setBioFatherName]    = useState('')

  // Derived: the effective step list. For son/daughter & brother/sister we
  // extend the base [name, birthdate, photo] list with relationship-specific
  // questions, conditionally adding 'mother' when there are 2+ candidate
  // mothers and 'bio-parents' when the user picks 'adopted'.
  const isChildAdd         = relAction === 'son'     || relAction === 'daughter'
  const isSiblingAdd       = relAction === 'brother' || relAction === 'sister'
  const needsParentChoice  = isChildAdd || isSiblingAdd
  const multiSpouse        = (motherOptions?.length ?? 0) >= 2
  const steps: StepId[] = needsParentChoice
    ? (() => {
        const out: StepId[] = ['name', 'birthdate', 'photo', 'relationship']
        if (multiSpouse)                     out.push('mother')
        if (adoptionStatus === 'adopted')    out.push('bio-parents')
        return out
      })()
    : cfg.steps

  const nameRef  = useRef<HTMLInputElement>(null)
  const dayRef   = useRef<HTMLInputElement>(null)
  const monthRef = useRef<HTMLInputElement>(null)
  const yearRef  = useRef<HTMLInputElement>(null)
  const fileRef  = useRef<HTMLInputElement>(null)

  const currentStep = steps[stepIdx]

  useEffect(() => {
    const id = setTimeout(() => {
      if (currentStep === 'name')      nameRef.current?.focus()
      if (currentStep === 'birthdate') dayRef.current?.focus()
    }, 260)
    return () => clearTimeout(id)
  }, [currentStep])

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', fn)
    return () => document.removeEventListener('keydown', fn)
  }, [onClose])

  const goNext = () => { setDir(1);  setStepIdx(s => s + 1) }
  const goPrev = () => { setDir(-1); setStepIdx(s => s - 1) }

  const handleNameContinue = () => {
    if (!fullName.trim()) { setNameError('Please enter a name'); return }
    setNameError('')
    goNext()
  }

  const handleBirthdateContinue = () => {
    if (birthDay.trim()) {
      const d = parseInt(birthDay)
      if (isNaN(d) || d < 1 || d > 31) { setDateError('Day must be between 1 and 31'); return }
    }
    if (birthMonth.trim()) {
      const m = parseInt(birthMonth)
      if (isNaN(m) || m < 1 || m > 12) { setDateError('Month must be between 1 and 12'); return }
    }
    if (birthYear.trim()) {
      const y = parseInt(birthYear)
      if (isNaN(y) || y <= 0) { setDateError('Enter a valid year'); return }
    }
    setDateError('')
    goNext()
  }

  const handleCreate = useCallback(async (withPhoto = true) => {
    setSaving(true)
    try {
      const yr = birthYear.trim()  ? parseInt(birthYear)  : undefined
      const mo = birthMonth.trim() ? parseInt(birthMonth) : undefined
      const dy = birthDay.trim()   ? parseInt(birthDay)   : undefined
      const uy = unionYear.trim()      ? parseInt(unionYear)      : undefined
      const sy = separationYear.trim() ? parseInt(separationYear) : undefined
      await onAdd(relAction, fullName.trim(), {
        gender:         gender || undefined,
        birthYear:      yr && !isNaN(yr) ? yr : undefined,
        birthMonth:     mo && !isNaN(mo) ? mo : undefined,
        birthDay:       dy && !isNaN(dy) ? dy : undefined,
        photoUrl:       withPhoto ? photoUrl : undefined,
        marriageStatus: relAction === 'spouse' ? marriageStatus : undefined,
        unionYear:      relAction === 'spouse' && uy && !isNaN(uy) ? uy : undefined,
        separationYear: relAction === 'spouse' && sy && !isNaN(sy) ? sy : undefined,
        adoptionStatus: needsParentChoice ? adoptionStatus : undefined,
        motherChoice:   needsParentChoice && multiSpouse ? motherChoice : undefined,
        bioMotherName:  needsParentChoice && adoptionStatus === 'adopted' && addBioParents ? bioMotherName.trim() || undefined : undefined,
        bioFatherName:  needsParentChoice && adoptionStatus === 'adopted' && addBioParents ? bioFatherName.trim() || undefined : undefined,
      })
      setSaved(true)
    } catch {
      setSaving(false)
    }
  }, [relAction, fullName, gender, birthYear, birthMonth, birthDay, photoUrl, marriageStatus, unionYear, separationYear, needsParentChoice, multiSpouse, adoptionStatus, motherChoice, addBioParents, bioMotherName, bioFatherName, onAdd])

  const isLastStep    = stepIdx === steps.length - 1
  const STATUS_ENDED  = new Set<MarriageStatus>(['divorced', 'widowed', 'separated'])

  const processFile = async (file: File) => {
    setPhotoUploading(true)
    try { setPhotoUrl(await compressPhoto(file)) } catch {}
    finally { setPhotoUploading(false) }
  }

  const parsedYear = parseInt(birthYear)
  const ageHint = birthYear.trim() && !isNaN(parsedYear) && parsedYear > 0 && parsedYear <= CURRENT_YEAR
    ? `~ ${CURRENT_YEAR - parsedYear} years old`
    : null

  // formatted date preview shown below the input
  const datePreview = (() => {
    const parts: string[] = []
    if (birthDay.trim())   parts.push(birthDay.padStart(2, '0'))
    if (birthMonth.trim()) {
      const mo = parseInt(birthMonth)
      parts.push(!isNaN(mo) && mo >= 1 && mo <= 12 ? MONTH_NAMES[mo - 1] : birthMonth)
    }
    if (birthYear.trim()) parts.push(birthYear)
    return parts.length ? parts.join(' ') : null
  })()

  // ── Shared styles ─────────────────────────────────────────────────────────
  const btnPrimary: React.CSSProperties = {
    width: '100%', height: '44px', borderRadius: '11px', border: 'none',
    background: saving || saved ? (isDark ? '#1A2A1A' : '#DCFCE7') : COLORS.saffron,
    color: saving || saved ? (isDark ? '#4ADE80' : '#15803D') : '#fff',
    cursor: saving || saved ? 'default' : 'pointer',
    fontSize: '13.5px', fontWeight: 700, fontFamily: 'inherit',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
    transition: 'background 0.2s, color 0.2s',
    boxShadow: saving || saved ? 'none' : '0 2px 10px rgba(234,88,12,0.30)',
  }
  const btnSkip: React.CSSProperties = {
    background: 'none', border: 'none', cursor: 'pointer',
    fontSize: '12px', color: t.textMuted, fontFamily: 'inherit',
    padding: '8px 0', textAlign: 'center', transition: 'color 0.15s',
  }
  const inputStyle: React.CSSProperties = {
    width: '100%', height: '46px', padding: '0 14px',
    fontSize: '15px', fontFamily: 'inherit',
    border: `1.5px solid ${isDark ? 'rgba(234,88,12,0.35)' : 'rgba(234,88,12,0.28)'}`,
    borderRadius: '11px', outline: 'none',
    background: isDark ? 'rgba(255,255,255,0.05)' : '#fff',
    color: t.text, boxSizing: 'border-box', transition: 'border-color 0.15s, box-shadow 0.15s',
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: Z.modal,
        background: isDark ? 'rgba(0,0,0,0.78)' : 'rgba(0,0,0,0.48)',
        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 24 }}
        animate={{ opacity: 1, scale: 1,    y: 0 }}
        exit={{    opacity: 0, scale: 0.92, y: 24 }}
        transition={{ type: 'spring', stiffness: 300, damping: 26 }}
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '520px',
          background: isDark ? '#1C1410' : '#FFFAF5',
          border: `1.5px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(234,88,12,0.14)'}`,
          borderRadius: 22,
          boxShadow: isDark
            ? '0 40px 100px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.04)'
            : '0 40px 100px rgba(0,0,0,0.20), 0 0 0 1px rgba(234,88,12,0.06)',
          overflow: 'hidden',
        }}
      >
        {/* ── Header ── */}
        <div style={{
          padding: '16px 20px 14px',
          borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}`,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <button
            onClick={stepIdx === 0 ? onClose : goPrev}
            style={{
              width: 32, height: 32, borderRadius: 9, flexShrink: 0, border: 'none', cursor: 'pointer',
              background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)', color: t.textMuted,
              display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.12s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.12)')}
            onMouseLeave={e => (e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)')}
          >
            {stepIdx === 0 ? <IconX size={14} /> : <IconArrowLeft size={14} />}
          </button>

          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: t.text, lineHeight: 1.2 }}>
              Add {cfg.label}
            </div>
            <div style={{ fontSize: 11, color: t.textMuted, marginTop: 2 }}>
              to <span style={{ color: COLORS.saffron, fontWeight: 600 }}>{anchorName}</span>'s family
            </div>
          </div>

          <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
            {steps.map((_, i) => (
              <motion.div key={i}
                animate={{
                  width: i === stepIdx ? 18 : 6,
                  background: i <= stepIdx ? COLORS.saffron : isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.10)',
                }}
                transition={{ duration: 0.22 }}
                style={{ height: 5, borderRadius: 3 }}
              />
            ))}
          </div>

          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: 9, flexShrink: 0, border: 'none', cursor: 'pointer',
              background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)', color: t.textMuted,
              display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.12s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.12)')}
            onMouseLeave={e => (e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)')}
          >
            <IconX size={14} />
          </button>
        </div>

        {/* ── Node preview hero ── */}
        {(() => {
          const selectedMother = motherChoice && motherChoice !== 'unknown'
            ? motherOptions?.find(o => o.id === motherChoice) ?? null
            : null
          const triadFatherName = fatherName ?? anchorName
          const triadHeroHeight =
            currentStep === 'name'   ? undefined :
            currentStep === 'mother' ? 260 :
                                       100
          return (
            <div style={{
              padding: currentStep === 'name' ? '24px 28px 20px' : '18px 28px 14px',
              borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(234,88,12,0.09)'}`,
              background: isDark ? 'rgba(255,255,255,0.015)' : 'rgba(234,88,12,0.025)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              minHeight: triadHeroHeight,
            }}>
              <AnimatePresence mode="wait">
                {currentStep === 'name' ? (
                  <motion.div key="two-node"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}>
                    <NodeHero
                      anchorName={anchorName} newName={fullName} gender={gender}
                      direction={cfg.direction} relAction={relAction} isDark={isDark}
                    />
                  </motion.div>
                ) : currentStep === 'mother' ? (
                  <motion.div key="trio-node"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    transition={{ duration: 0.22 }}>
                    <TrioHero
                      fatherName={triadFatherName}
                      motherName={selectedMother?.name ?? null}
                      motherGender={selectedMother?.gender}
                      motherPhotoUrl={selectedMother?.photoUrl}
                      newName={fullName}
                      newGender={gender}
                      newPhotoUrl={photoUrl}
                      vacantLabel="Mother"
                      isDark={isDark}
                    />
                  </motion.div>
                ) : (
                  <motion.div key="one-node"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}>
                    <SingleNodePreview
                      fullName={fullName} gender={gender}
                      photoUrl={currentStep === 'photo' ? photoUrl : undefined}
                      isDark={isDark}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })()}

        {/* ── Step content ── */}
        <div style={{ position: 'relative', overflow: 'hidden' }}>
          <AnimatePresence mode="wait" custom={dir}>

            {/* Step: name */}
            {currentStep === 'name' && (
              <motion.div key="name" custom={dir} variants={slide} initial="enter" animate="center" exit="exit"
                transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
                style={{ padding: '24px 28px 26px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 19, fontWeight: 700, color: t.text, letterSpacing: '-0.01em', lineHeight: 1.2 }}>
                    What is their name?
                  </h2>
                  <p style={{ margin: '5px 0 0', fontSize: 12.5, color: t.textMuted, lineHeight: 1.5 }}>
                    Full name of the {cfg.label.toLowerCase()} you're adding.
                  </p>
                </div>

                <div>
                  <input
                    ref={nameRef}
                    value={fullName}
                    onChange={e => { setFullName(e.target.value); setNameError('') }}
                    onKeyDown={e => { if (e.key === 'Enter') handleNameContinue() }}
                    placeholder="e.g. Ramesh Khandelwal"
                    autoComplete="name"
                    style={{
                      ...inputStyle,
                      borderColor: nameError ? COLORS.error : undefined,
                    }}
                    onFocus={e  => { e.currentTarget.style.borderColor = COLORS.saffron; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(234,88,12,0.10)' }}
                    onBlur={e   => { if (!nameError) { e.currentTarget.style.borderColor = isDark ? 'rgba(234,88,12,0.35)' : 'rgba(234,88,12,0.28)'; e.currentTarget.style.boxShadow = 'none' }}}
                  />
                  <AnimatePresence>
                    {nameError && (
                      <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        style={{ margin: '5px 0 0', fontSize: 11.5, color: COLORS.error }}>
                        {nameError}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>

                <motion.button onClick={handleNameContinue} whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.98 }} style={btnPrimary}>
                  Continue →
                </motion.button>
              </motion.div>
            )}

            {/* Step: gender (spouse only) */}
            {currentStep === 'gender' && (
              <motion.div key="gender" custom={dir} variants={slide} initial="enter" animate="center" exit="exit"
                transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
                style={{ padding: '24px 28px 26px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 19, fontWeight: 700, color: t.text, letterSpacing: '-0.01em', lineHeight: 1.2 }}>
                    Is {firstName(fullName) || 'this person'}…
                  </h2>
                  <p style={{ margin: '5px 0 0', fontSize: 12.5, color: t.textMuted }}>
                    Helps show the right avatar and relationship labels.
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {GENDER_OPTIONS.slice(0, 2).map(g => (
                      <GenderCard key={g.value} option={g} selected={gender === g.value} isDark={isDark} t={t}
                        onClick={() => { setGender(g.value); goNext() }} />
                    ))}
                  </div>
                  <GenderCard option={GENDER_OPTIONS[2]} selected={gender === 'other'} isDark={isDark} t={t} fullWidth
                    onClick={() => { setGender('other'); goNext() }} />
                </div>

                <button onClick={() => { setGender(''); goNext() }} style={btnSkip}
                  onMouseEnter={e => (e.currentTarget.style.color = t.text)}
                  onMouseLeave={e => (e.currentTarget.style.color = t.textMuted)}>
                  Skip — I'll add this later
                </button>
              </motion.div>
            )}

            {/* Step: birthdate */}
            {currentStep === 'birthdate' && (
              <motion.div key="birthdate" custom={dir} variants={slide} initial="enter" animate="center" exit="exit"
                transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
                style={{ padding: '24px 28px 26px', display: 'flex', flexDirection: 'column', gap: 18 }}>

                <div>
                  <h2 style={{ margin: 0, fontSize: 19, fontWeight: 700, color: t.text, letterSpacing: '-0.01em', lineHeight: 1.2 }}>
                    When were they born?
                  </h2>
                  <p style={{ margin: '5px 0 0', fontSize: 12.5, color: t.textMuted }}>
                    Day and month are optional — a year is fine.
                  </p>
                </div>

                {/* ── Segmented date input ── */}
                <div style={{
                  display: 'flex', alignItems: 'stretch',
                  borderRadius: 13,
                  border: `1.5px solid ${
                    dateError       ? COLORS.error
                    : dateFieldFocused ? COLORS.saffron
                    : isDark        ? 'rgba(234,88,12,0.35)'
                    : 'rgba(234,88,12,0.28)'
                  }`,
                  boxShadow: dateFieldFocused && !dateError ? '0 0 0 3px rgba(234,88,12,0.10)' : 'none',
                  background: isDark ? 'rgba(255,255,255,0.05)' : '#fff',
                  overflow: 'hidden',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                }}>

                  {/* Day */}
                  <div style={{
                    flex: '0 0 72px', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    padding: '14px 0 10px',
                    borderRight: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}`,
                  }}>
                    <input
                      ref={dayRef}
                      value={birthDay}
                      onChange={e => {
                        const v = e.target.value.replace(/\D/g, '').slice(0, 2)
                        setBirthDay(v)
                        setDateError('')
                        if (v.length === 2) monthRef.current?.focus()
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleBirthdateContinue()
                      }}
                      onFocus={() => setDateFieldFocused(true)}
                      onBlur={() => setDateFieldFocused(false)}
                      placeholder="DD"
                      inputMode="numeric"
                      style={{
                        width: 44, textAlign: 'center',
                        fontSize: 24, fontWeight: 700, letterSpacing: '0.04em',
                        background: 'transparent', border: 'none', outline: 'none',
                        color: birthDay ? t.text : isDark ? 'rgba(237,232,227,0.20)' : 'rgba(26,10,0,0.20)',
                        fontFamily: 'inherit', lineHeight: 1,
                      }}
                    />
                    <span style={{
                      marginTop: 5, fontSize: 9, fontWeight: 600,
                      letterSpacing: '0.09em', textTransform: 'uppercase',
                      color: t.textMuted,
                    }}>Day</span>
                  </div>

                  {/* Month */}
                  <div style={{
                    flex: 1, display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    padding: '14px 0 10px',
                    borderRight: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}`,
                    position: 'relative',
                  }}>
                    <AnimatePresence mode="wait">
                      {birthMonth ? (
                        <motion.span
                          key="month-name"
                          initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                          style={{
                            fontSize: 13, fontWeight: 700, color: COLORS.saffron,
                            letterSpacing: '0.02em', lineHeight: 1,
                            position: 'absolute', top: '50%', transform: 'translateY(-65%)',
                          }}
                        >
                          {(() => {
                            const m = parseInt(birthMonth)
                            return (!isNaN(m) && m >= 1 && m <= 12) ? MONTH_NAMES[m - 1].slice(0, 3).toUpperCase() : birthMonth
                          })()}
                        </motion.span>
                      ) : null}
                    </AnimatePresence>
                    <input
                      ref={monthRef}
                      value={birthMonth}
                      onChange={e => {
                        const v = e.target.value.replace(/\D/g, '').slice(0, 2)
                        setBirthMonth(v)
                        setDateError('')
                        const n = parseInt(v)
                        if (v.length === 2 || (v.length === 1 && n >= 2)) yearRef.current?.focus()
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Backspace' && birthMonth === '') dayRef.current?.focus()
                        if (e.key === 'Enter') handleBirthdateContinue()
                      }}
                      onFocus={() => setDateFieldFocused(true)}
                      onBlur={() => setDateFieldFocused(false)}
                      placeholder="MM"
                      inputMode="numeric"
                      style={{
                        width: 44, textAlign: 'center',
                        fontSize: 24, fontWeight: 700, letterSpacing: '0.04em',
                        background: 'transparent', border: 'none', outline: 'none',
                        // hide numeric value when showing month name above
                        color: birthMonth ? 'transparent' : isDark ? 'rgba(237,232,227,0.20)' : 'rgba(26,10,0,0.20)',
                        fontFamily: 'inherit', lineHeight: 1,
                      }}
                    />
                    <span style={{
                      marginTop: 5, fontSize: 9, fontWeight: 600,
                      letterSpacing: '0.09em', textTransform: 'uppercase',
                      color: t.textMuted,
                    }}>Month</span>
                  </div>

                  {/* Year */}
                  <div style={{
                    flex: '0 0 96px', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    padding: '14px 0 10px',
                  }}>
                    <input
                      ref={yearRef}
                      value={birthYear}
                      onChange={e => {
                        setBirthYear(e.target.value.replace(/\D/g, '').slice(0, 4))
                        setDateError('')
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Backspace' && birthYear === '') monthRef.current?.focus()
                        if (e.key === 'Enter') handleBirthdateContinue()
                      }}
                      onFocus={() => setDateFieldFocused(true)}
                      onBlur={() => setDateFieldFocused(false)}
                      placeholder="YYYY"
                      inputMode="numeric"
                      style={{
                        width: 64, textAlign: 'center',
                        fontSize: 24, fontWeight: 700, letterSpacing: '0.04em',
                        background: 'transparent', border: 'none', outline: 'none',
                        color: birthYear ? t.text : isDark ? 'rgba(237,232,227,0.20)' : 'rgba(26,10,0,0.20)',
                        fontFamily: 'inherit', lineHeight: 1,
                      }}
                    />
                    <span style={{
                      marginTop: 5, fontSize: 9, fontWeight: 600,
                      letterSpacing: '0.09em', textTransform: 'uppercase',
                      color: t.textMuted,
                    }}>Year</span>
                  </div>
                </div>

                {/* Hint / error / preview row */}
                <div style={{ minHeight: 18, marginTop: -6 }}>
                  <AnimatePresence mode="wait">
                    {dateError ? (
                      <motion.p key="err"
                        initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        style={{ margin: 0, fontSize: 12, color: COLORS.error, textAlign: 'center' }}>
                        {dateError}
                      </motion.p>
                    ) : datePreview && !ageHint ? (
                      <motion.p key="preview"
                        initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        style={{ margin: 0, fontSize: 12.5, color: t.textMuted, textAlign: 'center', fontWeight: 500 }}>
                        {datePreview}
                      </motion.p>
                    ) : ageHint ? (
                      <motion.p key="hint"
                        initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        style={{ margin: 0, fontSize: 12.5, color: COLORS.marigold, fontWeight: 600, textAlign: 'center' }}>
                        {datePreview ? `${datePreview}  ·  ${ageHint}` : ageHint}
                      </motion.p>
                    ) : null}
                  </AnimatePresence>
                </div>

                <motion.button onClick={handleBirthdateContinue} whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.98 }} style={btnPrimary}>
                  Continue →
                </motion.button>

                <button
                  onClick={() => { setBirthDay(''); setBirthMonth(''); setBirthYear(''); setDateError(''); goNext() }}
                  style={btnSkip}
                  onMouseEnter={e => (e.currentTarget.style.color = t.text)}
                  onMouseLeave={e => (e.currentTarget.style.color = t.textMuted)}>
                  Skip — not sure
                </button>
              </motion.div>
            )}

            {/* Step: photo */}
            {currentStep === 'photo' && (
              <motion.div key="photo" custom={dir} variants={slide} initial="enter" animate="center" exit="exit"
                transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
                style={{ padding: '24px 28px 26px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 19, fontWeight: 700, color: t.text, letterSpacing: '-0.01em', lineHeight: 1.2 }}>
                    Add a photo
                    <span style={{ fontSize: 11, fontWeight: 500, color: t.textMuted, marginLeft: 8, letterSpacing: 0 }}>optional</span>
                  </h2>
                  <p style={{ margin: '5px 0 0', fontSize: 12.5, color: t.textMuted }}>
                    Shows on {firstName(fullName) || 'their'}'s node in the family tree.
                  </p>
                </div>

                <div
                  onClick={() => !photoUploading && fileRef.current?.click()}
                  onMouseEnter={() => setPhotoHovered(true)} onMouseLeave={() => setPhotoHovered(false)}
                  onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) processFile(f) }}
                  onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  style={{
                    height: 124, borderRadius: 12, cursor: photoUploading ? 'default' : 'pointer',
                    border: `2px ${dragOver ? 'solid' : 'dashed'} ${
                      dragOver ? COLORS.saffron
                        : photoHovered ? COLORS.saffron + 'AA'
                        : isDark ? 'rgba(234,88,12,0.25)' : 'rgba(234,88,12,0.20)'
                    }`,
                    background: dragOver
                      ? (isDark ? 'rgba(234,88,12,0.08)' : 'rgba(234,88,12,0.05)')
                      : photoUrl ? 'transparent'
                      : isDark ? 'rgba(255,255,255,0.02)' : 'rgba(234,88,12,0.02)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    overflow: 'hidden', position: 'relative', transition: 'border-color 0.15s, background 0.15s',
                  }}
                >
                  {photoUploading ? (
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}>
                      <IconLoader2 size={26} color={COLORS.saffron} />
                    </motion.div>
                  ) : photoUrl ? (
                    <>
                      <img src={photoUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: photoHovered ? 1 : 0 }}
                        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                        <IconCamera size={22} color="#fff" />
                        <span style={{ fontSize: 11, color: '#fff', fontWeight: 600 }}>Change photo</span>
                      </motion.div>
                    </>
                  ) : (
                    <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7 }}>
                      <IconCamera size={24} color={photoHovered ? COLORS.saffron : t.textMuted} style={{ transition: 'color 0.15s' }} />
                      <div>
                        <p style={{ margin: 0, fontSize: 12.5, fontWeight: 600, color: photoHovered ? COLORS.saffron : t.text, transition: 'color 0.15s' }}>
                          Click or drag to upload
                        </p>
                        <p style={{ margin: '2px 0 0', fontSize: 10.5, color: t.textMuted }}>JPG · PNG · WEBP — max 5 MB</p>
                      </div>
                    </div>
                  )}
                </div>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f); e.target.value = '' }} />

                {photoUrl && (
                  <button onClick={() => setPhotoUrl(undefined)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: t.textMuted,
                      fontFamily: 'inherit', padding: 0, textAlign: 'center', textDecoration: 'underline', marginTop: -8 }}>
                    Remove photo
                  </button>
                )}

                <motion.button onClick={() => isLastStep ? handleCreate(true) : goNext()} disabled={saving || saved}
                  whileHover={!saving && !saved ? { scale: 1.015 } : {}}
                  whileTap={!saving && !saved ? { scale: 0.98 } : {}}
                  style={btnPrimary}>
                  {saving && <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}><IconLoader2 size={15} /></motion.div>}
                  {saved  && <IconCheck size={15} strokeWidth={2.5} />}
                  {saving ? 'Adding…' : saved ? 'Added!' : isLastStep ? '✓ Add to family tree' : 'Continue →'}
                </motion.button>

                <button onClick={() => { if (saving || saved) return; if (isLastStep) handleCreate(false); else { setPhotoUrl(undefined); goNext() } }}
                  style={{ ...btnSkip, opacity: saving || saved ? 0.4 : 1, pointerEvents: saving || saved ? 'none' : 'auto' }}
                  onMouseEnter={e => (e.currentTarget.style.color = t.text)}
                  onMouseLeave={e => (e.currentTarget.style.color = t.textMuted)}>
                  Skip for now
                </button>
              </motion.div>
            )}

            {/* Step: marriage (spouse only) */}
            {currentStep === 'marriage' && (
              <motion.div key="marriage" custom={dir} variants={slide} initial="enter" animate="center" exit="exit"
                transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
                style={{ padding: '24px 28px 26px', display: 'flex', flexDirection: 'column', gap: 16 }}>

                <div>
                  <h2 style={{ margin: 0, fontSize: 19, fontWeight: 700, color: t.text, letterSpacing: '-0.01em', lineHeight: 1.2 }}>
                    The marriage
                  </h2>
                  <p style={{ margin: '5px 0 0', fontSize: 12.5, color: t.textMuted }}>
                    Year and status. Everything's optional.
                  </p>
                </div>

                {/* Status grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {([
                    ['married',   'Married'],
                    ['divorced',  'Divorced'],
                    ['widowed',   'Widowed'],
                    ['separated', 'Separated'],
                    ['unknown',   "I don't know"],
                  ] as const).map(([val, label]) => {
                    const active = marriageStatus === val
                    return (
                      <motion.button key={val} type="button"
                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                        onClick={() => { setMarriageStatus(val); setMarriageError('') }}
                        style={{
                          padding: '11px 12px', borderRadius: 11, cursor: 'pointer', fontFamily: 'inherit',
                          border: `1.5px solid ${active ? COLORS.saffron : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.09)'}`,
                          background: active ? (isDark ? 'rgba(234,88,12,0.12)' : 'rgba(234,88,12,0.07)') : isDark ? 'rgba(255,255,255,0.02)' : '#FFFAF5',
                          color: active ? COLORS.saffron : t.text,
                          fontSize: 13, fontWeight: 600, letterSpacing: 0,
                          textAlign: 'left',
                        }}>
                        {label}
                      </motion.button>
                    )
                  })}
                </div>

                {/* Year(s) */}
                <div style={{ display: 'flex', gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: 6, fontSize: 11.5, fontWeight: 600, color: t.textMuted, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                      Year of marriage
                    </label>
                    <input
                      value={unionYear}
                      onChange={e => { setUnionYear(e.target.value.replace(/\D/g, '').slice(0, 4)); setMarriageError('') }}
                      placeholder="e.g. 1985"
                      inputMode="numeric"
                      style={inputStyle}
                    />
                  </div>
                  {STATUS_ENDED.has(marriageStatus) && (
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', marginBottom: 6, fontSize: 11.5, fontWeight: 600, color: t.textMuted, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                        {marriageStatus === 'widowed' ? 'Year of passing' : 'Year it ended'}
                      </label>
                      <input
                        value={separationYear}
                        onChange={e => { setSeparationYear(e.target.value.replace(/\D/g, '').slice(0, 4)); setMarriageError('') }}
                        placeholder="e.g. 2010"
                        inputMode="numeric"
                        style={inputStyle}
                      />
                    </div>
                  )}
                </div>

                {marriageError && (
                  <p style={{ margin: 0, fontSize: 12, color: COLORS.error, textAlign: 'center' }}>{marriageError}</p>
                )}

                <motion.button onClick={() => handleCreate(true)} disabled={saving || saved}
                  whileHover={!saving && !saved ? { scale: 1.015 } : {}}
                  whileTap={!saving && !saved ? { scale: 0.98 } : {}}
                  style={btnPrimary}>
                  {saving && <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}><IconLoader2 size={15} /></motion.div>}
                  {saved  && <IconCheck size={15} strokeWidth={2.5} />}
                  {saving ? 'Adding…' : saved ? 'Added!' : '✓ Add to family tree'}
                </motion.button>

                <button onClick={() => !saving && !saved && handleCreate(true)} style={btnSkip}
                  onMouseEnter={e => (e.currentTarget.style.color = t.text)}
                  onMouseLeave={e => (e.currentTarget.style.color = t.textMuted)}>
                  Skip — I'll add details later
                </button>
              </motion.div>
            )}

            {/* ── Step: relationship (son/daughter — biological vs adopted) ─── */}
            {currentStep === 'relationship' && (
              <motion.div key="relationship" custom={dir} variants={slide} initial="enter" animate="center" exit="exit"
                transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
                style={{ padding: '24px 28px 26px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 19, fontWeight: 700, color: t.text, letterSpacing: '-0.01em', lineHeight: 1.2 }}>
                    Is {firstName(fullName) || (isSiblingAdd ? 'this sibling' : 'this child')} biological or adopted?
                  </h2>
                  <p style={{ margin: '5px 0 0', fontSize: 12.5, color: t.textMuted }}>
                    {isSiblingAdd
                      ? 'Adopted siblings inherit the family but their bio parents are recorded separately.'
                      : 'Affects how parents are connected in the tree.'}
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {(['biological', 'adopted'] as const).map(val => {
                    const active = adoptionStatus === val
                    const label  = val === 'biological' ? 'Biological' : 'Adopted'
                    return (
                      <motion.button key={val} type="button"
                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                        onClick={() => setAdoptionStatus(val)}
                        style={{
                          padding: '16px 12px', borderRadius: 13, cursor: 'pointer', fontFamily: 'inherit',
                          border: `2px solid ${active ? COLORS.saffron : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.09)'}`,
                          background: active ? (isDark ? 'rgba(234,88,12,0.12)' : 'rgba(234,88,12,0.07)') : isDark ? 'rgba(255,255,255,0.02)' : '#FFFAF5',
                          color: active ? COLORS.saffron : t.text,
                          fontSize: 14, fontWeight: 700,
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                        }}>
                        {label}
                      </motion.button>
                    )
                  })}
                </div>

                <motion.button onClick={() => isLastStep ? handleCreate(true) : goNext()} disabled={saving || saved}
                  whileHover={!saving && !saved ? { scale: 1.015 } : {}}
                  whileTap={!saving && !saved ? { scale: 0.98 } : {}}
                  style={btnPrimary}>
                  {saving && <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}><IconLoader2 size={15} /></motion.div>}
                  {saved  && <IconCheck size={15} strokeWidth={2.5} />}
                  {saving ? 'Adding…' : saved ? 'Added!' : isLastStep ? '✓ Add to family tree' : 'Continue →'}
                </motion.button>
              </motion.div>
            )}

            {/* ── Step: mother (multi-spouse only) ──────────────────────────── */}
            {currentStep === 'mother' && (
              <motion.div key="mother" custom={dir} variants={slide} initial="enter" animate="center" exit="exit"
                transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
                style={{ padding: '24px 28px 26px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 19, fontWeight: 700, color: t.text, letterSpacing: '-0.01em', lineHeight: 1.2 }}>
                    Who is {firstName(fullName) || (isSiblingAdd ? 'the sibling' : 'the child')}{adoptionStatus === 'adopted' ? "'s adoptive mother" : "'s mother"}?
                  </h2>
                  <p style={{ margin: '5px 0 0', fontSize: 12.5, color: t.textMuted }}>
                    {isSiblingAdd
                      ? `Pick which wife of ${anchorName}'s father — same mother as ${anchorName} = full sibling; different = half sibling.`
                      : `${anchorName} has more than one spouse — pick the right one.`}
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {(motherOptions ?? []).map(sp => {
                    const active = motherChoice === sp.id
                    return (
                      <button key={sp.id} onClick={() => setMotherChoice(sp.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '11px 13px', borderRadius: 11, cursor: 'pointer',
                          fontFamily: 'inherit', textAlign: 'left',
                          border: `1.5px solid ${active ? COLORS.saffron : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.09)'}`,
                          background: active ? (isDark ? 'rgba(234,88,12,0.12)' : 'rgba(234,88,12,0.07)') : isDark ? 'rgba(255,255,255,0.02)' : '#FFFAF5',
                          color: active ? COLORS.saffron : t.text,
                          fontSize: 13.5, fontWeight: 600,
                        }}>
                        <span style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${active ? COLORS.saffron : t.textMuted}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {active && <span style={{ width: 7, height: 7, borderRadius: '50%', background: COLORS.saffron }} />}
                        </span>
                        <span>{sp.name}</span>
                      </button>
                    )
                  })}
                </div>

                <motion.button onClick={() => motherChoice ? (isLastStep ? handleCreate(true) : goNext()) : undefined}
                  disabled={!motherChoice || saving || saved}
                  whileHover={motherChoice && !saving && !saved ? { scale: 1.015 } : {}}
                  whileTap={motherChoice && !saving && !saved ? { scale: 0.98 } : {}}
                  style={{ ...btnPrimary, opacity: motherChoice ? 1 : 0.5, cursor: motherChoice ? 'pointer' : 'default' }}>
                  {saving && <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}><IconLoader2 size={15} /></motion.div>}
                  {saved  && <IconCheck size={15} strokeWidth={2.5} />}
                  {saving ? 'Adding…' : saved ? 'Added!' : isLastStep ? '✓ Add to family tree' : 'Continue →'}
                </motion.button>
              </motion.div>
            )}

            {/* ── Step: bio-parents (adopted only) ──────────────────────────── */}
            {currentStep === 'bio-parents' && (
              <motion.div key="bio-parents" custom={dir} variants={slide} initial="enter" animate="center" exit="exit"
                transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
                style={{ padding: '24px 28px 26px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 19, fontWeight: 700, color: t.text, letterSpacing: '-0.01em', lineHeight: 1.2 }}>
                    Add biological parents?
                  </h2>
                  <p style={{ margin: '5px 0 0', fontSize: 12.5, color: t.textMuted }}>
                    Stored on {firstName(fullName) || 'the child'}&apos;s record. Won&apos;t appear in the visible tree — only the adoptive parents will.
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {([
                    [true,  'Yes, I know them'],
                    [false, 'Skip for now'],
                  ] as const).map(([val, label]) => {
                    const active = addBioParents === val
                    return (
                      <button key={String(val)}
                        onClick={() => setAddBioParents(val)}
                        style={{
                          padding: '13px 12px', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit',
                          border: `1.5px solid ${active ? COLORS.saffron : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.09)'}`,
                          background: active ? (isDark ? 'rgba(234,88,12,0.12)' : 'rgba(234,88,12,0.07)') : isDark ? 'rgba(255,255,255,0.02)' : '#FFFAF5',
                          color: active ? COLORS.saffron : t.text,
                          fontSize: 13, fontWeight: 600,
                        }}>
                        {label}
                      </button>
                    )
                  })}
                </div>

                <AnimatePresence>
                  {addBioParents && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.22 }}
                      style={{ display: 'flex', flexDirection: 'column', gap: 10, overflow: 'hidden' }}
                    >
                      <div>
                        <label style={{ display: 'block', marginBottom: 6, fontSize: 11.5, fontWeight: 600, color: t.textMuted, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                          Biological mother
                        </label>
                        <input
                          value={bioMotherName}
                          onChange={e => setBioMotherName(e.target.value)}
                          placeholder="Name (optional)"
                          style={inputStyle}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: 6, fontSize: 11.5, fontWeight: 600, color: t.textMuted, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                          Biological father
                        </label>
                        <input
                          value={bioFatherName}
                          onChange={e => setBioFatherName(e.target.value)}
                          placeholder="Name (optional)"
                          style={inputStyle}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.button onClick={() => handleCreate(true)} disabled={saving || saved}
                  whileHover={!saving && !saved ? { scale: 1.015 } : {}}
                  whileTap={!saving && !saved ? { scale: 0.98 } : {}}
                  style={btnPrimary}>
                  {saving && <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}><IconLoader2 size={15} /></motion.div>}
                  {saved  && <IconCheck size={15} strokeWidth={2.5} />}
                  {saving ? 'Adding…' : saved ? 'Added!' : '✓ Add to family tree'}
                </motion.button>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  )
}
