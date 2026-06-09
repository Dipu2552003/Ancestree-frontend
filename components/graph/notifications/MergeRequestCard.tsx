'use client'

// MergeRequestCard — shown inside an InboxRow when the notification's type is
// `merge_request_received`. Lets the recipient:
//
//   1. View the requester's tree first (router push to /graph?perspective=…)
//   2. Open the merge preview modal (the actual API accept call happens there)
//   3. Reject the merge inline
//
// If the merge record is already resolved (confirmed / rejected / reversed),
// renders a StatusBadge instead of action buttons — covers the case where the
// user accepted/rejected from another device.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence } from 'framer-motion'
import { IconArrowRight, IconGitMerge } from '@tabler/icons-react'
import { api, type AppNotification, type MergeConflict } from '@/lib/api'
import type { PendingMatchData } from '@/types'
import { useGraphStore } from '@/store/graphStore'
import { getTheme } from '@/lib/theme'
import { Spinner, StatusBadge } from '@/components/ui'
import MergeAcceptPreviewModal from '../merge/MergeAcceptPreviewModal'

interface MergeRequestCardProps {
  notification: AppNotification
  isDark:       boolean
  onAccepted:   (conflicts: MergeConflict[]) => void
}

export default function MergeRequestCard({ notification, isDark, onAccepted }: MergeRequestCardProps) {
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
          ? <Spinner size={12} />
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
            ? <Spinner size={13} />
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
