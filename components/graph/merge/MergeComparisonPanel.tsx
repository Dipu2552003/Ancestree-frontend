'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { IconX, IconGitMerge, IconCheck, IconArrowLeft } from '@tabler/icons-react'
import type { Node, Edge } from '@xyflow/react'
import type { PersonData, PendingMatchData } from '@/types'
import { api } from '@/lib/api'
import { getTheme } from '@/lib/theme'
import { Avatar, Spinner, SidePanel } from '@/components/ui'
import MergeAcceptPreviewModal from './MergeAcceptPreviewModal'

interface MergeComparisonPanelProps {
  pendingMatch:     PendingMatchData
  matchNode:        Node
  nodes:            Node[]
  edges:            Edge[]
  isDark:           boolean
  onClose:          () => void
  onNotSamePerson:  () => void
  onRequestSent:    () => void
  onBackToTree:     () => void
  onAccepted?:      (conflicts: import('@/lib/api').MergeConflict[]) => void
  onRejected?:      () => void
}

function FieldChip({ label, isDark }: { label: string; isDark: boolean }) {
  return (
    <span style={{
      padding: '2px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 600,
      background: isDark ? 'rgba(234,88,12,0.14)' : 'rgba(234,88,12,0.08)',
      color: '#EA580C', border: '1px solid rgba(234,88,12,0.20)',
    }}>
      {label}
    </span>
  )
}

function confidence(score: number) {
  if (score >= 70) return { label: 'Strong match',   dot: '#22C55E' }
  if (score >= 40) return { label: 'Possible match', dot: '#F59E0B' }
  return               { label: 'Weak match',        dot: '#94A3B8' }
}

function deriveContext(personId: string, nodes: Node[], edges: Edge[]) {
  const nodeMap = new Map(nodes.map(n => [n.id, (n.data as unknown as PersonData).fullName ?? '']))
  const parents:  string[] = []
  const children: string[] = []
  const spouses:  string[] = []

  for (const e of edges) {
    const rel = (e.data as { relType?: string })?.relType
    if (rel === 'PARENT_OF') {
      if (e.target === personId && nodeMap.has(e.source))
        parents.push(nodeMap.get(e.source) ?? '')
      if (e.source === personId && nodeMap.has(e.target))
        children.push(nodeMap.get(e.target) ?? '')
    }
    if (rel === 'SPOUSE_OF') {
      const otherId = e.source === personId ? e.target : e.target === personId ? e.source : null
      if (otherId && nodeMap.has(otherId)) spouses.push(nodeMap.get(otherId) ?? '')
    }
  }

  return {
    parents:  [...new Set(parents.filter(Boolean))],
    children: [...new Set(children.filter(Boolean))],
    spouses:  [...new Set(spouses.filter(Boolean))],
  }
}

