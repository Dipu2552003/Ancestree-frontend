'use client'

import { motion } from 'framer-motion'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { useGraphStore } from '@/store/graphStore'
import type { PersonData } from '@/types'
import { getTheme } from '@/lib/theme'
import { getInitials } from '@/lib/format/initials'

const PERSON_W = 128
const PHOTO_H  = 118
const STRIP_H  = 40
const TOTAL_W  = PERSON_W * 2 + 1   // 1px divider

function avatarColors(p: PersonData) {
  if (p.isSelf)                    return { from: 'var(--c-primary)', to: 'var(--c-primary-strong)' }
  if (p.isDeceased)                return { from: '#94A3B8', to: '#64748B' }
  if (p.nodeState === 'claimed')   return { from: 'var(--c-primary-strong)', to: 'var(--c-primary-deep)' }
  return                                  { from: 'var(--c-secondary)', to: '#B45309' }
}

function PersonSlice({
  person, isDark, isRight,
}: {
  person: PersonData
  isDark: boolean
  isRight: boolean
}) {
  const t = getTheme(isDark)
  const { from, to } = avatarColors(person)
  const firstName = person.fullName.trim().split(/\s+/)[0]

  return (
    <div style={{ width: `${PERSON_W}px`, flexShrink: 0 }}>
      {/* Photo */}
      <div style={{
        width: `${PERSON_W}px`, height: `${PHOTO_H}px`,
        overflow: 'hidden', position: 'relative',
        background: isDark ? '#1C1714' : '#F5F0E8',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {person.photoUrl ? (
          <img
            src={person.photoUrl} alt={person.fullName}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div style={{
            width: '52px', height: '52px', borderRadius: '50%',
            backgroundImage: `linear-gradient(135deg, ${from}, ${to})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: '18px', fontWeight: 500,
          }}>
            {getInitials(person.fullName)}
          </div>
        )}
        {person.isDeceased && (
          <div style={{
            position: 'absolute', inset: 0,
            background: isDark ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.22)',
          }} />
        )}
      </div>

      {/* Name strip */}
      <div style={{
        height: `${STRIP_H}px`,
        background: isDark ? '#141210' : '#FFFFFF',
        borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'}`,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '0 4px', gap: '2px',
      }}>
        <div style={{
          fontSize: '7.5px', fontWeight: 600, letterSpacing: '0.1em',
          textTransform: 'uppercase' as const,
          color: t.text, textAlign: 'center',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          maxWidth: `${PERSON_W - 8}px`,
        }}>
          {firstName}
        </div>
        {person.relationshipToSelf && (
          <div style={{
            fontSize: '6.5px', letterSpacing: '0.06em',
            color: isDark ? '#7A6A5A' : 'var(--c-secondary)',
            fontStyle: 'italic', textAlign: 'center',
          }}>
            {person.relationshipToSelf}
          </div>
        )}
      </div>
    </div>
  )
}

interface CoupleNodeData {
  person1: PersonData
  person2: PersonData
  pairKey: string
  animDelay?: number
}

const hs = { opacity: 0, width: 1, height: 1, minWidth: 1, minHeight: 1 }

export function CoupleNode({ data }: NodeProps) {
  const { isDark, expandCouple } = useGraphStore()
  const { person1, person2, pairKey, animDelay = 0 } = data as unknown as CoupleNodeData
  const t = getTheme(isDark)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, delay: animDelay / 1000 }}
      style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}
      onClick={() => expandCouple(pairKey)}
      title="Click to expand"
    >
      <Handle id="top"   type="target" position={Position.Top}   style={hs} />
      <Handle id="left"  type="target" position={Position.Left}  style={hs} />
      <Handle id="right" type="target" position={Position.Right} style={hs} />

      <motion.div
        whileHover={{ scale: 1.02, y: -2 }}
        transition={{ type: 'spring', stiffness: 380, damping: 22 }}
        style={{
          display: 'flex',
          width: `${TOTAL_W}px`,
          background: t.cardBg,
          border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.08)',
          boxShadow: isDark
            ? '0 6px 28px rgba(0,0,0,0.70), 0 2px 6px rgba(0,0,0,0.40)'
            : '0 4px 16px rgba(0,0,0,0.14), 0 1px 4px rgba(0,0,0,0.08)',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <PersonSlice person={person1} isDark={isDark} isRight={false} />

        {/* Centre divider with ring icon */}
        <div style={{
          width: '1px',
          background: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)',
          flexShrink: 0,
          position: 'relative',
        }}>
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '18px', height: '18px', borderRadius: '50%',
            background: isDark ? '#2A2520' : 'var(--c-page)',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : '#E8D5B7'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '9px', zIndex: 1,
          }}>
            💍
          </div>
        </div>

        <PersonSlice person={person2} isDark={isDark} isRight />
      </motion.div>

      <Handle id="bottom" type="source" position={Position.Bottom} style={hs} />
      <Handle id="left-s" type="source" position={Position.Left}   style={hs} />
      <Handle id="right-s" type="source" position={Position.Right} style={hs} />

      {/* "Click to expand" hint on hover */}
      <div style={{
        fontSize: '7px', letterSpacing: '0.06em',
        color: isDark ? '#5A4A38' : '#B8956A',
        marginTop: '5px', fontStyle: 'italic',
      }}>
        tap to expand
      </div>
    </motion.div>
  )
}

export const coupleNodeType = { coupleNode: CoupleNode }
