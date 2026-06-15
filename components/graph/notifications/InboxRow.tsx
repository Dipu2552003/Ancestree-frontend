'use client'

// InboxRow — one row in the Inbox tab. Picks an icon + tinted background based
// on notification type, renders the message + age, and dispatches to the
// per-type action card (MergeRequestCard, ClaimSuggestionCard, PossibleMatchCard).
//
// Rows that don't have a dedicated action card auto-mark-read on click.

import { useRouter } from 'next/navigation'
import { IconArrowRight } from '@tabler/icons-react'
import type { AppNotification, MergeConflict } from '@/lib/api'
import { getTheme } from '@/lib/theme'
import MergeRequestCard from './MergeRequestCard'
import ClaimSuggestionCard from './ClaimSuggestionCard'
import PossibleMatchCard from './PossibleMatchCard'
import { timeAgo } from './helpers'

interface InboxRowProps {
  n:              AppNotification
  isDark:         boolean
  onMergeAccepted:(conflicts: MergeConflict[]) => void
  onMarkOne:      (id: string) => void
  onRequested:    (id: string) => void
}

export default function InboxRow({ n, isDark, onMergeAccepted, onMarkOne, onRequested }: InboxRowProps) {
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
    merge_request_received: 'rgb(var(--c-primary-rgb) / 0.06)',
    merge_request_accepted: 'rgba(34,197,94,0.06)',
    merge_request_rejected: 'rgba(239,68,68,0.06)',
    family_name_changed:    'transparent',
    claim_suggestion:       'rgba(99,102,241,0.06)',
    possible_match_found:   'rgb(var(--c-primary-rgb) / 0.04)',
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
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--c-primary)', display: 'inline-block' }} />
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
