'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  IconX, IconBell, IconGitMerge, IconLoader2,
  IconInbox, IconSend, IconClock, IconArrowRight, IconEye,
} from '@tabler/icons-react'
import { api, type AppNotification, type MergeConflict, type SentMergeRequest, type PossibleMatchNotificationDetails } from '@/lib/api'
import type { PendingMatchData } from '@/types'
import { useGraphStore } from '@/store/graphStore'
import { getTheme } from '@/lib/theme'
import MergeAcceptPreviewModal from './MergeAcceptPreviewModal'

interface NotificationPanelProps {
  isDark:          boolean
  onClose:         () => void
  onMergeAccepted: (conflicts: MergeConflict[]) => void
}

type Tab = 'inbox' | 'sent'

// ── Helpers ───────────────────────────────────────────────────────────────────

function getSelfPersonId(): string | null {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('user') : null
    if (!raw) return null
    return (JSON.parse(raw) as { person_id?: string }).person_id ?? null
  } catch { return null }
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}d ago`
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: 'proposed' | 'confirmed' | 'rejected' | 'reversed' }) {
  const cfg = {
    proposed: { label: 'Pending',  bg: 'rgba(234,179,8,0.12)',  color: '#B45309', dot: '#F59E0B' },
    confirmed:{ label: 'Accepted', bg: 'rgba(34,197,94,0.12)',  color: '#15803D', dot: '#22C55E' },
    rejected: { label: 'Rejected', bg: 'rgba(239,68,68,0.10)',  color: '#B91C1C', dot: '#EF4444' },
    reversed: { label: 'Reversed', bg: 'rgba(107,114,128,0.10)', color: '#4B5563', dot: '#9CA3AF' },
  }[status]

  return (
    <span style={{
      display:      'inline-flex',
      alignItems:   'center',
      gap:          '5px',
      padding:      '3px 9px',
      borderRadius: '999px',
      background:   cfg.bg,
      fontSize:     '10.5px',
      fontWeight:   700,
      color:        cfg.color,
      whiteSpace:   'nowrap',
    }}>
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: cfg.dot, display: 'inline-block', flexShrink: 0 }} />
      {cfg.label}
    </span>
  )
}

// ── MergeRequestCard (incoming — shown in Inbox) ──────────────────────────────

function MergeRequestCard({
  notification, isDark, onAccepted,
}: {
  notification: AppNotification
  isDark:       boolean
  onAccepted:   (conflicts: MergeConflict[]) => void
}) {
  const t = getTheme(isDark)
  const router = useRouter()
  const { markNotificationRead } = useGraphStore()
  const [actionState, setActionState] = useState<'idle' | 'loading' | 'done' | 'rejected'>('idle')
  const [err, setErr] = useState('')
  const [viewLoading, setViewLoading] = useState(false)

  // Resolved merge record + open state for the preview modal. Filled in
  // when the user clicks Accept (we need person ids/names that the
  // notification payload alone doesn't carry).
  const [preview, setPreview] = useState<{
    mergeRecordId: string
    myPersonId:    string
    myPersonName:  string
    theirPersonId: string
    theirPersonName: string
  } | null>(null)

  async function handleViewTree() {
    if (!notification.merge_record_id) return
    setViewLoading(true)
    try {
      const merge = await api.merges.getById(notification.merge_record_id)
      const data: PendingMatchData = {
        mode:                'review',
        mergeRecordId:       notification.merge_record_id,
        myPersonId:          merge.canonical_person_id,
        myPersonName:        merge.canonical_person_name,
        canonicalPersonId:   merge.merged_person_id,
        canonicalFamilyName: merge.merged_family_name,
        canonicalPersonName: merge.merged_person_name,
        matchScore:          0,
        matchedFields:       [],
      }
      sessionStorage.setItem('pendingMatch', JSON.stringify(data))
      router.push(`/graph?perspective=${merge.merged_person_id}&viewMerge=${notification.merge_record_id}`)
    } catch {
      // silently ignore — user can still use inline Accept/Reject
    } finally {
      setViewLoading(false)
    }
  }

  // If the merge record is already resolved (loaded from backend via merge_status),
  // show a status badge instead of action buttons.
  const resolvedStatus = notification.merge_status
  const isAlreadyResolved = resolvedStatus === 'confirmed' || resolvedStatus === 'rejected' || resolvedStatus === 'reversed'

  if (isAlreadyResolved) {
    return (
      <div style={{ marginTop: '8px' }}>
        <StatusBadge status={resolvedStatus!} />
        {resolvedStatus === 'confirmed' && (
          <p style={{ margin: '5px 0 0', fontSize: '11px', color: '#15803D' }}>
            Trees were connected successfully.
          </p>
        )}
        {resolvedStatus === 'rejected' && (
          <p style={{ margin: '5px 0 0', fontSize: '11px', color: t.textMuted }}>
            This request was declined.
          </p>
        )}
      </div>
    )
  }

  if (actionState === 'done') {
    return (
      <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <StatusBadge status="confirmed" />
        <span style={{ fontSize: '11px', color: '#15803D' }}>Trees connected.</span>
      </div>
    )
  }
  if (actionState === 'rejected') {
    return (
      <div style={{ marginTop: '8px' }}>
        <StatusBadge status="rejected" />
      </div>
    )
  }

  /** Opens the merge-preview modal. The actual accept API call happens
   *  inside the modal — only after the user has reviewed both sides and
   *  the simulated merged tree, then confirmed. */
  async function openPreview() {
    if (!notification.merge_record_id) return
    setActionState('loading'); setErr('')
    try {
      const merge = await api.merges.getById(notification.merge_record_id)
      setPreview({
        mergeRecordId:   merge.id,
        myPersonId:      merge.canonical_person_id,
        myPersonName:    merge.canonical_person_name,
        theirPersonId:   merge.merged_person_id,
        theirPersonName: merge.merged_person_name,
      })
      setActionState('idle')
    } catch (e) {
      setActionState('idle')
      setErr(e instanceof Error ? e.message : 'Could not load merge details')
    }
  }

  async function handlePreviewAccepted(conflicts: MergeConflict[]) {
    setPreview(null)
    try { await api.notifications.markRead(notification.id) } catch { /* non-fatal */ }
    markNotificationRead(notification.id)
    setActionState('done')
    onAccepted(conflicts)
  }

  async function reject() {
    if (!notification.merge_record_id) return
    setActionState('loading'); setErr('')
    try {
      await api.merges.reject(notification.merge_record_id)
      await api.notifications.markRead(notification.id)
      markNotificationRead(notification.id)
      setActionState('rejected')
    } catch (e) {
      setActionState('idle')
      setErr(e instanceof Error ? e.message : 'Failed to reject')
    }
  }

  return (
    <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '7px' }}>
      {/* View their tree — explore before deciding */}
      <button
        onClick={handleViewTree}
        disabled={viewLoading}
        style={{
          height: '32px', borderRadius: '8px',
          border: `1px solid ${isDark ? 'rgba(234,88,12,0.35)' : 'rgba(234,88,12,0.28)'}`,
          background: isDark ? 'rgba(234,88,12,0.10)' : 'rgba(234,88,12,0.06)',
          color: '#EA580C', fontSize: '11.5px', fontWeight: 600,
          fontFamily: 'inherit', cursor: viewLoading ? 'default' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
          opacity: viewLoading ? 0.6 : 1,
        }}
      >
        {viewLoading
          ? <motion.span animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}><IconLoader2 size={12} /></motion.span>
          : <><IconArrowRight size={12} /> View their tree first</>
        }
      </button>

      {err && <p style={{ margin: 0, fontSize: '11px', color: '#EF4444' }}>{err}</p>}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={openPreview}
          disabled={actionState === 'loading'}
          style={{
            flex: 1, height: '34px', borderRadius: '9px', border: 'none',
            background: 'linear-gradient(135deg, #EA580C, #C2410C)',
            color: '#fff', fontSize: '12px', fontWeight: 600,
            fontFamily: 'inherit', cursor: actionState === 'loading' ? 'default' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
            opacity: actionState === 'loading' ? 0.7 : 1,
            boxShadow: '0 2px 8px rgba(234,88,12,0.3)',
          }}
        >
          {actionState === 'loading'
            ? <motion.span animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}><IconLoader2 size={13} /></motion.span>
            : <><IconGitMerge size={13} /> Accept & Connect</>
          }
        </button>
        <button
          onClick={reject}
          disabled={actionState === 'loading'}
          style={{
            flex: 1, height: '34px', borderRadius: '9px',
            border: `1.5px solid ${getTheme(isDark).borderNeutral}`,
            background: 'transparent', color: getTheme(isDark).textMuted,
            fontSize: '12px', fontFamily: 'inherit',
            cursor: actionState === 'loading' ? 'default' : 'pointer',
          }}
        >
          Reject
        </button>
      </div>

      <AnimatePresence>
        {preview && (
          <MergeAcceptPreviewModal
            key={preview.mergeRecordId}
            mergeRecordId={preview.mergeRecordId}
            myPersonId={preview.myPersonId}
            myPersonName={preview.myPersonName}
            myPhotoUrl={null}
            myGender={null}
            myBirthYear={null}
            theirPersonId={preview.theirPersonId}
            theirPersonName={preview.theirPersonName}
            isDark={isDark}
            onCancel={() => setPreview(null)}
            onAccepted={handlePreviewAccepted}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ── ClaimSuggestionCard ───────────────────────────────────────────────────────

function ClaimSuggestionCard({
  notification, isDark, onRequested,
}: {
  notification: AppNotification
  isDark:       boolean
  onRequested:  () => void
}) {
  const t = getTheme(isDark)
  const router = useRouter()
  const { markNotificationRead } = useGraphStore()
  const [state, setState] = useState<'idle' | 'loading' | 'done'>('idle')
  const [err, setErr] = useState('')

  async function handleViewTree() {
    if (!notification.related_person_id) return
    router.push(`/graph?perspective=${notification.related_person_id}`)
  }

  async function handleRequest() {
    const selfPersonId = getSelfPersonId()
    if (!selfPersonId || !notification.related_person_id) return
    setState('loading'); setErr('')
    try {
      await api.merges.create({ new_person_id: selfPersonId, canonical_person_id: notification.related_person_id })
      await api.notifications.markRead(notification.id)
      markNotificationRead(notification.id)
      setState('done')
      onRequested()
    } catch (e) {
      setState('idle')
      setErr(e instanceof Error ? e.message : 'Failed to send request')
    }
  }

  if (state === 'done') {
    return (
      <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <StatusBadge status="proposed" />
        <span style={{ fontSize: '11px', color: t.textMuted }}>Waiting for their response.</span>
      </div>
    )
  }

  return (
    <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {/* View their tree first — lets the user confirm it's really them */}
      <button
        onClick={handleViewTree}
        disabled={!notification.related_person_id}
        style={{
          height: '32px', borderRadius: '8px',
          border: `1px solid ${isDark ? 'rgba(234,88,12,0.35)' : 'rgba(234,88,12,0.28)'}`,
          background: isDark ? 'rgba(234,88,12,0.10)' : 'rgba(234,88,12,0.06)',
          color: '#EA580C', fontSize: '11.5px', fontWeight: 600,
          fontFamily: 'inherit', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
        }}
      >
        <IconEye size={12} /> View their tree
      </button>

      {err && <p style={{ margin: 0, fontSize: '11px', color: '#EF4444' }}>{err}</p>}
      <button
        onClick={handleRequest}
        disabled={state === 'loading'}
        style={{
          height: '34px', borderRadius: '9px', border: 'none',
          background: 'linear-gradient(135deg, #EA580C, #C2410C)',
          color: '#fff', fontSize: '12px', fontWeight: 600, fontFamily: 'inherit',
          cursor: state === 'loading' ? 'default' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
          opacity: state === 'loading' ? 0.7 : 1, padding: '0 16px',
          boxShadow: '0 2px 8px rgba(234,88,12,0.3)',
        }}
      >
        {state === 'loading'
          ? <motion.span animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}><IconLoader2 size={13} /></motion.span>
          : <><IconGitMerge size={13} /> Request to join</>
        }
      </button>
    </div>
  )
}

// ── PossibleMatchCard ─────────────────────────────────────────────────────────

function PossibleMatchCard({
  notification, isDark, onMarkRead,
}: {
  notification: AppNotification
  isDark:       boolean
  onMarkRead:   (id: string) => void
}) {
  const t = getTheme(isDark)
  const router = useRouter()
  const [viewLoading,  setViewLoading]  = useState(false)
  const [dismissed,    setDismissed]    = useState(notification.is_read)

  const rawDetails = notification.details as PossibleMatchNotificationDetails | null

  // Guard — render nothing if data is missing (shouldn't happen in practice)
  if (!rawDetails || !notification.related_person_id) return null

  // Narrowed non-null captures for use inside closures
  const relPersonId: string = notification.related_person_id
  if (dismissed) return <p style={{ margin: '6px 0 0', fontSize: '11px', color: t.textMuted }}>Dismissed</p>

  // Capture narrowed constants so closures have non-null types
  const details = rawDetails
  const conf = details.match_score >= 70 ? 'Strong match' : details.match_score >= 40 ? 'Possible match' : 'Weak match'
  const confColor = details.match_score >= 70 ? '#15803D' : details.match_score >= 40 ? '#B45309' : t.textMuted

  async function handleViewTree() {
    setViewLoading(true)
    try {
      const data: PendingMatchData = {
        mode:                'explore',
        myPersonId:          relPersonId,
        myPersonName:        details.new_person_name,
        myBirthYear:         details.new_person_birth_year,
        myNativeVillage:     details.new_person_native_village,
        myGotra:             details.new_person_gotra,
        myPhotoUrl:          details.new_person_photo_url,
        matchScore:          details.match_score,
        matchedFields:       details.matched_fields,
        canonicalPersonId:   details.canonical_person_id,
        canonicalPersonName: details.canonical_person_name,
        canonicalFamilyName: details.canonical_family_name,
      }
      sessionStorage.setItem('pendingMatch', JSON.stringify(data))
      router.push(`/graph?perspective=${details.canonical_person_id}&match=${relPersonId}`)
    } finally {
      setViewLoading(false)
    }
  }

  async function handleDismiss() {
    setDismissed(true)
    onMarkRead(notification.id)
  }

  return (
    <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '7px' }}>
      <div style={{ fontSize: '11.5px', color: t.textMuted, lineHeight: 1.5 }}>
        <span style={{ color: t.text, fontWeight: 600 }}>{details.canonical_person_name}</span>
        {' · '}
        <span style={{ color: confColor, fontWeight: 600 }}>{conf}</span>
      </div>

      <button
        onClick={handleViewTree}
        disabled={viewLoading}
        style={{
          height: '32px', borderRadius: '8px',
          border: `1px solid ${isDark ? 'rgba(234,88,12,0.35)' : 'rgba(234,88,12,0.28)'}`,
          background: isDark ? 'rgba(234,88,12,0.10)' : 'rgba(234,88,12,0.06)',
          color: '#EA580C', fontSize: '11.5px', fontWeight: 600,
          fontFamily: 'inherit', cursor: viewLoading ? 'default' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
          opacity: viewLoading ? 0.6 : 1,
        }}
      >
        {viewLoading
          ? <motion.span animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}><IconLoader2 size={12} /></motion.span>
          : <><IconArrowRight size={12} /> View tree &amp; decide</>
        }
      </button>

      <button
        onClick={handleDismiss}
        style={{
          height: '30px', borderRadius: '8px',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
          background: 'transparent', color: t.textMuted,
          fontSize: '11px', fontFamily: 'inherit', cursor: 'pointer',
        }}
      >
        Dismiss
      </button>
    </div>
  )
}

// ── Inbox notification row ────────────────────────────────────────────────────

function InboxRow({
  n, isDark, onMergeAccepted, onMarkOne, onRequested,
}: {
  n:              AppNotification
  isDark:         boolean
  onMergeAccepted:(conflicts: MergeConflict[]) => void
  onMarkOne:      (id: string) => void
  onRequested:    (id: string) => void
}) {
  const t = getTheme(isDark)
  const router = useRouter()

  const iconMap: Record<AppNotification['type'], string> = {
    merge_request_received: '🔗',
    merge_request_accepted: '✅',
    merge_request_rejected: '❌',
    family_name_changed:    '🌿',
    claim_suggestion:       '👋',
    possible_match_found:   '🔍',
  }

  const accentMap: Record<AppNotification['type'], string> = {
    merge_request_received: 'rgba(234,88,12,0.06)',
    merge_request_accepted: 'rgba(34,197,94,0.06)',
    merge_request_rejected: 'rgba(239,68,68,0.06)',
    family_name_changed:    'transparent',
    claim_suggestion:       'rgba(99,102,241,0.06)',
    possible_match_found:   'rgba(234,88,12,0.04)',
  }

  return (
    <div
      style={{
        padding:      '14px 18px',
        borderBottom: `1px solid ${t.borderNeutral}`,
        background:   n.is_read ? 'transparent' : accentMap[n.type],
        cursor:       (!n.is_read && n.type !== 'merge_request_received' && n.type !== 'claim_suggestion' && n.type !== 'possible_match_found') ? 'pointer' : 'default',
        transition:   'background 0.15s',
      }}
      onClick={() => {
        if (!n.is_read && n.type !== 'merge_request_received' && n.type !== 'claim_suggestion' && n.type !== 'possible_match_found') {
          onMarkOne(n.id)
        }
      }}
    >
      <div style={{ display: 'flex', gap: '11px', alignItems: 'flex-start' }}>
        {/* Icon */}
        <span style={{ fontSize: '20px', lineHeight: 1.2, flexShrink: 0, marginTop: '1px' }}>
          {iconMap[n.type]}
        </span>

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Message */}
          <p style={{ margin: '0 0 4px', fontSize: '12.5px', color: t.text, lineHeight: 1.5 }}>
            {n.message}
          </p>

          {/* Time + unread dot row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '10.5px', color: t.textMuted }}>{timeAgo(n.created_at)}</span>
            {!n.is_read && (
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#EA580C', display: 'inline-block' }} />
            )}
          </div>

          {/* Action cards */}
          {n.type === 'merge_request_received' && n.merge_record_id && (
            <MergeRequestCard
              notification={n}
              isDark={isDark}
              onAccepted={onMergeAccepted}
            />
          )}
          {n.type === 'merge_request_accepted' && (
            <button
              onClick={() => {
                if (!n.is_read) onMarkOne(n.id)
                router.push('/graph')
              }}
              style={{
                marginTop: '10px',
                height: '32px', width: '100%', borderRadius: '8px',
                border: `1px solid rgba(34,197,94,0.35)`,
                background: isDark ? 'rgba(34,197,94,0.10)' : 'rgba(34,197,94,0.08)',
                color: '#15803D', fontSize: '11.5px', fontWeight: 600,
                fontFamily: 'inherit', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
              }}
            >
              <IconArrowRight size={12} /> View merged tree
            </button>
          )}
          {n.type === 'claim_suggestion' && n.related_person_id && (
            <ClaimSuggestionCard
              notification={n}
              isDark={isDark}
              onRequested={() => onRequested(n.id)}
            />
          )}
          {n.type === 'possible_match_found' && n.details && (
            <PossibleMatchCard
              notification={n}
              isDark={isDark}
              onMarkRead={onMarkOne}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// ── Sent request row ──────────────────────────────────────────────────────────

function SentRow({ r, isDark }: { r: SentMergeRequest; isDark: boolean }) {
  const t = getTheme(isDark)

  const borderColor = {
    proposed: '#F59E0B',
    confirmed: '#22C55E',
    rejected:  '#EF4444',
    reversed:  '#9CA3AF',
  }[r.status]

  const bgColor = {
    proposed:  isDark ? 'rgba(234,179,8,0.05)'  : 'rgba(234,179,8,0.03)',
    confirmed: isDark ? 'rgba(34,197,94,0.06)'  : 'rgba(34,197,94,0.03)',
    rejected:  isDark ? 'rgba(239,68,68,0.06)'  : 'rgba(239,68,68,0.03)',
    reversed:  'transparent',
  }[r.status]

  return (
    <div style={{
      margin:       '0 0 10px',
      borderRadius: '13px',
      border:       `1.5px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}`,
      borderLeft:   `4px solid ${borderColor}`,
      background:   bgColor,
      overflow:     'hidden',
    }}>
      {/* Header row */}
      <div style={{
        padding:        '11px 14px 0',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        gap:            '8px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0 }}>
          <IconGitMerge size={13} color={borderColor} style={{ flexShrink: 0 }} />
          <span style={{
            fontSize:     '12.5px',
            fontWeight:   600,
            color:        t.text,
            overflow:     'hidden',
            textOverflow: 'ellipsis',
            whiteSpace:   'nowrap',
          }}>
            {r.merged_person_name}
          </span>
          <span style={{ fontSize: '11px', color: t.textMuted, flexShrink: 0 }}>→</span>
          <span style={{
            fontSize:     '12px',
            color:        t.textMuted,
            overflow:     'hidden',
            textOverflow: 'ellipsis',
            whiteSpace:   'nowrap',
          }}>
            {r.canonical_person_name}
          </span>
        </div>
        <StatusBadge status={r.status} />
      </div>

      {/* Detail row */}
      <div style={{ padding: '6px 14px 11px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <IconClock size={11} color={t.textMuted} style={{ flexShrink: 0 }} />
        <span style={{ fontSize: '10.5px', color: t.textMuted }}>
          Sent {timeAgo(r.created_at)}
          {r.status === 'confirmed' && r.merged_at && ` · Accepted ${timeAgo(r.merged_at)}`}
          {r.status === 'rejected'  && r.merged_at && ` · Rejected ${timeAgo(r.merged_at)}`}
        </span>
      </div>

      {/* Status message */}
      {r.status === 'proposed' && (
        <div style={{ padding: '0 14px 11px' }}>
          <span style={{ fontSize: '11px', color: '#B45309' }}>
            ⏳ Waiting for {r.canonical_person_name} to respond…
          </span>
        </div>
      )}
      {r.status === 'confirmed' && (
        <div style={{ padding: '0 14px 11px' }}>
          <span style={{ fontSize: '11px', color: '#15803D' }}>
            🎉 Your trees are now connected!
          </span>
        </div>
      )}
      {r.status === 'rejected' && (
        <div style={{ padding: '0 14px 11px' }}>
          <span style={{ fontSize: '11px', color: t.textMuted }}>
            This merge request was declined.
          </span>
        </div>
      )}
    </div>
  )
}

// ── Main panel ─────────────────────────────────────────────────────────────────

export default function NotificationPanel({
  isDark, onClose, onMergeAccepted,
}: NotificationPanelProps) {
  const t = getTheme(isDark)
  const { notifications, unreadCount, setNotifications, markNotificationRead } = useGraphStore()
  const [tab,          setTab]          = useState<Tab>('inbox')
  const [loading,      setLoading]      = useState(false)
  const [sentRequests, setSentRequests] = useState<SentMergeRequest[]>([])
  const [sentLoading,  setSentLoading]  = useState(false)

  // Load inbox
  useEffect(() => {
    setLoading(true)
    api.notifications.list()
      .then(({ notifications: n, unread_count }) => setNotifications(n, unread_count))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [setNotifications])

  // Load sent tab when switched to
  useEffect(() => {
    if (tab !== 'sent') return
    setSentLoading(true)
    api.merges.listSent()
      .then(({ requests }) => setSentRequests(requests))
      .catch(() => {})
      .finally(() => setSentLoading(false))
  }, [tab])

  async function handleMarkAllRead() {
    await api.notifications.markAllRead().catch(() => {})
    setNotifications(notifications.map(n => ({ ...n, is_read: true })), 0)
  }

  function handleRequested(id: string) {
    setNotifications(
      notifications.map(n => n.id === id ? { ...n, is_read: true } : n),
      Math.max(0, unreadCount - 1),
    )
  }

  return (
    <motion.div
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0,      opacity: 1 }}
      exit={{    x: '100%', opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      style={{
        position:      'fixed',
        top:           0, right: 0, bottom: 0,
        width:         '360px',
        zIndex:        250,
        background:    t.panelBg,
        borderLeft:    `1.5px solid ${t.borderNeutral}`,
        boxShadow:     isDark ? '-8px 0 32px rgba(0,0,0,0.5)' : '-4px 0 24px rgba(0,0,0,0.10)',
        display:       'flex',
        flexDirection: 'column',
        overflow:      'hidden',
      }}
    >
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div style={{
        padding:        '18px 18px 0',
        borderBottom:   `1px solid ${t.borderNeutral}`,
        flexShrink:     0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <IconBell size={17} color="#EA580C" />
            <span style={{ fontSize: '15px', fontWeight: 700, color: t.text }}>Notifications</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {tab === 'inbox' && unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', color: '#EA580C', fontFamily: 'inherit', padding: '2px 4px' }}
              >
                Mark all read
              </button>
            )}
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textMuted, display: 'flex', padding: '2px' }}
            >
              <IconX size={16} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px' }}>
          {([
            { key: 'inbox', label: 'Inbox', icon: <IconInbox size={13} />, count: unreadCount },
            { key: 'sent',  label: 'Sent',  icon: <IconSend  size={13} />, count: 0 },
          ] as const).map(({ key, label, icon, count }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                display:      'flex',
                alignItems:   'center',
                gap:          '5px',
                padding:      '7px 14px',
                borderRadius: '8px 8px 0 0',
                border:       'none',
                background:   tab === key
                  ? (isDark ? 'rgba(234,88,12,0.12)' : 'rgba(234,88,12,0.08)')
                  : 'transparent',
                color:        tab === key ? '#EA580C' : t.textMuted,
                fontSize:     '12.5px',
                fontWeight:   tab === key ? 700 : 500,
                fontFamily:   'inherit',
                cursor:       'pointer',
                borderBottom: tab === key ? '2px solid #EA580C' : '2px solid transparent',
                transition:   'all 0.15s',
              }}
            >
              {icon}
              {label}
              {count > 0 && (
                <span style={{
                  background: '#EA580C', color: '#fff',
                  borderRadius: '999px', fontSize: '9px', fontWeight: 700,
                  padding: '1px 6px', lineHeight: 1.7, minWidth: '18px', textAlign: 'center',
                }}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Inbox tab ───────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {tab === 'inbox' && (
          <motion.div
            key="inbox"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={{ flex: 1, overflowY: 'auto' }}
          >
            {loading && (
              <div style={{ padding: '32px', textAlign: 'center', color: t.textMuted, fontSize: '13px' }}>
                Loading…
              </div>
            )}
            {!loading && notifications.length === 0 && (
              <div style={{ padding: '48px 20px', textAlign: 'center' }}>
                <IconBell size={32} color={t.textMuted} style={{ opacity: 0.3, marginBottom: '8px' }} />
                <p style={{ margin: 0, fontSize: '13px', color: t.textMuted }}>No notifications yet</p>
              </div>
            )}
            {!loading && notifications.map(n => (
              <InboxRow
                key={n.id}
                n={n}
                isDark={isDark}
                onMergeAccepted={onMergeAccepted}
                onMarkOne={async id => {
                  await api.notifications.markRead(id).catch(() => {})
                  markNotificationRead(id)
                }}
                onRequested={handleRequested}
              />
            ))}
          </motion.div>
        )}

        {/* ── Sent tab ──────────────────────────────────────────────────── */}
        {tab === 'sent' && (
          <motion.div
            key="sent"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 0' }}
          >
            {sentLoading && (
              <div style={{ padding: '32px', textAlign: 'center', color: t.textMuted, fontSize: '13px' }}>
                Loading…
              </div>
            )}
            {!sentLoading && sentRequests.length === 0 && (
              <div style={{ padding: '48px 20px', textAlign: 'center' }}>
                <IconSend size={32} color={t.textMuted} style={{ opacity: 0.3, marginBottom: '8px' }} />
                <p style={{ margin: 0, fontSize: '13px', color: t.textMuted }}>No merge requests sent yet</p>
                <p style={{ margin: '6px 0 0', fontSize: '11.5px', color: t.textMuted, lineHeight: 1.5 }}>
                  When you send a merge request for a duplicate node, its status will appear here.
                </p>
              </div>
            )}
            {!sentLoading && sentRequests.map(r => (
              <SentRow key={r.id} r={r} isDark={isDark} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
