'use client'

// PossibleMatchCard — shown inside an InboxRow when the notification's type is
// `possible_match_found`. Backend's fuzzy matcher has spotted a likely duplicate
// elsewhere in the graph. User can preview that tree (sets up the exploration
// flow on /graph?perspective=…) or dismiss the suggestion.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { IconArrowRight } from '@tabler/icons-react'
import type { AppNotification, PossibleMatchNotificationDetails } from '@/lib/api'
import type { PendingMatchData } from '@/types'
import { getTheme } from '@/lib/theme'
import { Spinner } from '@/components/ui'

interface PossibleMatchCardProps {
  notification: AppNotification
  isDark:       boolean
  onMarkRead:   (id: string) => void
}

export default function PossibleMatchCard({ notification, isDark, onMarkRead }: PossibleMatchCardProps) {
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
          border: `1px solid ${isDark ? 'rgb(var(--c-primary-rgb) / 0.35)' : 'rgb(var(--c-primary-rgb) / 0.28)'}`,
          background: isDark ? 'rgb(var(--c-primary-rgb) / 0.10)' : 'rgb(var(--c-primary-rgb) / 0.06)',
          color: 'var(--c-primary)', fontSize: '11.5px', fontWeight: 600,
          fontFamily: 'inherit', cursor: viewLoading ? 'default' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
          opacity: viewLoading ? 0.6 : 1,
        }}
      >
        {viewLoading
          ? <Spinner size={12} />
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
