'use client'

// SameTreeDuplicateModal — shown right after adding a node when a person with
// the same name already exists IN THE SAME family. Presents a side-by-side
// comparison in node-card format: YOUR new node on the left, the existing
// recommendation(s) on the right (horizontally scrollable when several match).
// For each recommendation the user can view it or send one merge request.
//
// Distinct from DuplicateFoundModal, which handles cross-family matches and
// routes through "explore their tree". Here the match is in your own tree, so
// the actions are direct.

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  IconX, IconUsersGroup, IconEye, IconGitMerge, IconCheck, IconLoader2,
  IconAlertTriangle, IconArrowsExchange,
} from '@tabler/icons-react'
import type { SameTreeMatch } from '@/lib/api'
import { getTheme } from '@/lib/theme'
import { NodeCard, CARD_W } from './NodeCard'

export interface NewPersonCard {
  fullName:  string
  photoUrl:  string | null
  nodeState: string
}

interface SameTreeDuplicateModalProps {
  /** The node the user just added — shown on the left. */
  newPerson:   NewPersonCard
  /** Existing same-name people in this family — shown on the right. */
  matches:     SameTreeMatch[]
  isDark:      boolean
  /** Focus/open an existing node in the current tree. */
  onViewNode:  (personId: string) => void
  /** Send a merge request: the existing node is canonical, the new one merges in. */
  onSendMerge: (canonicalPersonId: string) => Promise<void>
  onDismiss:   () => void
}

type ReqState = 'idle' | 'sending' | 'sent' | 'error'

// Human-readable labels for the raw backend match fields.
const FIELD_LABEL: Record<string, string> = {
  'name':                'Same name',
  'gotra':               'Same gotra',
  'birth year':          'Same birth year',
  'approx. birth year':  'Close birth year',
}

function metaLine(m: SameTreeMatch): string {
  const pieces: string[] = []
  if (m.father_name) pieces.push(`Father: ${m.father_name}`)
  if (m.birth_year)  pieces.push(`b. ${m.birth_year}`)
  if (m.gotra)       pieces.push(m.gotra)
  return pieces.join('  ·  ')
}

