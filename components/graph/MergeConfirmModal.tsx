'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { IconGitMerge, IconX, IconLoader2, IconCheck } from '@tabler/icons-react'
import { api } from '@/lib/api'
import { useGraphStore } from '@/store/graphStore'
import { getTheme } from '@/lib/theme'

interface MergeConfirmModalProps {
  sourceNodeId:     string
  sourceNodeName:   string
  targetNodeId:     string
  targetNodeName:   string
  onClose:          () => void
  onSent:           () => void   // called after request is sent — navigate away
}

export default function MergeConfirmModal({
  sourceNodeId, sourceNodeName,
  targetNodeId, targetNodeName,
  onClose, onSent,
}: MergeConfirmModalProps) {
  const { isDark } = useGraphStore()
  const t = getTheme(isDark)
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [err,   setErr]   = useState('')

  async function handleSend() {
    setState('sending'); setErr('')
    try {
      await api.merges.create({ new_person_id: sourceNodeId, canonical_person_id: targetNodeId })
      setState('sent')
      setTimeout(onSent, 1200)
    } catch (e) {
      setState('idle')
      setErr(e instanceof Error ? e.message : 'Failed to send request')
    }
  }

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        onClick={state === 'idle' ? onClose : undefined}
        style={{
          position: 'fixed', inset: 0, zIndex: 400,
          background: isDark ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.3)',
          backdropFilter: 'blur(3px)',
        }}
      />

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: -8 }}
        animate={{ opacity: 1, scale: 1,    y: 0 }}
        exit={{    opacity: 0, scale: 0.94, y: -8 }}
        transition={{ type: 'spring', stiffness: 360, damping: 28 }}
        style={{
          position: 'fixed', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 401, width: '360px', maxWidth: 'calc(100vw - 32px)',
          background: isDark ? '#1C1410' : '#FFFAF5',
          border: `1.5px solid ${isDark ? 'rgba(255,255,255,0.09)' : 'rgba(234,88,12,0.15)'}`,
          borderRadius: '16px',
          boxShadow: isDark ? '0 24px 64px rgba(0,0,0,0.7)' : '0 24px 48px rgba(0,0,0,0.14)',
          padding: '22px 22px 20px',
        }}
      >
        {/* Close */}
        {state !== 'sent' && (
          <button
            onClick={onClose}
            style={{
              position: 'absolute', top: '14px', right: '14px',
              background: 'none', border: 'none', cursor: 'pointer',
              color: t.textMuted, padding: '2px',
            }}
          >
            <IconX size={15} />
          </button>
        )}

        {state === 'sent' ? (
          /* ── Success state ── */
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: '50%',
              background: 'rgba(34,197,94,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 12px',
            }}>
              <IconCheck size={22} color="#22C55E" strokeWidth={2.5} />
            </div>
            <p style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: 700, color: t.text }}>Request sent!</p>
            <p style={{ margin: 0, fontSize: '12px', color: t.textMuted }}>
              They'll be notified and can accept or reject.
            </p>
          </div>
        ) : (
          <>
            {/* Icon */}
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: 'rgba(234,88,12,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: '14px',
            }}>
              <IconGitMerge size={18} color="#EA580C" />
            </div>

            <p style={{ margin: '0 0 6px', fontSize: '14px', fontWeight: 700, color: t.text }}>
              Send merge request?
            </p>
            <p style={{ margin: '0 0 18px', fontSize: '12px', color: t.textMuted, lineHeight: 1.55 }}>
              You're proposing that these two nodes represent the same person.
              The other family will review and accept or reject.
            </p>

            {/* Persons row */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '12px 14px', borderRadius: '10px', marginBottom: '18px',
              background: isDark ? 'rgba(255,255,255,0.04)' : '#FFF7ED',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : '#FDE8CC'}`,
            }}>
              <PersonChip name={sourceNodeName} accent="#EA580C" isDark={isDark} t={t} />
              <div style={{ flex: 1, textAlign: 'center' }}>
                <IconGitMerge size={14} color={isDark ? '#7A6A52' : '#C2794C'} />
              </div>
              <PersonChip name={targetNodeName} accent="#22C55E" isDark={isDark} t={t} />
            </div>

            {err && <p style={{ margin: '0 0 10px', fontSize: '11px', color: '#EF4444' }}>{err}</p>}

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={onClose}
                disabled={state === 'sending'}
                style={{
                  flex: 1, height: '38px', borderRadius: '9px',
                  border: `1.5px solid ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)'}`,
                  background: 'transparent', color: t.textMuted,
                  fontSize: '13px', fontFamily: 'inherit', cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSend}
                disabled={state === 'sending'}
                style={{
                  flex: 2, height: '38px', borderRadius: '9px', border: 'none',
                  background: state === 'sending' ? '#F0A070' : 'linear-gradient(135deg, #EA580C, #C2410C)',
                  color: '#fff', fontSize: '13px', fontWeight: 600,
                  fontFamily: 'inherit', cursor: state === 'sending' ? 'default' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  boxShadow: state !== 'sending' ? '0 2px 8px rgba(234,88,12,0.3)' : 'none',
                }}
              >
                {state === 'sending'
                  ? <><motion.div animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}><IconLoader2 size={14} /></motion.div> Sending…</>
                  : <><IconGitMerge size={14} /> Send request</>
                }
              </button>
            </div>
          </>
        )}
      </motion.div>
    </>
  )
}

function PersonChip({ name, accent, isDark, t }: { name: string; accent: string; isDark: boolean; t: ReturnType<typeof import('@/lib/theme').getTheme> }) {
  const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flex: 1, minWidth: 0 }}>
      <div style={{
        width: '28px', height: '28px', borderRadius: '6px', flexShrink: 0,
        background: accent + '22',
        border: `1.5px solid ${accent}44`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: '10px', fontWeight: 700, color: accent }}>{initials}</span>
      </div>
      <span style={{
        fontSize: '12px', fontWeight: 600, color: t.text,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {name}
      </span>
    </div>
  )
}
