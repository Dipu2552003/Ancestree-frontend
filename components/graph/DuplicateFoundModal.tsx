'use client'

import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { IconX, IconSearch, IconArrowRight } from '@tabler/icons-react'
import type { PotentialMatch } from '@/lib/api'
import type { MyPersonInfo, PendingMatchData } from '@/types'
import { getTheme } from '@/lib/theme'
import { NodeCard, CARD_W, CARD_H } from './NodeCard'

interface SourceNode {
  photoUrl:  string | null
  nodeState: string
}

interface DuplicateFoundModalProps {
  newPersonId:  string
  myInfo:       MyPersonInfo
  matches:      PotentialMatch[]
  isDark:       boolean
  onDismiss:    () => void
  /** Present when opened from right-click → Merge (not from add-node flow) */
  sourceNode?:  SourceNode
}

function confidence(score: number) {
  if (score >= 70) return { label: 'Strong match',   color: '#EA580C' }
  if (score >= 40) return { label: 'Possible match', color: '#D97706' }
  return               { label: 'Weak match',        color: '#64748B' }
}

/** Same shape as searchMetaPieces in NodeCard, joined to a single string.
 *  Keeps the new "Father: … · village haal city" identity convention
 *  consistent between search results and the duplicate-found modal. */
function personMetaLine(m: PotentialMatch): string {
  const pieces: string[] = []
  if (m.father_name) pieces.push(`Father: ${m.father_name}`)
  const places = [m.native_village, m.current_city].filter(Boolean) as string[]
  if (places.length > 0) pieces.push(places.join(' haal '))
  return pieces.join(' · ')
}

export default function DuplicateFoundModal({
  newPersonId, myInfo, matches, isDark, onDismiss, sourceNode,
}: DuplicateFoundModalProps) {
  const t = getTheme(isDark)
  const router = useRouter()

  const hasSourceCard = !!sourceNode

  function viewInTheirTree(match: PotentialMatch) {
    const data: PendingMatchData = {
      myPersonId:          newPersonId,
      myPersonName:        myInfo.fullName,
      myBirthYear:         myInfo.birthYear ?? null,
      myNativeVillage:     myInfo.nativeVillage ?? null,
      myGotra:             myInfo.gotra ?? null,
      myGender:            myInfo.gender ?? null,
      myPhotoUrl:          myInfo.photoUrl ?? null,
      matchScore:          match.match_score,
      matchedFields:       match.matched_fields,
      canonicalPersonId:   match.id,
      canonicalFamilyName: match.family_name,
      canonicalPersonName: match.full_name,
      mode:                'explore',
    }
    sessionStorage.setItem('pendingMatch', JSON.stringify(data))
    onDismiss()
    router.push(`/graph?perspective=${match.id}&match=${newPersonId}`)
  }

  return (
    <AnimatePresence>
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed', inset: 0, zIndex: 300,
          background: 'rgba(0,0,0,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '16px',
        }}
        onClick={e => { if (e.target === e.currentTarget) onDismiss() }}
      >
        <motion.div
          key="modal"
          initial={{ opacity: 0, scale: 0.94, y: 10 }}
          animate={{ opacity: 1, scale: 1,    y: 0  }}
          exit={{    opacity: 0, scale: 0.94, y: 10 }}
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          style={{
            background:   t.panelBg,
            border:       `1.5px solid ${t.borderNeutral}`,
            borderRadius: '20px',
            boxShadow:    t.shadow,
            width:        '100%',
            maxWidth:     hasSourceCard ? '620px' : '420px',
            overflow:     'hidden',
            display:      'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header */}
          <div style={{
            padding: '18px 18px 14px',
            borderBottom: `1px solid ${t.borderNeutral}`,
            display: 'flex', gap: '12px', alignItems: 'flex-start',
          }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
              background: 'rgba(234,88,12,0.10)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <IconSearch size={16} color="#EA580C" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: t.text, marginBottom: '3px' }}>
                {matches.length === 1
                  ? 'Possible match found in another tree'
                  : `${matches.length} possible matches found`}
              </div>
              <p style={{ margin: 0, fontSize: '12px', color: t.textMuted, lineHeight: 1.5 }}>
                <strong style={{ color: t.text }}>{myInfo.fullName}</strong> may already exist in another family. Explore their tree first to see where this person fits before deciding.
              </p>
            </div>
            <button
              onClick={onDismiss}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textMuted, padding: '2px', flexShrink: 0, display: 'flex' }}
            >
              <IconX size={15} />
            </button>
          </div>

          {/* Body — two columns when sourceNode is present */}
          <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>

            {/* Left: match list */}
            <div style={{ flex: 1, minWidth: 0, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {matches.map(match => {
                const conf = confidence(match.match_score)
                return (
                  <div
                    key={match.id}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      gap: '12px', padding: '12px 14px', borderRadius: '13px',
                      background: isDark ? 'rgba(255,255,255,0.035)' : '#FFFBF7',
                      border: `1.5px solid ${t.borderNeutral}`,
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '3px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: t.text }}>{match.full_name}</span>
                        <span style={{ fontSize: '10px', fontWeight: 600, color: conf.color, padding: '1px 7px', borderRadius: '999px', background: `${conf.color}15`, border: `1px solid ${conf.color}25` }}>
                          {conf.label}
                        </span>
                      </div>
                      {personMetaLine(match) && (
                        <div style={{ fontSize: '11.5px', color: t.textMuted, marginBottom: '2px', lineHeight: 1.4 }}>
                          {personMetaLine(match)}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {match.matched_fields.slice(0, 3).map(f => (
                          <span key={f} style={{ fontSize: '10px', color: t.textMuted, background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)', padding: '1px 6px', borderRadius: '5px' }}>
                            {f}
                          </span>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={() => viewInTheirTree(match)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '5px',
                        padding: '8px 13px', borderRadius: '10px', border: 'none',
                        background: '#EA580C', color: '#fff',
                        fontSize: '12px', fontWeight: 600, fontFamily: 'inherit',
                        cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                      }}
                    >
                      View tree <IconArrowRight size={12} />
                    </button>
                  </div>
                )
              })}
            </div>

            {/* Right: source NodeCard — only when opened from right-click merge */}
            {hasSourceCard && (
              <div style={{
                width: CARD_W + 32,
                flexShrink: 0,
                borderLeft: `1px solid ${t.borderNeutral}`,
                background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(234,88,12,0.025)',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: 10,
                padding: '20px 16px',
              }}>
                <NodeCard
                  fullName={myInfo.fullName}
                  photoUrl={sourceNode!.photoUrl}
                  nodeState={sourceNode!.nodeState as 'proxy' | 'invited' | 'claimed'}
                  isDark={isDark}
                />
                <div style={{
                  fontSize: 10, fontWeight: 600, letterSpacing: '0.08em',
                  textTransform: 'uppercase', color: '#EA580C',
                  textAlign: 'center',
                }}>
                  Your node
                </div>
                <div style={{
                  fontSize: 10, color: t.textMuted, textAlign: 'center', lineHeight: 1.4,
                  maxWidth: CARD_W,
                }}>
                  You're proposing this person is the same as one of the matches
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{ padding: '0 14px 14px' }}>
            <button
              onClick={onDismiss}
              style={{
                width: '100%', background: 'none', border: `1px solid ${t.borderNeutral}`,
                borderRadius: '11px', padding: '9px', cursor: 'pointer',
                fontFamily: 'inherit', fontSize: '12px', color: t.textMuted,
              }}
            >
              These are different people — dismiss
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