export default function MergeComparisonPanel({
  pendingMatch, matchNode, nodes, edges, isDark,
  onClose, onNotSamePerson, onRequestSent, onBackToTree,
  onAccepted, onRejected,
}: MergeComparisonPanelProps) {
  const t = getTheme(isDark)
  const theirData = matchNode.data as unknown as PersonData
  const conf = confidence(pendingMatch.matchScore)

  const [done, setDone]                 = useState(false)
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState('')
  // Two-step accept: clicking "Accept" opens the preview modal instead of
  // committing directly. The preview is the user's first "yes" (they review
  // the visual outcome); if warnings exist it requires a second yes inline.
  const [previewOpen, setPreviewOpen]   = useState(false)

  const context = useMemo(
    () => deriveContext(matchNode.id, nodes, edges),
    [matchNode.id, nodes, edges],
  )

  const isReview = pendingMatch.mode === 'review' && !!pendingMatch.mergeRecordId

  async function handleMerge() {
    setLoading(true); setError('')
    try {
      await api.merges.create({
        new_person_id:       pendingMatch.myPersonId,
        canonical_person_id: matchNode.id,
      })
      setDone(true)
      setTimeout(onRequestSent, 1600)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send request')
    } finally {
      setLoading(false)
    }
  }

  function handleAccept() {
    if (!pendingMatch.mergeRecordId || !onAccepted) return
    setError('')
    setPreviewOpen(true)
  }

  async function handleReject() {
    if (!pendingMatch.mergeRecordId || !onRejected) return
    setLoading(true); setError('')
    try {
      await api.merges.reject(pendingMatch.mergeRecordId)
      onRejected()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to reject')
      setLoading(false)
    }
  }

  const labelCol  = isDark ? '#7A6A52' : '#9A3412'
  const dividerBg = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'

  return (
    <SidePanel isDark={isDark} width={340}>
      {/* Header */}
      <div style={{
        padding: '16px 16px 14px', flexShrink: 0,
        borderBottom: `1px solid ${t.border}`,
        position: 'sticky', top: 0, background: t.panelBg, zIndex: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(234,88,12,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IconGitMerge size={14} color="#EA580C" />
          </div>
          <span style={{ fontSize: '13px', fontWeight: 700, color: t.text }}>
            {isReview ? 'Merge request' : 'Possible match'}
          </span>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: labelCol, display: 'flex', padding: '2px' }}>
          <IconX size={16} />
        </button>
      </div>

      {done ? (
        /* ── Done state ── */
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '32px' }}>
          <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'rgba(34,197,94,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IconCheck size={24} color="#22C55E" />
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: t.text, marginBottom: '6px' }}>Merge request sent!</div>
            <p style={{ margin: 0, fontSize: '12px', color: t.textMuted, lineHeight: 1.6 }}>
              The {pendingMatch.canonicalFamilyName} family will be notified. All family members will be updated once they accept.
            </p>
          </div>
        </div>
      ) : (
        /* ── Main comparison view ── */
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>

          {/* Side-by-side nodes */}
          <div style={{ padding: '16px 14px', display: 'flex', gap: '10px', borderBottom: `1px solid ${dividerBg}` }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center', textAlign: 'center' }}>
              <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: labelCol, marginBottom: '4px' }}>Your node</div>
              <Avatar
                name={pendingMatch.myPersonName} photoUrl={pendingMatch.myPhotoUrl} size={48}
                shape="rounded" ring="none"
                style={{ border: '2px solid rgba(234,88,12,0.2)', borderRadius: 12 }}
              />
              <div style={{ fontSize: '13px', fontWeight: 700, color: t.text }}>{pendingMatch.myPersonName}</div>
              {pendingMatch.myBirthYear    && <div style={{ fontSize: '11px', color: t.textMuted }}>b. {pendingMatch.myBirthYear}</div>}
              {pendingMatch.myNativeVillage && <div style={{ fontSize: '11px', color: t.textMuted }}>{pendingMatch.myNativeVillage}</div>}
              {pendingMatch.myGotra        && <div style={{ fontSize: '11px', color: t.textMuted }}>{pendingMatch.myGotra} gotra</div>}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', paddingTop: '28px' }}>
              <div style={{ width: '1px', height: '20px', background: dividerBg }} />
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(234,88,12,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <IconGitMerge size={12} color="#EA580C" />
              </div>
              <div style={{ width: '1px', height: '20px', background: dividerBg }} />
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center', textAlign: 'center' }}>
              <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: labelCol, marginBottom: '4px' }}>Their node</div>
              <Avatar
                name={theirData.fullName} photoUrl={theirData.photoUrl} size={48}
                shape="rounded" ring="none"
                style={{ border: '2px solid rgba(234,88,12,0.2)', borderRadius: 12 }}
              />
              <div style={{ fontSize: '13px', fontWeight: 700, color: t.text }}>{theirData.fullName}</div>
              {theirData.birthYear    && <div style={{ fontSize: '11px', color: t.textMuted }}>b. {theirData.birthYear}</div>}
              {theirData.nativeVillage && <div style={{ fontSize: '11px', color: t.textMuted }}>{theirData.nativeVillage}</div>}
              {theirData.gotra        && <div style={{ fontSize: '11px', color: t.textMuted }}>{theirData.gotra} gotra</div>}
            </div>
          </div>

          {/* Matched fields + confidence */}
          {pendingMatch.matchedFields.length > 0 && (
            <div style={{ padding: '14px 16px', borderBottom: `1px solid ${dividerBg}` }}>
              <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: labelCol, marginBottom: '8px' }}>Matched on</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '10px' }}>
                {pendingMatch.matchedFields.map(f => <FieldChip key={f} label={f} isDark={isDark} />)}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: conf.dot, display: 'inline-block' }} />
                <span style={{ fontSize: '11.5px', color: t.textMuted, fontWeight: 500 }}>{conf.label}</span>
              </div>
            </div>
          )}

          {/* Their tree context */}
          {(context.parents.length > 0 || context.children.length > 0 || context.spouses.length > 0) && (
            <div style={{ padding: '14px 16px', borderBottom: `1px solid ${dividerBg}` }}>
              <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: labelCol, marginBottom: '8px' }}>In their tree, this person is</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {context.children.length > 0 && (
                  <div style={{ fontSize: '12px', color: t.textMuted }}>
                    <span style={{ color: t.text, fontWeight: 500 }}>Parent of:</span> {context.children.join(' · ')}
                  </div>
                )}
                {context.parents.length > 0 && (
                  <div style={{ fontSize: '12px', color: t.textMuted }}>
                    <span style={{ color: t.text, fontWeight: 500 }}>Child of:</span> {context.parents.join(' · ')}
                  </div>
                )}
                {context.spouses.length > 0 && (
                  <div style={{ fontSize: '12px', color: t.textMuted }}>
                    <span style={{ color: t.text, fontWeight: 500 }}>Spouse of:</span> {context.spouses.join(' · ')}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Consequences */}
          <div style={{ padding: '14px 16px', borderBottom: `1px solid ${dividerBg}` }}>
            <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: labelCol, marginBottom: '8px' }}>
              {isReview ? 'If you accept' : 'What happens next'}
            </div>
            {(isReview
              ? ['Your two family trees will be connected', 'Their family becomes visible in your tree', 'All family members will be notified']
              : ['A merge request is sent to their family', 'Their family becomes visible once accepted', 'All family members will be notified']
            ).map(line => (
              <div key={line} style={{ display: 'flex', alignItems: 'flex-start', gap: '7px', marginBottom: '5px' }}>
                <span style={{ color: '#22C55E', fontSize: '12px', lineHeight: 1.5, flexShrink: 0 }}>✓</span>
                <span style={{ fontSize: '12px', color: t.textMuted, lineHeight: 1.5 }}>{line}</span>
              </div>
            ))}
          </div>

          {/* Actions */}
          {error && <p style={{ margin: '12px 16px 0', fontSize: '12px', color: '#EF4444' }}>{error}</p>}
          <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 'auto' }}>
            {isReview ? (
              <>
                <button
                  onClick={handleAccept}
                  disabled={loading}
                  style={{
                    height: '42px', borderRadius: '11px', border: 'none',
                    background: loading ? 'rgba(34,197,94,0.4)' : 'linear-gradient(135deg,#22C55E,#16A34A)',
                    color: '#fff', fontSize: '13px', fontWeight: 600, fontFamily: 'inherit',
                    cursor: loading ? 'default' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    boxShadow: '0 2px 8px rgba(34,197,94,0.3)',
                  }}
                >
                  {loading
                    ? <Spinner size={14} />
                    : <><IconCheck size={14} /> Accept &amp; Connect</>
                  }
                </button>
                <button
                  onClick={handleReject}
                  disabled={loading}
                  style={{ height: '40px', borderRadius: '11px', border: '1.5px solid rgba(239,68,68,0.35)', background: 'none', color: '#EF4444', fontSize: '13px', fontWeight: 600, fontFamily: 'inherit', cursor: loading ? 'default' : 'pointer' }}
                >
                  Reject
                </button>
                <button
                  onClick={onBackToTree}
                  style={{ height: '38px', borderRadius: '11px', border: `1px solid ${t.borderNeutral}`, background: 'none', color: t.textMuted, fontSize: '12px', fontFamily: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}
                >
                  <IconArrowLeft size={13} /> Back to my tree
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleMerge}
                  disabled={loading}
                  style={{
                    height: '42px', borderRadius: '11px', border: 'none',
                    background: loading ? 'rgba(234,88,12,0.5)' : '#EA580C',
                    color: '#fff', fontSize: '13px', fontWeight: 600, fontFamily: 'inherit',
                    cursor: loading ? 'default' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    boxShadow: '0 2px 8px rgba(234,88,12,0.25)',
                  }}
                >
                  {loading
                    ? <Spinner size={14} />
                    : <><IconGitMerge size={14} /> Merge</>
                  }
                </button>
                <button
                  onClick={onNotSamePerson}
                  style={{ height: '40px', borderRadius: '11px', border: `1px solid ${t.borderNeutral}`, background: 'none', color: t.textMuted, fontSize: '12px', fontFamily: 'inherit', cursor: 'pointer' }}
                >
                  Not the same person
                </button>
                <button
                  onClick={onBackToTree}
                  style={{ height: '38px', borderRadius: '11px', border: `1px solid ${t.borderNeutral}`, background: 'none', color: t.textMuted, fontSize: '12px', fontFamily: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}
                >
                  <IconArrowLeft size={13} /> Back to my tree
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <AnimatePresence>
        {previewOpen && pendingMatch.mergeRecordId && onAccepted && (
          <MergeAcceptPreviewModal
            mergeRecordId={pendingMatch.mergeRecordId}
            myPersonId={pendingMatch.myPersonId}
            myPersonName={pendingMatch.myPersonName}
            myPhotoUrl={pendingMatch.myPhotoUrl ?? null}
            myGender={pendingMatch.myGender ?? null}
            myBirthYear={pendingMatch.myBirthYear ?? null}
            matchNode={matchNode}
            nodes={nodes}
            edges={edges}
            isDark={isDark}
            onCancel={() => setPreviewOpen(false)}
            onAccepted={c => { setPreviewOpen(false); onAccepted(c) }}
          />
        )}
      </AnimatePresence>
    </SidePanel>
  )
}
