'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { IconGitMerge, IconX, IconLoader2, IconCheck, IconLink } from '@tabler/icons-react'
import { api } from '@/lib/api'
import { useGraphStore } from '@/store/graphStore'
import { getTheme } from '@/lib/theme'
import { NodeCard, cardInitials, CARD_W, CARD_H, CARD_PH, CARD_SH } from '../NodeCard'

interface Props {
  sourceNodeId:   string
  sourceNodeName: string
  targetNodeId:   string
  targetNodeName: string
  onClose:        () => void
  onSent:         () => void
}

// ── Merged-card (appears after both fly together) ─────────────────────────────
function MergedCard({ sourceName, targetName, isDark }: { sourceName: string; targetName: string; isDark: boolean }) {
  const si = cardInitials(sourceName)
  const ti = cardInitials(targetName)
  return (
    <div style={{
      width: CARD_W, height: CARD_H, flexShrink: 0,
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      border: '2px solid #22C55E',
      boxShadow: '0 0 0 4px rgba(34,197,94,0.15), 0 8px 32px rgba(34,197,94,0.25)',
    }}>
      {/* Photo area */}
      <div style={{
        width: CARD_W, height: CARD_PH, flexShrink: 0,
        background: isDark ? '#0E1F12' : '#F0FDF4',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative',
      }}>
        {/* Two overlapping avatar circles → merged */}
        <div style={{ position: 'relative', width: 80, height: 64 }}>
          <div style={{
            position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
            width: 54, height: 54, borderRadius: '50%',
            backgroundImage: 'linear-gradient(135deg, #EA580C, #C2410C)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 16, fontWeight: 600,
            border: `3px solid ${isDark ? '#0E1F12' : '#F0FDF4'}`,
            zIndex: 1,
          }}>
            {si}
          </div>
          <div style={{
            position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)',
            width: 54, height: 54, borderRadius: '50%',
            backgroundImage: 'linear-gradient(135deg, #16A34A, #15803D)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 16, fontWeight: 600,
            border: `3px solid ${isDark ? '#0E1F12' : '#F0FDF4'}`,
            zIndex: 2,
          }}>
            {ti}
          </div>
        </div>

        {/* Checkmark badge */}
        <div style={{
          position: 'absolute', top: 10, right: 10,
          width: 24, height: 24, borderRadius: '50%',
          background: '#22C55E',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(34,197,94,0.5)',
        }}>
          <IconCheck size={13} color="#fff" strokeWidth={3} />
        </div>
      </div>

      {/* Strip */}
      <div style={{
        width: CARD_W, height: CARD_SH, flexShrink: 0,
        background: isDark ? '#0E1F12' : '#F0FDF4',
        borderTop: '1px solid rgba(34,197,94,0.25)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 2,
      }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#22C55E', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Request sent
        </div>
        <div style={{ fontSize: 9, color: isDark ? 'rgba(34,197,94,0.6)' : 'rgba(22,163,74,0.7)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Awaiting review
        </div>
      </div>
    </div>
  )
}

// ── Main modal ────────────────────────────────────────────────────────────────
export default function MergeConfirmModal({
  sourceNodeId, sourceNodeName,
  targetNodeId, targetNodeName,
  onClose, onSent,
}: Props) {
  const router = useRouter()
  const { isDark } = useGraphStore()
  const t = getTheme(isDark)

  const [phase,      setPhase]      = useState<'idle' | 'sending' | 'merging' | 'merged'>('idle')
  const [showMerged, setShowMerged] = useState(false)
  const [err,        setErr]        = useState('')
  const [isMobile,   setIsMobile]   = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 500)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const isSent    = phase === 'merging' || phase === 'merged'
  const isSending = phase === 'sending'

  // Phase 1: drive the merge animation sequence.
  useEffect(() => {
    if (phase !== 'merging') return
    const t1 = setTimeout(() => setShowMerged(true), 400)
    const t2 = setTimeout(() => setPhase('merged'),  500)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [phase])

  // Phase 2: once 'merged', redirect to the user's own tree after a short pause.
  // This must be a separate effect so the cleanup of Phase 1 (which fires when
  // phase changes to 'merged') does not cancel the navigation timer.
  useEffect(() => {
    if (phase !== 'merged') return
    const t = setTimeout(() => router.push('/graph'), 900)
    return () => clearTimeout(t)
  }, [phase, router])

  async function handleSend() {
    setPhase('sending'); setErr('')
    try {
      await api.merges.create({ new_person_id: sourceNodeId, canonical_person_id: targetNodeId })
      setPhase('merging')
    } catch (e) {
      setPhase('idle')
      setErr(e instanceof Error ? e.message : 'Failed to send request')
    }
  }

  // On mobile cards are stacked vertically, so fly is vertical (y axis).
  // On desktop cards are side-by-side, fly is horizontal (x axis).
  // Desktop: modal 580px, padding 32px → content 516px, cards 154px each → delta 181px
  const flyDelta = isMobile ? 0 : 181

  const dash = isDark
    ? 'repeating-linear-gradient(to right,rgba(234,88,12,0.45) 0,rgba(234,88,12,0.45) 5px,transparent 5px,transparent 10px)'
    : 'repeating-linear-gradient(to right,rgba(234,88,12,0.32) 0,rgba(234,88,12,0.32) 5px,transparent 5px,transparent 10px)'

  return (
    <>
      {/* ── Backdrop ── */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        onClick={phase === 'idle' ? onClose : undefined}
        style={{
          position: 'fixed', inset: 0, zIndex: 400,
          background: isDark ? 'rgba(0,0,0,0.78)' : 'rgba(0,0,0,0.48)',
          backdropFilter: 'blur(8px)',
        }}
      />

      {/* ── Card ── */}
      {/* Centering wrapper — flexbox owns centering; motion.div owns animation */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 401,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'none',
      }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 24 }}
        animate={{ opacity: 1, scale: 1,    y: 0 }}
        exit={{    opacity: 0, scale: 0.92, y: 24 }}
        transition={{ type: 'spring', stiffness: 300, damping: 26 }}
        style={{
          pointerEvents: 'all',
          width: 580, maxWidth: 'calc(100vw - 24px)',
          background: isDark ? '#1C1410' : '#FFFAF5',
          border: `1.5px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(234,88,12,0.14)'}`,
          borderRadius: 22,
          boxShadow: isDark
            ? '0 40px 100px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.04)'
            : '0 40px 100px rgba(0,0,0,0.2),  0 0 0 1px rgba(234,88,12,0.06)',
          overflow: 'hidden',
        }}
      >
        {/* ── Header ── */}
        <div style={{
          padding: '18px 22px 16px',
          borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <motion.div
              animate={phase === 'merging' ? { rotate: [0, 360], scale: [1, 1.3, 1] } : {}}
              transition={{ duration: 0.6, ease: 'easeInOut' }}
              style={{
                width: 32, height: 32, borderRadius: 9,
                background: isSent ? 'rgba(34,197,94,0.12)' : 'rgba(234,88,12,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                transition: 'background 0.4s',
              }}
            >
              {phase === 'merged'
                ? <IconCheck size={16} color="#22C55E" strokeWidth={2.5} />
                : <IconGitMerge size={16} color={isSent ? '#22C55E' : '#EA580C'} />
              }
            </motion.div>
            <div>
              <motion.div
                animate={{ opacity: 1 }}
                style={{ fontSize: 15, fontWeight: 700, color: t.text, lineHeight: 1.2 }}
              >
                {phase === 'merged' ? 'Merge request sent!' : 'Confirm merge'}
              </motion.div>
              <div style={{ fontSize: 11.5, color: t.textMuted, marginTop: 2 }}>
                {phase === 'merged'
                  ? 'The other family will review and accept or reject'
                  : 'These two nodes will be proposed as the same person'}
              </div>
            </div>
          </div>

          {phase === 'idle' && (
            <button
              onClick={onClose}
              style={{
                width: 28, height: 28, borderRadius: 8, border: 'none', cursor: 'pointer',
                background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)',
                color: t.textMuted,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.12s', flexShrink: 0,
              }}
              onMouseEnter={e => (e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.12)')}
              onMouseLeave={e => (e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)')}
            >
              <IconX size={14} />
            </button>
          )}
        </div>

        {/* ── Hero: cards + merge animation ── */}
        <div style={{
          padding: isMobile ? '24px 16px 20px' : '32px 32px 24px',
          borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(234,88,12,0.09)'}`,
          background: isDark ? 'rgba(255,255,255,0.015)' : 'rgba(234,88,12,0.025)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* ── DESKTOP: side-by-side ── */}
          {!isMobile && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>

              {/* Source card */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <motion.div animate={{ x: isSent ? flyDelta : 0, opacity: isSent ? 0 : 1, scale: isSent ? 0.82 : 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 22 }}>
                  <NodeCard fullName={sourceNodeName} isDark={isDark} nodeState="proxy" />
                </motion.div>
                <motion.span animate={{ opacity: isSent ? 0 : 1 }} transition={{ duration: 0.2 }}
                  style={{ fontSize: 10, fontWeight: 600, color: '#EA580C', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  {sourceNodeName.split(' ')[0]}
                </motion.span>
              </div>

              {/* Horizontal connector */}
              <motion.div animate={{ opacity: isSent ? 0 : 1, scaleX: isSent ? 0 : 1 }}
                transition={{ duration: 0.22 }}
                style={{ flex: 1, display: 'flex', alignItems: 'center', transformOrigin: 'center' }}>
                <div style={{ flex: 1, height: 2, background: dash }} />
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                  background: isDark ? '#1C1410' : '#FFF7ED',
                  border: `2px solid ${isDark ? 'rgba(234,88,12,0.35)' : 'rgba(234,88,12,0.28)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: `0 0 0 5px ${isDark ? 'rgba(234,88,12,0.07)' : 'rgba(234,88,12,0.06)'}`,
                }}>
                  <IconLink size={15} color="#EA580C" />
                </div>
                <div style={{ flex: 1, height: 2, background: dash }} />
              </motion.div>

              {/* Target card */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <motion.div animate={{ x: isSent ? -flyDelta : 0, opacity: isSent ? 0 : 1, scale: isSent ? 0.82 : 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 22 }}>
                  <NodeCard fullName={targetNodeName} isDark={isDark} nodeState="claimed" />
                </motion.div>
                <motion.span animate={{ opacity: isSent ? 0 : 1 }} transition={{ duration: 0.2 }}
                  style={{ fontSize: 10, fontWeight: 600, color: '#C2410C', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  {targetNodeName.split(' ')[0]}
                </motion.span>
              </div>
            </div>
          )}

          {/* ── MOBILE: stacked vertically ── */}
          {isMobile && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
              <motion.div animate={{ y: isSent ? 60 : 0, opacity: isSent ? 0 : 1, scale: isSent ? 0.82 : 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 22 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <NodeCard fullName={sourceNodeName} isDark={isDark} nodeState="proxy" />
                  <span style={{ fontSize: 10, fontWeight: 600, color: '#EA580C', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    {sourceNodeName.split(' ')[0]}
                  </span>
                </div>
              </motion.div>

              {/* Vertical connector */}
              <motion.div animate={{ opacity: isSent ? 0 : 1 }} transition={{ duration: 0.22 }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, padding: '6px 0' }}>
                <div style={{ width: 2, height: 18, background: dash.replace('to right', 'to bottom') }} />
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                  background: isDark ? '#1C1410' : '#FFF7ED',
                  border: `2px solid ${isDark ? 'rgba(234,88,12,0.35)' : 'rgba(234,88,12,0.28)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <IconLink size={13} color="#EA580C" />
                </div>
                <div style={{ width: 2, height: 18, background: dash.replace('to right', 'to bottom') }} />
              </motion.div>

              <motion.div animate={{ y: isSent ? -60 : 0, opacity: isSent ? 0 : 1, scale: isSent ? 0.82 : 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 22 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <NodeCard fullName={targetNodeName} isDark={isDark} nodeState="claimed" />
                  <span style={{ fontSize: 10, fontWeight: 600, color: '#C2410C', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    {targetNodeName.split(' ')[0]}
                  </span>
                </div>
              </motion.div>
            </div>
          )}

          {/* ── Merged card: centered using calc() — avoids Framer Motion transform conflict ── */}
          <AnimatePresence>
            {showMerged && (
              <motion.div
                initial={{ opacity: 0, scale: 0.55, y: 20 }}
                animate={{ opacity: 1, scale: 1,    y: 0 }}
                transition={{ type: 'spring', stiffness: 280, damping: 22 }}
                style={{
                  position: 'absolute',
                  top: isMobile ? 24 : 32,
                  left: `calc(50% - ${CARD_W / 2}px)`,
                  zIndex: 10,
                }}
              >
                <MergedCard sourceName={sourceNodeName} targetName={targetNodeName} isDark={isDark} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Burst ring — uses calc() to avoid transform conflict with scale animation */}
          <AnimatePresence>
            {showMerged && (
              <motion.div
                initial={{ scale: 0.6, opacity: 0.8 }}
                animate={{ scale: 2.4, opacity: 0 }}
                transition={{ duration: 0.7, ease: 'easeOut' }}
                style={{
                  position: 'absolute',
                  top: isMobile ? 24 : 32,
                  left: `calc(50% - ${CARD_W / 2}px)`,
                  width: CARD_W,
                  height: CARD_H,
                  borderRadius: 12,
                  border: '2.5px solid rgba(34,197,94,0.6)',
                  pointerEvents: 'none',
                  zIndex: 9,
                }}
              />
            )}
          </AnimatePresence>
        </div>

        {/* ── Body ── */}
        <div style={{ padding: '20px 24px 22px' }}>
          <AnimatePresence mode="wait">
            {phase === 'merged' ? (
              /* Success message */
              <motion.div
                key="success"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ textAlign: 'center', padding: '4px 0 8px' }}
              >
                <p style={{ margin: '0 0 6px', fontSize: 14.5, fontWeight: 700, color: '#22C55E' }}>
                  Request on its way!
                </p>
                <p style={{ margin: 0, fontSize: 12.5, color: t.textMuted, lineHeight: 1.65 }}>
                  The other family will receive a notification. If they accept,<br />
                  both nodes will merge and their connections will combine.
                </p>
              </motion.div>
            ) : (
              /* Idle / sending */
              <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <p style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 600, color: t.text }}>
                  Send merge request?
                </p>
                <p style={{ margin: '0 0 20px', fontSize: 12.5, color: t.textMuted, lineHeight: 1.65 }}>
                  You're proposing that <strong style={{ color: t.text }}>{sourceNodeName}</strong> and{' '}
                  <strong style={{ color: t.text }}>{targetNodeName}</strong> are the same person.
                  The other family will review and decide.
                </p>

                {err && (
                  <p style={{ margin: '0 0 12px', fontSize: 11.5, color: '#EF4444', fontWeight: 500 }}>{err}</p>
                )}

                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={onClose}
                    disabled={isSending}
                    style={{
                      flex: 1, height: 42, borderRadius: 11,
                      border: `1.5px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                      background: 'transparent', color: t.textMuted,
                      fontSize: 13.5, fontFamily: 'inherit', cursor: 'pointer',
                      opacity: isSending ? 0.5 : 1,
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSend}
                    disabled={isSending}
                    style={{
                      flex: 2, height: 42, borderRadius: 11, border: 'none',
                      background: isSending ? '#F0A070' : 'linear-gradient(135deg, #EA580C, #C2410C)',
                      color: '#fff', fontSize: 13.5, fontWeight: 600,
                      fontFamily: 'inherit', cursor: isSending ? 'default' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      boxShadow: !isSending ? '0 2px 12px rgba(234,88,12,0.35)' : 'none',
                      transition: 'background 0.2s, box-shadow 0.2s',
                    }}
                  >
                    {isSending ? (
                      <>
                        <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}>
                          <IconLoader2 size={15} />
                        </motion.div>
                        Sending…
                      </>
                    ) : (
                      <><IconGitMerge size={15} /> Send request</>
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
      </div>
    </>
  )
}