export default function SameTreeDuplicateModal({
  newPerson, matches, isDark, onViewNode, onSendMerge, onDismiss,
}: SameTreeDuplicateModalProps) {
  const t = getTheme(isDark)
  const [reqState, setReqState] = useState<Record<string, ReqState>>({})

  async function handleMerge(id: string) {
    setReqState(p => ({ ...p, [id]: 'sending' }))
    try {
      await onSendMerge(id)
      setReqState(p => ({ ...p, [id]: 'sent' }))
      // Flash the "Request sent" confirmation briefly, then close the modal.
      setTimeout(onDismiss, 650)
    } catch {
      setReqState(p => ({ ...p, [id]: 'error' }))
    }
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
    textTransform: 'uppercase', color: t.textMuted,
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
          background: 'rgba(0,0,0,0.4)',
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
            maxWidth:     '700px',
            maxHeight:    '90vh',
            overflow:     'hidden',
            display:      'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header */}
          <div style={{
            padding: '18px 18px 14px',
            borderBottom: `1px solid ${t.borderNeutral}`,
            display: 'flex', gap: '12px', alignItems: 'flex-start', flexShrink: 0,
          }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
              background: 'rgb(var(--c-primary-rgb) / 0.10)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <IconUsersGroup size={17} color="var(--c-primary)" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: t.text, marginBottom: '3px' }}>
                Is this the same person?
              </div>
              <p style={{ margin: 0, fontSize: '12px', color: t.textMuted, lineHeight: 1.5 }}>
                <strong style={{ color: t.text }}>{newPerson.fullName}</strong> already exists in this family.
                Compare your new node with the {matches.length > 1 ? `${matches.length} matches` : 'match'} —
                send a merge request if they're the same person, or ignore.
              </p>
            </div>
            <button
              onClick={onDismiss}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textMuted, padding: '2px', flexShrink: 0, display: 'flex' }}
            >
              <IconX size={15} />
            </button>
          </div>

          {/* Comparison body — your node (left) vs recommendation(s) (right) */}
          <div style={{ display: 'flex', flex: 1, minHeight: 0, alignItems: 'flex-start', gap: 12, padding: '16px' }}>

            {/* Left — your new node (same card size as the right) */}
            <div style={{
              flexShrink: 0,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
            }}>
              <div style={{ ...labelStyle, color: 'var(--c-primary)' }}>You added</div>
              <NodeCard
                fullName={newPerson.fullName}
                photoUrl={newPerson.photoUrl}
                nodeState={(newPerson.nodeState as 'proxy' | 'invited' | 'claimed') ?? 'proxy'}
                isSelf
                isDark={isDark}
              />
            </div>

            {/* Connector — vertically centred against the card photo */}
            <div style={{
              flexShrink: 0, alignSelf: 'flex-start', marginTop: 78,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, color: t.textMuted,
            }}>
              <IconArrowsExchange size={17} />
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.06em' }}>SAME?</span>
            </div>

            {/* Right — recommendation(s), horizontally scrollable */}
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ ...labelStyle }}>
                {matches.length > 1 ? `Already in tree · ${matches.length}` : 'Already in tree'}
              </div>

              <div style={{
                display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 6,
                scrollbarWidth: 'thin',
              }}>
                {matches.map(match => {
                  const state = reqState[match.id] ?? 'idle'
                  return (
                    <div
                      key={match.id}
                      style={{
                        width: CARD_W, flexShrink: 0,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 9,
                      }}
                    >
                      <NodeCard
                        fullName={match.full_name}
                        photoUrl={match.photo_url}
                        nodeState="claimed"
                        isDark={isDark}
                      />

                      {metaLine(match) && (
                        <div style={{ fontSize: 10.5, color: t.textMuted, textAlign: 'center', lineHeight: 1.4, width: CARD_W }}>
                          {metaLine(match)}
                        </div>
                      )}

                      {/* Match reasons */}
                      {match.matched_fields.length > 0 && (
                        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', justifyContent: 'center', width: CARD_W }}>
                          {match.matched_fields.map(f => (
                            <span key={f} style={{
                              display: 'inline-flex', alignItems: 'center', gap: 3,
                              fontSize: 9.5, fontWeight: 600,
                              color: isDark ? '#4ADE80' : '#15803D',
                              background: isDark ? 'rgba(34,197,94,0.14)' : '#F0FDF4',
                              border: `1px solid ${isDark ? 'rgba(34,197,94,0.25)' : '#BBF7D0'}`,
                              padding: '2px 7px', borderRadius: '999px',
                            }}>
                              <IconCheck size={10} stroke={2.5} /> {FIELD_LABEL[f] ?? f}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Actions */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: CARD_W, marginTop: 'auto' }}>
                        <button
                          onClick={() => onViewNode(match.id)}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                            padding: '7px 0', borderRadius: 9,
                            border: `1px solid ${t.borderNeutral}`, background: 'transparent',
                            color: t.text, fontSize: 11.5, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer',
                          }}
                        >
                          <IconEye size={13} /> View
                        </button>

                        {state === 'sent' ? (
                          <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                            padding: '7px 0', borderRadius: 9,
                            background: isDark ? 'rgba(34,197,94,0.16)' : '#F0FDF4',
                            color: isDark ? '#4ADE80' : '#15803D',
                            fontSize: 11.5, fontWeight: 600,
                          }}>
                            <IconCheck size={13} /> Request sent
                          </div>
                        ) : (
                          <button
                            onClick={() => handleMerge(match.id)}
                            disabled={state === 'sending'}
                            style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                              padding: '7px 0', borderRadius: 9, border: 'none',
                              background: state === 'error' ? '#EF4444' : 'var(--c-primary)', color: '#fff',
                              fontSize: 11.5, fontWeight: 600, fontFamily: 'inherit',
                              cursor: state === 'sending' ? 'default' : 'pointer',
                              opacity: state === 'sending' ? 0.8 : 1,
                            }}
                          >
                            {state === 'sending'
                              ? <><IconLoader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Sending…</>
                              : state === 'error'
                                ? <><IconAlertTriangle size={13} /> Retry</>
                                : <><IconGitMerge size={13} /> Merge request</>}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{ padding: '12px 14px 14px', borderTop: `1px solid ${t.borderNeutral}`, flexShrink: 0 }}>
            <button
              onClick={onDismiss}
              style={{
                width: '100%', background: 'none', border: `1px solid ${t.borderNeutral}`,
                borderRadius: '11px', padding: '9px', cursor: 'pointer',
                fontFamily: 'inherit', fontSize: '12px', color: t.textMuted,
              }}
            >
              These are different people — ignore
            </button>
          </div>
        </motion.div>
      </motion.div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </AnimatePresence>
  )
}
