'use client'

// InviteToClaimCard — green CTA card shown near the top of NodePanel when the
// viewer can invite this proxy person to claim their node. Generates a single
// shareable /invite link that drops the invitee straight onto their node.
// The link is valid for 5 minutes; after that a new one must be generated.
// Hidden once the person has joined (parent gates on d.canInvite).

import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { IconCheck, IconLoader2, IconClock, IconRefresh, IconLink } from '@tabler/icons-react'
import { api } from '@/lib/api'
import { isGhostNodeId, realIdFromGhost } from '@/lib/graph/ghostNodes'
import { getTheme } from '@/lib/theme'

interface InviteToClaimCardProps {
  nodeId:    string
  fullName?: string
  isDark:    boolean
}

// Keep in sync with the backend invite-token expiry window (auth/invite services).
const TTL_SECONDS = 5 * 60

export default function InviteToClaimCard({ nodeId, fullName, isDark }: InviteToClaimCardProps) {
  const t = getTheme(isDark)
  const [inviteCode, setInviteCode] = useState<string | null>(null)
  const [inviteGenerating, setInviteGenerating] = useState(false)
  const [inviteCopied, setInviteCopied] = useState(false)
  const [generatedAt, setGeneratedAt] = useState<number | null>(null)
  const [remaining, setRemaining] = useState(TTL_SECONDS)

  const handleGenerateInvite = useCallback(async () => {
    setInviteGenerating(true)
    try {
      const realId = isGhostNodeId(nodeId) ? realIdFromGhost(nodeId) : nodeId
      const { invite_token } = await api.persons.generateInvite(realId)
      setInviteCode(invite_token)
      setGeneratedAt(Date.now())   // (re)start the 5-minute countdown
      setRemaining(TTL_SECONDS)
      setInviteCopied(false)
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

  // Tick the validity countdown once per second while a link exists.
  useEffect(() => {
    if (generatedAt == null) return
    const tick = () => {
      const elapsed = Math.floor((Date.now() - generatedAt) / 1000)
      setRemaining(Math.max(0, TTL_SECONDS - elapsed))
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [generatedAt])

  const expired = inviteCode != null && remaining <= 0
  const mmss = `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`

  // The shareable link drops the invitee straight onto the /invite preview —
  // no code to type.
  const inviteLink = inviteCode
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/invite?token=${inviteCode}`
    : null

  const handleCopyInvite = useCallback(async () => {
    if (!inviteLink || expired) return
    try { await navigator.clipboard.writeText(inviteLink) } catch { /* clipboard unavailable */ }
    setInviteCopied(true)
  }, [inviteLink, expired])

  // ── Palette ──────────────────────────────────────────────────────────────
  const green      = isDark ? '#4ADE80' : '#15803D'
  const greenMuted = isDark ? 'rgba(74,222,128,0.70)' : 'rgba(21,128,61,0.70)'
  const boxBg      = isDark ? '#1A2A1A' : '#DCFCE7'
  const boxBorder  = isDark ? '#14532D' : '#86EFAC'
  const fillGreen  = isDark ? '#14532D' : '#16A34A'
  const RED        = '#EF4444'

  const firstName = fullName?.split(' ')[0] ?? 'them'

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
          <p style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: green }}>
            Invite to join
          </p>
          <p style={{ margin: '2px 0 0', fontSize: '11px', lineHeight: 1.4, color: isDark ? 'rgba(74,222,128,0.70)' : 'rgba(22,163,74,0.75)' }}>
            {fullName?.split(' ')[0] ?? 'This person'} hasn't joined yet
          </p>
        </div>
      </div>

      {!inviteCode ? (
        // ── First-time generate ──────────────────────────────────────────────
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
            background: fillGreen, color: '#fff', border: 'none',
            opacity: inviteGenerating ? 0.6 : 1, transition: 'opacity 0.15s',
          }}
        >
          {inviteGenerating
            ? <><motion.div animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}><IconLoader2 size={13} /></motion.div> Generating…</>
            : <><IconLink size={13} strokeWidth={2.5} /> Generate invite link</>
          }
        </motion.button>
      ) : (
        <>
          {/* ── Link box — pops on every (re)generate via the changing key ───── */}
          <motion.div
            key={generatedAt ?? 'link'}
            initial={{ scale: 0.9, opacity: 0, y: -2 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 22 }}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              background: boxBg,
              border: `1.5px solid ${expired ? RED : boxBorder}`,
              borderRadius: '8px', padding: '0 12px', height: '40px',
              opacity: expired ? 0.6 : 1,
            }}
          >
            <IconLink size={14} style={{ color: expired ? RED : green, flexShrink: 0 }} />
            <span style={{
              flex: 1, fontFamily: 'monospace', fontSize: '11.5px',
              fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              color: expired ? RED : green,
              textDecoration: expired ? 'line-through' : 'none',
            }}>
              {inviteLink}
            </span>
            <button
              onClick={handleCopyInvite}
              disabled={expired}
              style={{
                background: 'none', border: 'none', cursor: expired ? 'default' : 'pointer', padding: '4px',
                color: expired ? t.textMuted : (isDark ? '#4ADE80' : '#16A34A'),
                fontSize: '11px', fontFamily: 'inherit', fontWeight: 600, flexShrink: 0,
                opacity: expired ? 0.5 : 1,
              }}
            >
              {inviteCopied ? <IconCheck size={14} strokeWidth={2.5} /> : 'Copy link'}
            </button>
          </motion.div>

          {/* ── Countdown row ───────────────────────────────────────────────── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <IconClock size={13} style={{ color: expired ? RED : green, flexShrink: 0 }} />
            <span style={{ fontSize: '11px', fontWeight: 600, color: expired ? RED : green }}>
              {expired
                ? 'Link expired — generate a new one'
                : <>Valid for <span style={{ fontVariantNumeric: 'tabular-nums' }}>{mmss}</span></>}
            </span>
          </div>

          {/* ── Countdown progress bar ──────────────────────────────────────── */}
          <div style={{
            height: '3px', borderRadius: '2px', overflow: 'hidden',
            background: isDark ? 'rgba(74,222,128,0.15)' : 'rgba(22,163,74,0.15)',
          }}>
            <div style={{
              height: '100%',
              width: `${(remaining / TTL_SECONDS) * 100}%`,
              background: expired ? RED : (isDark ? '#4ADE80' : '#16A34A'),
              transition: 'width 1s linear',
            }} />
          </div>

          {!expired && (
            <p style={{ fontSize: '11px', margin: 0, lineHeight: 1.5, color: greenMuted }}>
              Share this link with {firstName} — it opens straight to their node, no code needed.
            </p>
          )}

          {/* ── Generate new link — always available, primary once expired ──── */}
          <motion.button
            onClick={handleGenerateInvite}
            disabled={inviteGenerating}
            whileHover={!inviteGenerating ? { scale: 1.01 } : {}}
            whileTap={!inviteGenerating ? { scale: 0.98 } : {}}
            style={{
              width: '100%', height: '32px', borderRadius: '8px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
              cursor: inviteGenerating ? 'default' : 'pointer',
              fontSize: '11.5px', fontWeight: 600, fontFamily: 'inherit',
              background: expired ? fillGreen : 'transparent',
              color: expired ? '#fff' : green,
              border: `1.5px solid ${expired ? fillGreen : boxBorder}`,
              opacity: inviteGenerating ? 0.6 : 1, transition: 'opacity 0.15s',
            }}
          >
            <motion.div
              animate={inviteGenerating ? { rotate: 360 } : { rotate: 0 }}
              transition={inviteGenerating ? { duration: 0.7, repeat: Infinity, ease: 'linear' } : { duration: 0.3 }}
              style={{ display: 'flex' }}
            >
              <IconRefresh size={13} strokeWidth={2.5} />
            </motion.div>
            {inviteGenerating ? 'Generating…' : 'Generate new link'}
          </motion.button>
        </>
      )}
    </div>
  )
}
