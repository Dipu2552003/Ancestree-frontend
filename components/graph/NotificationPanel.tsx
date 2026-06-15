'use client'

// NotificationPanel — slide-in right-side panel with two tabs:
//   • Inbox — incoming notifications (merge requests, claim suggestions, etc.)
//   • Sent  — merge requests this user initiated, with status
//
// Sub-components live in ./notifications/. Each Inbox row dispatches to a
// per-type action card. The Sent tab is fetched lazily on first switch.

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { IconX, IconBell, IconInbox, IconSend } from '@tabler/icons-react'
import { api, type MergeConflict, type SentMergeRequest } from '@/lib/api'
import { useGraphStore } from '@/store/graphStore'
import { getTheme } from '@/lib/theme'
import { SidePanel } from '@/components/ui'
import InboxRow from './notifications/InboxRow'
import SentRow from './notifications/SentRow'

interface NotificationPanelProps {
  isDark:          boolean
  onClose:         () => void
  onMergeAccepted: (conflicts: MergeConflict[]) => void
}

type Tab = 'inbox' | 'sent'

export default function NotificationPanel({
  isDark, onClose, onMergeAccepted,
}: NotificationPanelProps) {
  const t = getTheme(isDark)
  const { notifications, unreadCount, setNotifications, markNotificationRead } = useGraphStore()
  const [tab,          setTab]          = useState<Tab>('inbox')
  const [loading,      setLoading]      = useState(false)
  const [sentRequests, setSentRequests] = useState<SentMergeRequest[]>([])
  const [sentLoading,  setSentLoading]  = useState(false)

  // Load inbox on mount. Always re-fetches so the panel reflects the latest
  // unread count even if the bell badge was stale.
  useEffect(() => {
    setLoading(true)
    api.notifications.list()
      .then(({ notifications: n, unread_count }) => setNotifications(n, unread_count))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [setNotifications])

  // Load Sent tab lazily — only when the user switches to it.
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

  // After a claim-suggestion request is sent, decrement unread without
  // refetching the full list.
  function handleRequested(id: string) {
    setNotifications(
      notifications.map(n => n.id === id ? { ...n, is_read: true } : n),
      Math.max(0, unreadCount - 1),
    )
  }

  return (
    <SidePanel isDark={isDark} width={360} zIndex={250} withOpacity>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div style={{
        padding:        '18px 18px 0',
        borderBottom:   `1px solid ${t.borderNeutral}`,
        flexShrink:     0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <IconBell size={17} color="var(--c-primary)" />
            <span style={{ fontSize: '15px', fontWeight: 700, color: t.text }}>Notifications</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {tab === 'inbox' && unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', color: 'var(--c-primary)', fontFamily: 'inherit', padding: '2px 4px' }}
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
                  ? (isDark ? 'rgb(var(--c-primary-rgb) / 0.12)' : 'rgb(var(--c-primary-rgb) / 0.08)')
                  : 'transparent',
                color:        tab === key ? 'var(--c-primary)' : t.textMuted,
                fontSize:     '12.5px',
                fontWeight:   tab === key ? 700 : 500,
                fontFamily:   'inherit',
                cursor:       'pointer',
                borderBottom: tab === key ? '2px solid var(--c-primary)' : '2px solid transparent',
                transition:   'all 0.15s',
              }}
            >
              {icon}
              {label}
              {count > 0 && (
                <span style={{
                  background: 'var(--c-primary)', color: '#fff',
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
    </SidePanel>
  )
}
