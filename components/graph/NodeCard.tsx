'use client'

import { getTheme } from '@/lib/theme'

// ── Dimensions (1.2× the canvas node) ────────────────────────────────────────
export const CARD_W  = 154
export const CARD_PH = 142   // photo area height
export const CARD_SH = 48    // name-strip height
export const CARD_H  = CARD_PH + CARD_SH   // 190

// ── Helpers ───────────────────────────────────────────────────────────────────
export function cardInitials(full: string): string {
  const p = full.trim().split(/\s+/).filter(Boolean)
  if (!p.length) return '?'
  return p.length === 1 ? p[0].slice(0, 2).toUpperCase() : (p[0][0] + p[p.length - 1][0]).toUpperCase()
}

function splitName(full: string): [string, string] {
  const p = full.trim().split(/\s+/)
  return [p[0] ?? '', p.slice(1).join(' ')]
}

function avatarGrad(nodeState: string, isSelf: boolean, isDeceased: boolean): [string, string] {
  if (isSelf)                    return ['#EA580C', '#C2410C']
  if (isDeceased)                return ['#94A3B8', '#64748B']
  if (nodeState === 'claimed')   return ['#C2410C', '#9A3412']
  return                                ['#D97706', '#B45309']
}

// ── Main card ─────────────────────────────────────────────────────────────────
export interface NodeCardProps {
  fullName:    string
  photoUrl?:   string | null
  nodeState?:  'proxy' | 'invited' | 'claimed'
  isSelf?:     boolean
  isDeceased?: boolean
  isDark:      boolean
}

export function NodeCard({
  fullName, photoUrl,
  nodeState = 'proxy', isSelf = false, isDeceased = false,
  isDark,
}: NodeCardProps) {
  const t = getTheme(isDark)
  const [from, to] = avatarGrad(nodeState, isSelf, isDeceased)
  const [firstName, lastName] = splitName(fullName)

  return (
    <div style={{
      width:  CARD_W,
      height: CARD_H,
      flexShrink: 0,
      background: t.cardBg,
      border: isSelf
        ? '2px solid #EA580C'
        : isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.08)',
      boxShadow: isDark
        ? '0 6px 28px rgba(0,0,0,0.70), 0 2px 6px rgba(0,0,0,0.40)'
        : '0 4px 16px rgba(0,0,0,0.14), 0 1px 4px rgba(0,0,0,0.08)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* ── Photo area ── */}
      <div style={{
        width: CARD_W, height: CARD_PH, flexShrink: 0,
        background: t.photoBg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden', position: 'relative',
      }}>
        {photoUrl
          ? <img src={photoUrl} alt={fullName} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          : <div style={{
              width: 64, height: 64, borderRadius: '50%',
              backgroundImage: `linear-gradient(135deg, ${from}, ${to})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 22, fontWeight: 500, letterSpacing: '0.02em',
            }}>
              {cardInitials(fullName)}
            </div>
        }
        {isDeceased && (
          <div style={{
            position: 'absolute', inset: 0,
            background: isDark ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.22)',
            mixBlendMode: 'multiply',
          }} />
        )}
      </div>

      {/* ── Name strip ── */}
      <div style={{
        width: CARD_W, height: CARD_SH, flexShrink: 0,
        background: isDark ? '#141210' : '#FFFFFF',
        borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'}`,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '0 6px', gap: 2,
      }}>
        <div style={{
          fontSize: 11.5, fontWeight: 600, letterSpacing: '0.08em',
          textTransform: 'uppercase', color: t.text, textAlign: 'center',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          maxWidth: CARD_W - 12,
        }}>
          {firstName}
        </div>
        {lastName && (
          <div style={{
            fontSize: 10, fontWeight: 400, letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: isDark ? 'rgba(237,232,227,0.55)' : 'rgba(26,10,0,0.45)',
            textAlign: 'center',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            maxWidth: CARD_W - 12,
          }}>
            {lastName}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Ghost / empty slot ────────────────────────────────────────────────────────
export function GhostCard({ isDark }: { isDark: boolean }) {
  return (
    <div style={{
      width: CARD_W, height: CARD_H, flexShrink: 0,
      border: `2px dashed ${isDark ? 'rgba(234,88,12,0.22)' : 'rgba(234,88,12,0.2)'}`,
      background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(234,88,12,0.03)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      <div style={{
        flex: `0 0 ${CARD_PH}px`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          border: `2px dashed ${isDark ? 'rgba(234,88,12,0.22)' : 'rgba(234,88,12,0.18)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 26, fontWeight: 200, color: isDark ? 'rgba(234,88,12,0.28)' : 'rgba(234,88,12,0.25)' }}>?</span>
        </div>
      </div>
      <div style={{
        flex: `0 0 ${CARD_SH}px`,
        borderTop: `1px dashed ${isDark ? 'rgba(234,88,12,0.14)' : 'rgba(234,88,12,0.12)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{
          fontSize: 9, fontWeight: 600, letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: isDark ? 'rgba(234,88,12,0.3)' : 'rgba(234,88,12,0.28)',
        }}>
          Select
        </span>
      </div>
    </div>
  )
}
