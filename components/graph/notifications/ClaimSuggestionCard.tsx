'use client'

// ClaimSuggestionCard — shown inside an InboxRow when the notification's type
// is `claim_suggestion`. The backend has found another tree where the current
// user appears to already exist (e.g. a parent created a proxy node for them).
// User can either preview that tree or request to merge themselves into it.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { IconEye, IconGitMerge } from '@tabler/icons-react'
import { api, type AppNotification } from '@/lib/api'
import { useGraphStore } from '@/store/graphStore'
import { getTheme } from '@/lib/theme'
import { Spinner, StatusBadge } from '@/components/ui'
import { getSelfPersonId } from './helpers'

interface ClaimSuggestionCardProps {
  notification: AppNotification
  isDark:       boolean
  onRequested:  () => void
}

export default function ClaimSuggestionCard({ notification, isDark, onRequested }: ClaimSuggestionCardProps) {
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
          ? <Spinner size={13} />
          : <><IconGitMerge size={13} /> Request to join</>
        }
      </button>
    </div>
  )
}
