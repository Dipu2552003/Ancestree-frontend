'use client'

import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { IconX, IconSearch, IconArrowRight } from '@tabler/icons-react'
import type { PotentialMatch } from '@/lib/api'
import type { MyPersonInfo, PendingMatchData } from '@/types'
import { getTheme } from '@/lib/theme'

interface DuplicateFoundModalProps {
  newPersonId:  string
  myInfo:       MyPersonInfo
  matches:      PotentialMatch[]
  isDark:       boolean
  onDismiss:    () => void
}

function confidence(score: number) {
  if (score >= 70) return { label: 'Strong match',   color: '#EA580C' }
  if (score >= 40) return { label: 'Possible match', color: '#D97706' }
  return               { label: 'Weak match',        color: '#64748B' }
}

export default function DuplicateFoundModal({
  newPersonId, myInfo, matches, isDark, onDismiss,
}: DuplicateFoundModalProps) {
  const t = getTheme(isDark)
  const router = useRouter()

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
            maxWidth:     '420px',
            overflow:     'hidden',
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

          {/* Match list */}
          <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
                    <div style={{ fontSize: '11.5px', color: '#EA580C', fontWeight: 600, marginBottom: '2px' }}>
                      {match.family_name}
                    </div>
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
