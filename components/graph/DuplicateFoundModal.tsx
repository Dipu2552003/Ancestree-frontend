'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { IconX, IconGitMerge, IconUsers, IconLoader2 } from '@tabler/icons-react'
import { api, type PotentialMatch } from '@/lib/api'
import { getTheme } from '@/lib/theme'

interface DuplicateFoundModalProps {
  newPersonId: string
  matches:     PotentialMatch[]
  isDark:      boolean
  onSent:      () => void   // after merge request is sent
  onKeepBoth:  () => void   // user chose to keep separate
}

export default function DuplicateFoundModal({
  newPersonId, matches, isDark, onSent, onKeepBoth,
}: DuplicateFoundModalProps) {
  const t = getTheme(isDark)
  const [sending, setSending] = useState<string | null>(null)   // canonicalId being sent
  const [sent,    setSent]    = useState<Set<string>>(new Set())
  const [error,   setError]   = useState('')

  async function handleSendRequest(match: PotentialMatch) {
    setSending(match.id)
    setError('')
    try {
      await api.merges.create({
        new_person_id:       newPersonId,
        canonical_person_id: match.id,
      })
      setSent(prev => new Set([...prev, match.id]))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send request')
    } finally {
      setSending(null)
    }
  }

  const allSent = sent.size === matches.length

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed', inset: 0, zIndex: 300,
          background: 'rgba(0,0,0,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '16px',
        }}
        onClick={e => { if (e.target === e.currentTarget) onKeepBoth() }}
      >
        <motion.div
          key="modal"
          initial={{ opacity: 0, scale: 0.94, y: 12 }}
          animate={{ opacity: 1, scale: 1,    y: 0  }}
          exit={{    opacity: 0, scale: 0.94, y: 12 }}
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          style={{
            background:   t.panelBg,
            border:       `1.5px solid ${t.borderNeutral}`,
            borderRadius: '20px',
            boxShadow:    t.shadow,
            width:        '100%',
            maxWidth:     '440px',
            overflow:     'hidden',
          }}
        >
          {/* Header */}
          <div style={{
            padding: '20px 20px 0',
            display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          }}>
            <div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                marginBottom: '4px',
              }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '10px',
                  background: 'rgba(234,88,12,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <IconGitMerge size={17} color="#EA580C" />
                </div>
                <span style={{ fontSize: '15px', fontWeight: 700, color: t.text }}>
                  Similar person found
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '12.5px', color: t.textMuted, lineHeight: 1.5 }}>
                This person already exists in another family tree.
                You can send a merge request to connect your trees.
              </p>
            </div>
            <button
              onClick={onKeepBoth}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: t.textMuted, padding: '2px', display: 'flex', flexShrink: 0,
              }}
            >
              <IconX size={16} />
            </button>
          </div>

          {/* Match cards */}
          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {matches.map(match => {
              const isSending = sending === match.id
              const isSent    = sent.has(match.id)
              return (
                <div
                  key={match.id}
                  style={{
                    background:   isDark ? 'rgba(255,255,255,0.04)' : '#FFF7ED',
                    border:       `1px solid ${t.borderNeutral}`,
                    borderRadius: '14px',
                    padding:      '14px 16px',
                    display:      'flex',
                    alignItems:   'center',
                    justifyContent: 'space-between',
                    gap:          '12px',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: t.text, marginBottom: '3px' }}>
                      {match.full_name}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '11.5px', color: '#EA580C', fontWeight: 500 }}>
                        {match.family_name}
                      </span>
                      <span style={{ color: t.textMuted, fontSize: '10px' }}>•</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '11.5px', color: t.textMuted }}>
                        <IconUsers size={11} />
                        {match.member_count} {match.member_count === 1 ? 'member' : 'members'}
                      </span>
                      {match.birth_year && (
                        <>
                          <span style={{ color: t.textMuted, fontSize: '10px' }}>•</span>
                          <span style={{ fontSize: '11.5px', color: t.textMuted }}>b. {match.birth_year}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleSendRequest(match)}
                    disabled={isSending || isSent}
                    style={{
                      display:      'flex',
                      alignItems:   'center',
                      gap:          '5px',
                      padding:      '7px 13px',
                      borderRadius: '10px',
                      border:       'none',
                      cursor:       isSent || isSending ? 'default' : 'pointer',
                      fontFamily:   'inherit',
                      fontSize:     '12px',
                      fontWeight:   600,
                      whiteSpace:   'nowrap',
                      flexShrink:   0,
                      background:   isSent
                        ? (isDark ? 'rgba(34,197,94,0.15)' : 'rgba(34,197,94,0.12)')
                        : 'rgba(234,88,12,0.10)',
                      color:        isSent ? '#22C55E' : '#EA580C',
                      opacity:      isSending ? 0.7 : 1,
                      transition:   'background 0.15s, color 0.15s',
                    }}
                  >
                    {isSending
                      ? <><motion.span animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}><IconLoader2 size={13} /></motion.span> Sending…</>
                      : isSent
                        ? '✓ Request sent'
                        : <><IconGitMerge size={13} /> Send request</>
                    }
                  </button>
                </div>
              )
            })}

            {error && (
              <p style={{ margin: 0, fontSize: '12px', color: '#EF4444' }}>{error}</p>
            )}
          </div>

          {/* Footer */}
          <div style={{
            padding:    '0 20px 20px',
            display:    'flex',
            justifyContent: 'center',
          }}>
            <button
              onClick={onKeepBoth}
              style={{
                background:   'none',
                border:       `1px solid ${t.borderNeutral}`,
                borderRadius: '10px',
                padding:      '8px 20px',
                cursor:       'pointer',
                fontFamily:   'inherit',
                fontSize:     '12.5px',
                color:        t.textMuted,
                width:        '100%',
              }}
            >
              {allSent ? 'Done — close' : 'These are different people — keep both'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
