'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { useGraphStore } from '@/store/graphStore'
import type { PersonData } from '@/types'
import { getTheme } from '@/lib/theme'

function splitName(fullName: string): [string, string] {
  const parts = fullName.trim().split(/\s+/)
  return [parts[0] ?? '', parts.slice(1).join(' ')]
}

function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const W = 128
const PHOTO_H = 118
const STRIP_H = 40

function ownerBadge(nodeState: string, isSelf: boolean, firstName: string, isDark: boolean) {
  if (isSelf) return null
  if (nodeState === 'claimed') return {
    text: `Joined · ${firstName}`,
    icon: '✓',
    bg:   isDark ? '#14321A' : '#F0FDF4',
    border: isDark ? '#166534' : '#BBF7D0',
    color: isDark ? '#4ADE80' : '#15803D',
  }
  if (nodeState === 'invited') return {
    text: 'Invite sent',
    icon: '✉',
    bg:   isDark ? '#2D2000' : '#FFFBEB',
    border: isDark ? '#92400E' : '#FDE68A',
    color: isDark ? '#FCD34D' : '#B45309',
  }
  return {
    text: 'Not on Ancestree yet',
    icon: '○',
    bg:   isDark ? '#1C1C1C' : '#F9FAFB',
    border: isDark ? '#374151' : '#E5E7EB',
    color: isDark ? '#9CA3AF' : '#6B7280',
  }
}

