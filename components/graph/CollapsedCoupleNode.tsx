'use client'

import { motion } from 'framer-motion'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { useGraphStore } from '@/store/graphStore'
import type { PersonData } from '@/types'
import { getTheme } from '@/lib/theme'
import { getInitials } from '@/lib/format/initials'

const TOTAL_W = 260   // spans the same visual space as an expanded couple
const PHOTO_H = 100
const STRIP_H = 48

function avatarBg(person: PersonData): [string, string] {
  if (person.isSelf)                   return ['#EA580C', '#C2410C']
  if (person.isDeceased)               return ['#94A3B8', '#64748B']
  if (person.nodeState === 'claimed')  return ['#C2410C', '#9A3412']
  return ['#D97706', '#B45309']
}

interface CollapsedCoupleData {
  person1: PersonData
  person2: PersonData
  unitKey: string
  leftId: string
  rightId: string
  hiddenChildCount: number
  totalDescendants: number
  animDelay?: number
}

const hs = { opacity: 0, width: 1, height: 1, minWidth: 1, minHeight: 1 }
const HALF = TOTAL_W / 2

function MiniPhoto({ person, isDark }: { person: PersonData; isDark: boolean }) {
  const [from, to] = avatarBg(person)
  const size = 52
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      overflow: 'hidden', flexShrink: 0,
      border: `2px solid ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.9)'}`,
      boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
    }}>
      {person.photoUrl ? (
        <img src={person.photoUrl} alt={person.fullName}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      ) : (
        <div style={{
          width: '100%', height: '100%',
          backgroundImage: `linear-gradient(135deg, ${from}, ${to})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: '16px', fontWeight: 600,
        }}>
          {getInitials(person.fullName)}
        </div>
      )}
    </div>
  )
}

export function CollapsedCoupleNode({ data }: NodeProps) {
  const { isDark, toggleCollapse } = useGraphStore()
  const {
    person1, person2, unitKey,
    hiddenChildCount, totalDescendants, animDelay = 0,
  } = data as unknown as CollapsedCoupleData
  const t = getTheme(isDark)

  const firstName1 = person1.fullName.trim().split(/\s+/)[0]
  const firstName2 = person2.fullName.trim().split(/\s+/)[0]

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35, delay: animDelay / 1000 }}
      style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}
      onClick={() => toggleCollapse(unitKey)}
      title="Click to expand this family"
    >
      <Handle id="top"    type="target" position={Position.Top}    style={{ ...hs, left: HALF }} />
      <Handle id="left"   type="target" position={Position.Left}   style={hs} />
      <Handle id="right"  type="target" position={Position.Right}  style={hs} />

      <motion.div
        whileHover={{ scale: 1.03, y: -2 }}
        transition={{ type: 'spring', stiffness: 380, damping: 22 }}
        style={{
          width: `${TOTAL_W}px`,
          background: t.cardBg,
          border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.09)',
          boxShadow: isDark
            ? '0 6px 24px rgba(0,0,0,0.65)'
            : '0 4px 16px rgba(0,0,0,0.12)',
          overflow: 'hidden',
        }}
      >
        {/* Photo area */}
        <div style={{
          height: `${PHOTO_H}px`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: '16px',
          background: isDark ? '#1A1512' : '#FAF4EE',
          position: 'relative',
        }}>
          <MiniPhoto person={person1} isDark={isDark} />

          {/* Ring divider */}
          <div style={{
            fontSize: '14px', lineHeight: 1,
            color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.25)',
          }}>
            💍
          </div>

          <MiniPhoto person={person2} isDark={isDark} />

          {/* Expand hint */}
          <div style={{
            position: 'absolute', top: '6px', right: '8px',
            fontSize: '9px', color: isDark ? '#5A4A38' : '#B8956A',
            letterSpacing: '0.04em',
          }}>
            ↕ expand
          </div>
        </div>

        {/* Name + count strip */}
        <div style={{
          height: `${STRIP_H}px`,
          background: isDark ? '#141210' : '#FFFFFF',
          borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'}`,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: '3px', padding: '0 8px',
        }}>
          <div style={{
            fontSize: '8px', fontWeight: 700, letterSpacing: '0.1em',
            textTransform: 'uppercase' as const, color: t.text,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            maxWidth: `${TOTAL_W - 16}px`, textAlign: 'center',
          }}>
            {firstName1} &amp; {firstName2}
          </div>
          {person1.relationshipToSelf && (
            <div style={{
              fontSize: '7px', color: isDark ? '#7A6A5A' : '#D97706',
              fontStyle: 'italic',
            }}>
              {person1.relationshipToSelf}
            </div>
          )}
          {hiddenChildCount > 0 && (
            <div style={{
              fontSize: '7px', letterSpacing: '0.05em',
              color: isDark ? '#4A3F35' : '#C4A882',
            }}>
              ▼ {hiddenChildCount} {hiddenChildCount === 1 ? 'child' : 'children'}
              {totalDescendants > hiddenChildCount ? ` · ${totalDescendants} members` : ''}
            </div>
          )}
        </div>
      </motion.div>

      <Handle id="bottom"  type="source" position={Position.Bottom}  style={{ ...hs, left: HALF }} />
      <Handle id="left-s"  type="source" position={Position.Left}    style={hs} />
      <Handle id="right-s" type="source" position={Position.Right}   style={hs} />
    </motion.div>
  )
}

export const collapsedCoupleNodeType = { collapsedCouple: CollapsedCoupleNode }
