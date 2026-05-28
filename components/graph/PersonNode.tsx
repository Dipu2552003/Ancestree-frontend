'use client'

import { motion } from 'framer-motion'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { useGraphStore } from '@/store/graphStore'

interface PersonData {
  fullName: string
  birthYear?: number
  deathYear?: number
  isAlive: boolean
  isDeceased: boolean
  nodeState: 'proxy' | 'invited' | 'claimed'
  isSelf: boolean
  generation: number
  relationshipToSelf: string
  photoUrl?: string
  animDelay?: number
}

function splitName(fullName: string): [string, string] {
  const parts = fullName.trim().split(/\s+/)
  return [parts[0] ?? '', parts.slice(1).join(' ')]
}

function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const W = 128
const PHOTO_H = 118
const STRIP_H = 40

function PersonNode({ data, selected }: NodeProps) {
  const { isDark } = useGraphStore()
  const person = data as unknown as PersonData
  const { fullName, birthYear, deathYear, isAlive, isDeceased, nodeState, isSelf, relationshipToSelf, photoUrl, animDelay } = person
  const [firstName, lastName] = splitName(fullName)

  // ── avatar gradient ──────────────────────────────────────────────
  let avatarFrom = '#C4A882'; let avatarTo = '#9A7B5A'
  if (isSelf)                    { avatarFrom = '#EA580C'; avatarTo = '#C2410C' }
  else if (isDeceased)           { avatarFrom = '#94A3B8'; avatarTo = '#64748B' }
  else if (nodeState === 'claimed') { avatarFrom = '#C2410C'; avatarTo = '#9A3412' }
  else if (nodeState === 'proxy')   { avatarFrom = '#D97706'; avatarTo = '#B45309' }

  // ── theme-aware colours ──────────────────────────────────────────
  const cardBg          = isDark ? '#1C1A18' : '#FFFFFF'
  const photoBg         = isDark ? '#252018' : '#F0E6D8'
  const stripBg         = isDark ? '#141210' : '#FFFFFF'
  const stripBorder     = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'
  const nameColor       = isDark ? '#EDE8E3' : '#1A0A00'
  const lastNameColor   = isDark ? 'rgba(237,232,227,0.55)' : 'rgba(26,10,0,0.45)'
  const cardBorder      = isSelf
    ? '2px solid #EA580C'
    : isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.08)'
  const cardShadow      = selected
    ? `0 0 0 2.5px #EA580C, ${isDark ? '0 6px 28px rgba(0,0,0,0.70), 0 2px 6px rgba(0,0,0,0.40)' : '0 4px 16px rgba(0,0,0,0.14), 0 1px 4px rgba(0,0,0,0.08)'}`
    : isDark ? '0 6px 28px rgba(0,0,0,0.70), 0 2px 6px rgba(0,0,0,0.40)' : '0 4px 16px rgba(0,0,0,0.14), 0 1px 4px rgba(0,0,0,0.08)'

  const gradId = `grad-${fullName.replace(/\s/g, '')}-${isDark ? 'd' : 'l'}`

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, delay: (animDelay ?? 0) / 1000 }}
      style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}
    >
      <Handle id="top"   type="target" position={Position.Top}   style={{ opacity: 0, width: 1, height: 1, minWidth: 1, minHeight: 1 }} />
      <Handle id="left"  type="target" position={Position.Left}  style={{ opacity: 0, width: 1, height: 1, minWidth: 1, minHeight: 1 }} />
      <Handle id="right" type="target" position={Position.Right} style={{ opacity: 0, width: 1, height: 1, minWidth: 1, minHeight: 1 }} />

      {/* YOU badge — outside card, above it */}
      {isSelf && (
        <div style={{
          background: '#EA580C', color: '#fff',
          fontSize: '7px', fontWeight: 700, letterSpacing: '0.12em',
          padding: '2px 8px', marginBottom: '5px',
          textTransform: 'uppercase' as const,
        }}>
          YOU
        </div>
      )}

      <motion.div
        whileHover={{ scale: 1.03, y: -2 }}
        transition={{ type: 'spring', stiffness: 380, damping: 22 }}
        style={{
          width: `${W}px`,
          height: `${PHOTO_H + STRIP_H}px`,
          background: cardBg,
          border: cardBorder,
          boxShadow: cardShadow,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Photo / avatar area */}
        <div style={{
          width: `${W}px`,
          height: `${PHOTO_H}px`,
          background: photoBg,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          position: 'relative',
        }}>
          {photoUrl ? (
            <img src={photoUrl} alt={fullName}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          ) : (
            <svg width="0" height="0" style={{ position: 'absolute' }}>
              <defs>
                <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={avatarFrom} />
                  <stop offset="100%" stopColor={avatarTo} />
                </linearGradient>
              </defs>
            </svg>
          )}
          {!photoUrl && (
            <div style={{
              width: '64px', height: '64px',
              borderRadius: '50%',
              background: `url(#${gradId})`,
              // fallback inline gradient since SVG defs don't work in div bg
              backgroundImage: `linear-gradient(135deg, ${avatarFrom}, ${avatarTo})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontSize: '22px', fontWeight: 500,
              letterSpacing: '0.02em',
            }}>
              {getInitials(fullName)}
            </div>
          )}

          {/* Deceased overlay */}
          {isDeceased && (
            <div style={{
              position: 'absolute', inset: 0,
              background: isDark ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.22)',
              mixBlendMode: 'multiply',
            }} />
          )}
        </div>

        {/* Name strip */}
        <div style={{
          width: `${W}px`,
          height: `${STRIP_H}px`,
          background: stripBg,
          borderTop: `1px solid ${stripBorder}`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 5px',
          flexShrink: 0,
          gap: '1px',
        }}>
          <div style={{
            fontSize: '8.5px', fontWeight: 600, letterSpacing: '0.1em',
            textTransform: 'uppercase' as const,
            color: nameColor, textAlign: 'center',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            maxWidth: `${W - 10}px`,
          }}>
            {firstName}
          </div>
          {lastName && (
            <div style={{
              fontSize: '7.5px', fontWeight: 400, letterSpacing: '0.08em',
              textTransform: 'uppercase' as const,
              color: lastNameColor, textAlign: 'center',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              maxWidth: `${W - 10}px`,
            }}>
              {lastName}
            </div>
          )}
        </div>
      </motion.div>

      <Handle id="bottom" type="source" position={Position.Bottom} style={{ opacity: 0, width: 1, height: 1, minWidth: 1, minHeight: 1 }} />
      <Handle id="left-s" type="source" position={Position.Left}  style={{ opacity: 0, width: 1, height: 1, minWidth: 1, minHeight: 1 }} />
      <Handle id="right-s" type="source" position={Position.Right} style={{ opacity: 0, width: 1, height: 1, minWidth: 1, minHeight: 1 }} />

      {relationshipToSelf && (
        <div style={{
          fontSize: '8.5px', letterSpacing: '0.06em',
          color: isDark ? '#7A6A5A' : '#D97706',
          fontStyle: 'italic', textAlign: 'center', marginTop: '7px',
          textTransform: 'uppercase' as const,
        }}>
          {relationshipToSelf}
        </div>
      )}
    </motion.div>
  )
}

export default PersonNode
export const nodeTypes = { personNode: PersonNode }