function PersonNode({ id, data, selected }: NodeProps) {
  const isDark = useGraphStore(s => s.isDark)
  const isNodeSelected = useGraphStore(s => s.activeNodeId === id)
  const person = data as unknown as PersonData
  const { fullName, birthYear, deathYear, isAlive, isDeceased, nodeState, isSelf, isViewerNode, relationshipToSelf, photoUrl, animDelay, isMatchHighlight } = person
  const [firstName, lastName] = splitName(fullName)
  const [hovered, setHovered] = useState(false)
  const badge = ownerBadge(nodeState, isSelf, firstName, isDark)

  // Long-press → context menu on mobile (fires a custom event caught by page.tsx)
  const lpTimer   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lpStart   = useRef<{ x: number; y: number } | null>(null)
  const lpFired   = useRef(false)

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0]
    lpStart.current = { x: t.clientX, y: t.clientY }
    lpFired.current = false
    lpTimer.current = setTimeout(() => {
      lpFired.current = true
      window.dispatchEvent(new CustomEvent('node-longpress', {
        detail: { nodeId: id, clientX: lpStart.current!.x, clientY: lpStart.current!.y },
      }))
    }, 600)
  }

  const onTouchMove = (e: React.TouchEvent) => {
    if (!lpStart.current || !lpTimer.current) return
    const t = e.touches[0]
    if (Math.abs(t.clientX - lpStart.current.x) > 8 || Math.abs(t.clientY - lpStart.current.y) > 8) {
      clearTimeout(lpTimer.current)
      lpTimer.current = null
    }
  }

  const onTouchEnd = (e: React.TouchEvent) => {
    if (lpTimer.current) { clearTimeout(lpTimer.current); lpTimer.current = null }
    if (lpFired.current) { lpFired.current = false; e.preventDefault() }
    lpStart.current = null
  }

  // ── avatar gradient ──────────────────────────────────────────────
  let avatarFrom = '#C4A882'; let avatarTo = '#9A7B5A'
  if (isSelf)                    { avatarFrom = '#EA580C'; avatarTo = '#C2410C' }
  else if (isDeceased)           { avatarFrom = '#94A3B8'; avatarTo = '#64748B' }
  else if (nodeState === 'claimed') { avatarFrom = '#C2410C'; avatarTo = '#9A3412' }
  else if (nodeState === 'proxy')   { avatarFrom = '#D97706'; avatarTo = '#B45309' }

  // ── theme-aware colours ──────────────────────────────────────────
  const t             = getTheme(isDark)
  const stripBg       = isDark ? '#141210' : '#FFFFFF'
  const stripBorder   = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'
  const lastNameColor = isDark ? 'rgba(237,232,227,0.55)' : 'rgba(26,10,0,0.45)'
  const cardBorder      = isSelf
    ? '2px solid #EA580C'
    : isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.08)'
  const cardShadow      = isNodeSelected
    ? `0 0 0 2.5px #EA580C, ${isDark ? '0 6px 28px rgba(0,0,0,0.70), 0 2px 6px rgba(0,0,0,0.40)' : '0 4px 16px rgba(0,0,0,0.14), 0 1px 4px rgba(0,0,0,0.08)'}`
    : isDark ? '0 6px 28px rgba(0,0,0,0.70), 0 2px 6px rgba(0,0,0,0.40)' : '0 4px 16px rgba(0,0,0,0.14), 0 1px 4px rgba(0,0,0,0.08)'

  const gradId = `grad-${id}-${isDark ? 'd' : 'l'}`

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

      {/* Pulsing ring for exploration highlight */}
      {isMatchHighlight && (
        <>
          <motion.div
            animate={{ boxShadow: ['0 0 0 0px rgba(234,88,12,0.55)', '0 0 0 12px rgba(234,88,12,0)'] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
            style={{ position: 'absolute', inset: -6, borderRadius: '12px', zIndex: -1, pointerEvents: 'none' }}
          />
          <div style={{
            position: 'absolute', top: isSelf ? -36 : -24, left: '50%',
            transform: 'translateX(-50%)', zIndex: 20,
            background: '#EA580C', color: '#fff',
            fontSize: '8px', fontWeight: 700, letterSpacing: '0.08em',
            padding: '3px 10px', borderRadius: '999px',
            whiteSpace: 'nowrap', pointerEvents: 'none',
            boxShadow: '0 2px 8px rgba(234,88,12,0.45)',
          }}>
            POSSIBLE MATCH
          </div>
          <style>{`@keyframes pulse-ring { 0%,100%{opacity:1}50%{opacity:0.5} }`}</style>
        </>
      )}

      {/* Self/perspective badge — outside card, above it.
          - isSelf && isViewerNode → user viewing own tree → "YOU" (solid)
          - isSelf && !isViewerNode → user viewing someone else's tree → "VIEWING" (solid)
          - !isSelf && isViewerNode → user appears somewhere in another tree → "YOU" (outline) */}
      {isSelf && (
        <div style={{
          background: '#EA580C', color: '#fff',
          fontSize: '7px', fontWeight: 700, letterSpacing: '0.12em',
          padding: '2px 8px', marginBottom: '5px',
          textTransform: 'uppercase' as const,
        }}>
          {isViewerNode ? 'YOU' : 'VIEWING'}
        </div>
      )}
      {isViewerNode && !isSelf && (
        <div style={{
          background: 'transparent', color: '#EA580C',
          border: '1px solid #EA580C',
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
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          width: `${W}px`,
          height: `${PHOTO_H + STRIP_H}px`,
          background: t.cardBg,
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
          background: t.photoBg,
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
            fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em',
            textTransform: 'uppercase' as const,
            color: t.text, textAlign: 'center',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            maxWidth: `${W - 10}px`,
          }}>
            {firstName}
          </div>
          {lastName && (
            <div style={{
              fontSize: '10px', fontWeight: 400, letterSpacing: '0.06em',
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

      {/* Hover ownership badge */}
      <AnimatePresence>
        {hovered && badge && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'absolute', top: isSelf ? '-38px' : '-30px',
              left: '50%', transform: 'translateX(-50%)',
              whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 50,
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '4px 10px', borderRadius: '20px',
              background: badge.bg,
              border: `1px solid ${badge.border}`,
              boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
              fontSize: '11px', fontWeight: 500,
              color: badge.color,
            }}
          >
            <span>{badge.icon}</span>
            <span>{badge.text}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default PersonNode
export const nodeTypes = { personNode: PersonNode }
