'use client'

// InviteToClaimCard — green CTA card shown near the top of NodePanel when the
// viewer can invite this proxy person to claim their node. Owns its own
// generate/copy state. Hidden once the person has joined (parent gates on
// d.canInvite).

import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { IconCheck, IconLoader2 } from '@tabler/icons-react'
import { api } from '@/lib/api'
import { isGhostNodeId, realIdFromGhost } from '@/lib/graph/ghostNodes'
import { getTheme } from '@/lib/theme'

interface InviteToClaimCardProps {
  nodeId:    string
  fullName?: string
  isDark:    boolean
}

export default function InviteToClaimCard({ nodeId, fullName, isDark }: InviteToClaimCardProps) {
  const t = getTheme(isDark)
  const [inviteCode, setInviteCode] = useState<string | null>(null)
  const [inviteGenerating, setInviteGenerating] = useState(false)
  const [inviteCopied, setInviteCopied] = useState(false)

  const handleGenerateInvite = useCallback(async () => {
    setInviteGenerating(true)
    try {
      const realId = isGhostNodeId(nodeId) ? realIdFromGhost(nodeId) : nodeId
      const { invite_token } = await api.persons.generateInvite(realId)
      setInviteCode(invite_token)
    } catch (err: unknown) {
      console.error(err)
    } finally {
      setInviteGenerating(false)
    }
  }, [nodeId])

  // Reset the "Copied" indicator after 2s.
  useEffect(() => {
    if (!inviteCopied) return
    const id = setTimeout(() => setInviteCopied(false), 2000)
    return () => clearTimeout(id)
  }, [inviteCopied])

  const handleCopyInvite = useCallback(async () => {
    if (!inviteCode) return
    try { await navigator.clipboard.writeText(inviteCode) } catch { /* clipboard unavailable */ }
    setInviteCopied(true)
  }, [inviteCode])

  return (
    <div style={{
      margin: '12px 16px 0', padding: '14px 16px', borderRadius: '10px',
      background: isDark ? '#0D1F0D' : '#F0FDF4',
      border: `1px solid ${isDark ? '#14532D' : '#BBF7D0'}`,
      display: 'flex', flexDirection: 'column', gap: '10px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '14px', lineHeight: 1 }}>⚡</span>
        <div>
          <p style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: isDark ? '#4ADE80' : '#15803D' }}>
            Invite to join
          </p>
          <p style={{ margin: '2px 0 0', fontSize: '11px', lineHeight: 1.4, color: isDark ? 'rgba(74,222,128,0.70)' : 'rgba(22,163,74,0.75)' }}>
            {fullName?.split(' ')[0] ?? 'This person'} hasn't joined yet
          </p>
        </div>
      </div>
      {!inviteCode ? (
        <motion.button
          onClick={handleGenerateInvite}
          disabled={inviteGenerating}
          whileHover={!inviteGenerating ? { scale: 1.015 } : {}}
          whileTap={!inviteGenerating ? { scale: 0.975 } : {}}
          style={{
            width: '100%', height: '34px', borderRadius: '8px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            cursor: inviteGenerating ? 'default' : 'pointer',
            fontSize: '12px', fontWeight: 600, fontFamily: 'inherit',
            background: isDark ? '#14532D' : '#16A34A', color: '#fff', border: 'none',
            opacity: inviteGenerating ? 0.6 : 1, transition: 'opacity 0.15s',
          }}
        >
          {inviteGenerating
            ? <><motion.div animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}><IconLoader2 size={13} /></motion.div> Generating…</>
            : 'Generate invite code'
          }
        </motion.button>
      ) : (
        <>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            background: isDark ? '#1A2A1A' : '#DCFCE7',
            border: `1.5px solid ${isDark ? '#14532D' : '#86EFAC'}`,
            borderRadius: '8px', padding: '0 12px', height: '40px',
          }}>
            <span style={{
              flex: 1, fontFamily: 'monospace', fontSize: '14px',
              fontWeight: 700, letterSpacing: '0.12em',
              color: isDark ? '#4ADE80' : '#15803D',
            }}>
              {inviteCode}
            </span>
            <button
              onClick={handleCopyInvite}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
                color: isDark ? '#4ADE80' : '#16A34A', fontSize: '11px', fontFamily: 'inherit',
                fontWeight: 600, flexShrink: 0,
              }}
            >
              {inviteCopied ? <IconCheck size={14} strokeWidth={2.5} /> : 'Copy'}
            </button>
          </div>
          <p style={{ fontSize: '11px', margin: 0, lineHeight: 1.5, color: isDark ? 'rgba(74,222,128,0.70)' : 'rgba(21,128,61,0.70)' }}>
            Share with {fullName?.split(' ')[0] ?? 'them'} — enter at{' '}
            <span style={{ color: 'var(--c-primary)' }}>/invite</span> to join.
          </p>
          <button
            onClick={handleGenerateInvite}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              fontSize: '10.5px', color: t.textMuted, textAlign: 'left' as const,
              fontFamily: 'inherit', textDecoration: 'underline',
            }}
          >
            Regenerate code
          </button>
        </>
      )}
    </div>
  )
}
