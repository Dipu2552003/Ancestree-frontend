'use client'

// HistoryPanel — slide-in right-side panel listing the family's headline
// operations (people added, merges accepted — the backend filters out field
// edits and other noise). Each entry shows a human summary, who did it, and
// when. Entries that haven't been reverted expose a two-step Undo
// (click → confirm), which calls the backend undo endpoint and then refreshes
// both the list and the graph.
//
// Undo is one-shot: a reverted entry shows an "Undone" badge and can't be
// reverted again by either family. History itself is never deleted.

import { useCallback, useEffect, useState } from 'react'
import { IconX, IconHistory, IconArrowBackUp, IconLoader2 } from '@tabler/icons-react'
import { api, type HistoryOperation } from '@/lib/api'
import { getFamilyId } from '@/lib/storage'
import { getTheme } from '@/lib/theme'
import { SidePanel } from '@/components/ui'

interface HistoryPanelProps {
  isDark:   boolean
  onClose:  () => void
  /** Called after a successful undo so the parent can refetch the graph. */
  onUndone: () => Promise<void> | void
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const min = Math.floor(ms / 60_000)
  if (min < 1)   return 'just now'
  if (min < 60)  return `${min}m ago`
  const hrs = Math.floor(min / 60)
  if (hrs < 24)  return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7)  return `${days}d ago`
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function HistoryPanel({ isDark, onClose, onUndone }: HistoryPanelProps) {
  const t = getTheme(isDark)
  const familyId = getFamilyId()

  const [ops,        setOps]        = useState<HistoryOperation[]>([])
  const [loading,    setLoading]    = useState(true)
  const [confirmId,  setConfirmId]  = useState<string | null>(null)
  const [undoingId,  setUndoingId]  = useState<string | null>(null)
  const [error,      setError]      = useState('')

  const load = useCallback(async () => {
    if (!familyId) {
      setError('Could not determine your family — please log in again.')
      setLoading(false)
      return
    }
    try {
      const { operations } = await api.history.list(familyId)
      setOps(operations)
    } catch (e) {
      // Keep whatever we had, but say why the list may be stale/empty —
      // otherwise a failed request masquerades as "No changes recorded yet".
      setError(e instanceof Error ? e.message : 'Failed to load history')
    }
    finally { setLoading(false) }
  }, [familyId])

  useEffect(() => { load() }, [load])

  async function handleUndo(operationId: string) {
    if (!familyId) return
    setUndoingId(operationId)
    setError('')
    try {
      await api.history.undo(familyId, operationId)
      await load()
      await onUndone()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Undo failed')
    } finally {
      setUndoingId(null)
      setConfirmId(null)
    }
  }

  return (
    <SidePanel isDark={isDark} width={360} zIndex={250} withOpacity>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div style={{
        padding:      '18px 18px 14px',
        borderBottom: `1px solid ${t.borderNeutral}`,
        flexShrink:   0,
        display:      'flex',
        alignItems:   'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <IconHistory size={17} color="var(--c-primary)" />
          <span style={{ fontSize: '15px', fontWeight: 700, color: t.text }}>History</span>
        </div>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textMuted, display: 'flex', padding: '2px' }}
        >
          <IconX size={16} />
        </button>
      </div>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {error && (
          <div style={{
            margin: '12px 14px 0', padding: '8px 10px', borderRadius: '8px',
            background: 'rgba(239,68,68,0.10)', color: '#EF4444', fontSize: '12px',
          }}>
            {error}
          </div>
        )}

        {loading && (
          <div style={{ padding: '32px', textAlign: 'center', color: t.textMuted, fontSize: '13px' }}>
            Loading…
          </div>
        )}

        {!loading && ops.length === 0 && (
          <div style={{ padding: '48px 20px', textAlign: 'center' }}>
            <IconHistory size={32} color={t.textMuted} style={{ opacity: 0.3, marginBottom: '8px' }} />
            <p style={{ margin: 0, fontSize: '13px', color: t.textMuted }}>No changes recorded yet</p>
            <p style={{ margin: '6px 0 0', fontSize: '11.5px', color: t.textMuted, lineHeight: 1.5 }}>
              New family members and merges appear here and can be undone.
            </p>
          </div>
        )}

        {!loading && ops.map(op => {
          const isConfirming = confirmId === op.operation_id
          const isUndoing    = undoingId === op.operation_id
          return (
            <div
              key={op.operation_id}
              style={{
                padding:      '12px 16px',
                borderBottom: `1px solid ${t.borderNeutral}`,
                opacity:      op.reverted ? 0.55 : 1,
                display:      'flex',
                alignItems:   'center',
                gap:          '10px',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: t.text, lineHeight: 1.35 }}>
                  {op.summary}
                </div>
                <div style={{ fontSize: '11px', color: t.textMuted, marginTop: '3px' }}>
                  {op.actor_name ?? 'System'} · {timeAgo(op.created_at)}
                  {op.entry_count > 1 && ` · ${op.entry_count} changes`}
                </div>
              </div>

              {op.reverted ? (
                <span style={{
                  fontSize: '10px', fontWeight: 700, color: t.textMuted,
                  border: `1px solid ${t.borderNeutral}`, borderRadius: '999px',
                  padding: '2px 8px', flexShrink: 0,
                }}>
                  Undone
                </span>
              ) : op.can_undo && (
                <button
                  onClick={() => isConfirming ? handleUndo(op.operation_id) : setConfirmId(op.operation_id)}
                  onBlur={() => { if (!isUndoing) setConfirmId(null) }}
                  disabled={isUndoing || undoingId !== null}
                  style={{
                    display:      'flex',
                    alignItems:   'center',
                    gap:          '4px',
                    padding:      '5px 10px',
                    borderRadius: '8px',
                    border:       `1px solid ${isConfirming ? '#EF4444' : t.borderNeutral}`,
                    background:   isConfirming ? 'rgba(239,68,68,0.10)' : 'transparent',
                    color:        isConfirming ? '#EF4444' : 'var(--c-primary)',
                    fontSize:     '11px',
                    fontWeight:   700,
                    fontFamily:   'inherit',
                    cursor:       undoingId !== null ? 'default' : 'pointer',
                    flexShrink:   0,
                    transition:   'all 0.15s',
                  }}
                >
                  {isUndoing
                    ? <IconLoader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                    : <IconArrowBackUp size={13} />}
                  {isUndoing ? 'Undoing…' : isConfirming ? 'Confirm?' : 'Undo'}
                </button>
              )}
            </div>
          )
        })}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </SidePanel>
  )
}
