'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  IconX, IconCheck, IconGitMerge,
  IconAlertTriangle, IconArrowDown, IconArrowRight,
} from '@tabler/icons-react'
import type { Node, Edge } from '@xyflow/react'
import { api } from '@/lib/api'
import { getTheme } from '@/lib/theme'
import { Z } from '@/lib/zIndex'
import { Spinner } from '@/components/ui'
import { MiniNodeCard, MINI_CARD_W, MINI_CARD_H } from '../NodeCard'
import {
  extractDirectRelations,
  type NeighborInfo,
  type PersonSnapshot,
} from '@/lib/graph/relations'

// ── Types ────────────────────────────────────────────────────────────────────

interface MergeAcceptPreviewModalProps {
  mergeRecordId:  string
  /** Acceptor's own (canonical) person — survives the merge. */
  myPersonId:     string
  myPersonName:   string
  myPhotoUrl:     string | null
  myGender:       string | null
  myBirthYear:    number | null

  /** Two ways to give us the "other side" (B):
   *   1. REVIEW MODE — pass the already-visible graph (matchNode + nodes + edges)
   *      from the merge-review canvas; we just walk it.
   *   2. REMOTE MODE — pass theirPersonId (+ optional fallback identity) and
   *      we fetch their 1-hop neighbourhood ourselves. This is how the
   *      Notifications panel uses the modal — no canvas in sight. */
  matchNode?:      Node
  nodes?:          Node[]
  edges?:          Edge[]
  theirPersonId?:  string
  theirPersonName?:string
  theirPhotoUrl?:  string | null
  theirGender?:    string | null
  theirBirthYear?: number | null

  isDark:         boolean
  onCancel:       () => void
  /** Called after the backend accept succeeds. Pass conflicts through so
   *  the existing MergeConflictModal still surfaces server-side conflicts. */
  onAccepted:     (conflicts: import('@/lib/api').MergeConflict[]) => void
}

interface Warning {
  kind:    'double_parent' | 'double_spouse' | 'gender_mismatch' | 'birth_year_mismatch'
  message: string
}

// ── Merge simulation (union of relations) ────────────────────────────────────

/** Produces what the canonical person's neighbourhood will look like after
 *  the merge — union of A's and B's direct relations, de-duped by id. Marks
 *  newcomers (from B) so the UI can highlight what's changing. */
function simulateMerge(
  canonical: PersonSnapshot,
  absorbed:  PersonSnapshot,
): { merged: PersonSnapshot; isNew: Set<string> } {
  const isNew = new Set<string>()

  const unionBy = (a: NeighborInfo[], b: NeighborInfo[]): NeighborInfo[] => {
    const have = new Set(a.map(n => n.id))
    const result = [...a]
    for (const n of b) {
      if (!have.has(n.id)) {
        result.push(n)
        isNew.add(n.id)
        have.add(n.id)
      }
    }
    return result
  }

  return {
    merged: {
      // Canonical identity wins — acceptor's person survives the merge.
      id:        canonical.id,
      name:      canonical.name,
      photoUrl:  canonical.photoUrl,
      gender:    canonical.gender,
      birthYear: canonical.birthYear,
      parents:   unionBy(canonical.parents,  absorbed.parents),
      spouses:   unionBy(canonical.spouses,  absorbed.spouses),
      children:  unionBy(canonical.children, absorbed.children),
    },
    isNew,
  }
}

// ── Warning detection (purely client-side) ───────────────────────────────────

/** Flags situations where the two sides disagree on direct relations badly
 *  enough that the user should re-confirm. We can only see what's directly
 *  attached, so this is a heuristic — the server will still surface its
 *  full conflict list after commit via MergeConflictModal. */
function detectWarnings(a: PersonSnapshot, b: PersonSnapshot): Warning[] {
  const out: Warning[] = []

  const overlap = (xs: NeighborInfo[], ys: NeighborInfo[]): boolean => {
    const yids = new Set(ys.map(n => n.id))
    return xs.some(x => yids.has(x.id))
  }

  if (a.parents.length > 0 && b.parents.length > 0 && !overlap(a.parents, b.parents)) {
    out.push({
      kind:    'double_parent',
      message: 'Both trees record different parents for this person. Accepting will leave them with multiple sets of parents — you may need to clean that up after.',
    })
  }

  if (a.spouses.length > 0 && b.spouses.length > 0 && !overlap(a.spouses, b.spouses)) {
    out.push({
      kind:    'double_spouse',
      message: 'Each tree shows a different spouse. After merge both spouse links remain — review whether one should be marked separated.',
    })
  }

  if (a.gender && b.gender && a.gender !== b.gender) {
    out.push({
      kind:    'gender_mismatch',
      message: `Gender differs (${a.gender} vs ${b.gender}). Make sure these are really the same person.`,
    })
  }

  if (a.birthYear && b.birthYear && Math.abs(a.birthYear - b.birthYear) > 2) {
    out.push({
      kind:    'birth_year_mismatch',
      message: `Birth years differ (${a.birthYear} vs ${b.birthYear}). Consider double-checking.`,
    })
  }

  return out
}

// ── Mini visual components ───────────────────────────────────────────────────

/** Mini node card (parents/spouses/children), highlighted when newly merged. */
function NeighborChip({
  n, isNew, isDark,
}: { n: NeighborInfo; isNew?: boolean; isDark: boolean }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
      maxWidth: MINI_CARD_W,
    }}>
      <div style={{
        borderRadius: 3,
        boxShadow: isNew ? '0 0 0 2px #22C55E, 0 2px 8px rgba(34,197,94,0.30)' : 'none',
      }}>
        <MiniNodeCard fullName={n.name} photoUrl={n.photoUrl} nodeState="claimed" isDark={isDark} />
      </div>
      {isNew && (
        <span style={{
          fontSize: 8.5, fontWeight: 700, letterSpacing: '0.06em',
          textTransform: 'uppercase', color: '#15803D',
        }}>
          new
        </span>
      )}
    </div>
  )
}

/** A vertical "mini family tree": parents above → centre → children below,
 *  with spouses tucked beside the centre. Used three times (A, B, merged). */
function MiniTree({
  snap, isNew, isDark, title, accent,
}: {
  snap:   PersonSnapshot
  isNew?: Set<string>       // ids highlighted as newly-merged
  isDark: boolean
  title:  string
  accent: string
}) {
  const t = getTheme(isDark)
  const newSet = isNew ?? new Set<string>()

  // Cap row sizes so the panel doesn't blow up; show a "+N" pill for overflow.
  const visibleParents  = snap.parents.slice(0, 2)
  const moreParents     = snap.parents.length - visibleParents.length
  const visibleSpouses  = snap.spouses.slice(0, 2)
  const moreSpouses     = snap.spouses.length - visibleSpouses.length
  const visibleChildren = snap.children.slice(0, 4)
  const moreChildren    = snap.children.length - visibleChildren.length

  const Plus = ({ n }: { n: number }) => (
    <div style={{
      width: MINI_CARD_W, height: MINI_CARD_H, borderRadius: 3,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 12, fontWeight: 700, color: t.textMuted,
      background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
      border: `1px dashed ${t.borderNeutral}`,
    }}>
      +{n}
    </div>
  )

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
      padding: '14px 12px',
      background: isDark ? 'rgba(255,255,255,0.025)' : 'rgb(var(--c-page-rgb) / 0.55)',
      border: `1.5px solid ${accent}30`,
      borderRadius: 14, minHeight: 280, flex: 1, minWidth: 0,
    }}>
      {/* Section title */}
      <div style={{
        fontSize: 9, fontWeight: 700, letterSpacing: '0.10em',
        textTransform: 'uppercase', color: accent,
        marginBottom: 4,
      }}>
        {title}
      </div>

      {/* Parents row */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, minHeight: 56 }}>
        {visibleParents.length === 0 ? (
          <span style={{ fontSize: 10, color: t.textMuted, fontStyle: 'italic' }}>no parents recorded</span>
        ) : (
          <>
            {visibleParents.map(p => (
              <NeighborChip key={p.id} n={p} isNew={newSet.has(p.id)} isDark={isDark} />
            ))}
            {moreParents > 0 && <Plus n={moreParents} />}
          </>
        )}
      </div>

      {/* Connector down to centre */}
      <IconArrowDown size={12} color={t.textMuted} style={{ opacity: 0.5 }} />

      {/* Centre person + spouses row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div style={{ borderRadius: 3, boxShadow: `0 0 0 2px ${accent}` }}>
            <MiniNodeCard fullName={snap.name} photoUrl={snap.photoUrl} nodeState="claimed" isDark={isDark} />
          </div>
          <span style={{
            fontSize: 12, fontWeight: 700, color: t.text,
            maxWidth: 120, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {snap.name}
          </span>
          {snap.birthYear && (
            <span style={{ fontSize: 10, color: t.textMuted }}>b. {snap.birthYear}</span>
          )}
        </div>
        {(visibleSpouses.length > 0 || moreSpouses > 0) && (
          <>
            <span style={{
              fontSize: 10, color: t.textMuted, letterSpacing: '0.06em',
              textTransform: 'uppercase', fontWeight: 600,
            }}>
              ⚭
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              {visibleSpouses.map(s => (
                <NeighborChip key={s.id} n={s} isNew={newSet.has(s.id)} isDark={isDark} />
              ))}
              {moreSpouses > 0 && <Plus n={moreSpouses} />}
            </div>
          </>
        )}
      </div>

      {/* Connector down to children */}
      <IconArrowDown size={12} color={t.textMuted} style={{ opacity: 0.5 }} />

      {/* Children row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap', justifyContent: 'center', minHeight: 56 }}>
        {visibleChildren.length === 0 ? (
          <span style={{ fontSize: 10, color: t.textMuted, fontStyle: 'italic' }}>no children recorded</span>
        ) : (
          <>
            {visibleChildren.map(ch => (
              <NeighborChip key={ch.id} n={ch} isNew={newSet.has(ch.id)} isDark={isDark} />
            ))}
            {moreChildren > 0 && <Plus n={moreChildren} />}
          </>
        )}
      </div>
    </div>
  )
}

// ── The modal itself ─────────────────────────────────────────────────────────

export default function MergeAcceptPreviewModal({
  mergeRecordId, myPersonId, myPersonName, myPhotoUrl, myGender, myBirthYear,
  matchNode, nodes, edges,
  theirPersonId, theirPersonName, theirPhotoUrl, theirGender, theirBirthYear,
  isDark, onCancel, onAccepted,
}: MergeAcceptPreviewModalProps) {
  const t = getTheme(isDark)

  const [aSnap, setASnap]     = useState<PersonSnapshot | null>(null)
  const [aLoading, setALoad]  = useState(true)
  const [aError, setAError]   = useState('')

  const [bSnap, setBSnap]     = useState<PersonSnapshot | null>(null)
  const [bLoading, setBLoad]  = useState(true)
  const [bError, setBError]   = useState('')

  const [committing, setCommitting] = useState(false)
  const [askConfirm, setAskConfirm] = useState(false)
  const [commitError, setCommitError] = useState('')

  // ── Load A (our side) ─────────────────────────────────────────────────────
  // Always fetched — A lives in a different family than the one we're viewing.
  useEffect(() => {
    let cancelled = false
    setALoad(true); setAError('')
    api.graph.fetch(myPersonId, 1, 1)
      .then(({ nodes: ns, edges: es }) => {
        if (cancelled) return
        const snap = extractDirectRelations(myPersonId, ns, es)
        // Overlay known identity bits if the fetched snapshot is missing them
        // (eg. perspective node somehow not in the response).
        setASnap({
          ...snap,
          name:      snap.name      || myPersonName,
          photoUrl:  snap.photoUrl  ?? myPhotoUrl,
          gender:    snap.gender    ?? myGender,
          birthYear: snap.birthYear ?? myBirthYear,
        })
      })
      .catch(() => {
        if (cancelled) return
        setAError('Could not load your side of the tree — proceed only if you trust the warnings shown.')
        setASnap({
          id: myPersonId, name: myPersonName,
          photoUrl: myPhotoUrl, gender: myGender, birthYear: myBirthYear,
          parents: [], spouses: [], children: [],
        })
      })
      .finally(() => { if (!cancelled) setALoad(false) })
    return () => { cancelled = true }
  }, [myPersonId, myPersonName, myPhotoUrl, myGender, myBirthYear])

  // ── Load B (their side) ───────────────────────────────────────────────────
  // Two modes:
  //   - review-mode: caller supplied the visible graph → walk it locally
  //   - remote-mode: caller only knows their person id → fetch their 1-hop
  const bId = matchNode?.id ?? theirPersonId
  useEffect(() => {
    let cancelled = false
    if (!bId) return
    setBLoad(true); setBError('')

    // Review-mode shortcut — extract directly from the supplied graph.
    if (matchNode && nodes && edges) {
      setBSnap(extractDirectRelations(matchNode.id, nodes, edges))
      setBLoad(false)
      return
    }

    // Remote-mode — fetch B's neighbourhood.
    api.graph.fetch(bId, 1, 1)
      .then(({ nodes: ns, edges: es }) => {
        if (cancelled) return
        const snap = extractDirectRelations(bId, ns, es)
        setBSnap({
          ...snap,
          name:      snap.name      || theirPersonName || 'Their node',
          photoUrl:  snap.photoUrl  ?? theirPhotoUrl  ?? null,
          gender:    snap.gender    ?? theirGender    ?? null,
          birthYear: snap.birthYear ?? theirBirthYear ?? null,
        })
      })
      .catch(() => {
        if (cancelled) return
        setBError('Could not load their side of the tree — accepting will still merge using server-side data.')
        setBSnap({
          id: bId, name: theirPersonName ?? 'Their node',
          photoUrl: theirPhotoUrl ?? null,
          gender:   theirGender   ?? null,
          birthYear: theirBirthYear ?? null,
          parents: [], spouses: [], children: [],
        })
      })
      .finally(() => { if (!cancelled) setBLoad(false) })
    return () => { cancelled = true }
  }, [bId, matchNode, nodes, edges, theirPersonName, theirPhotoUrl, theirGender, theirBirthYear])

  const loading = aLoading || bLoading

  const { merged, isNew, warnings } = useMemo(() => {
    if (!aSnap || !bSnap) return { merged: null, isNew: new Set<string>(), warnings: [] as Warning[] }
    const sim = simulateMerge(aSnap, bSnap)
    return { merged: sim.merged, isNew: sim.isNew, warnings: detectWarnings(aSnap, bSnap) }
  }, [aSnap, bSnap])

  async function commit() {
    setCommitting(true); setCommitError('')
    try {
      const result = await api.merges.accept(mergeRecordId)
      onAccepted(result.conflicts ?? [])
    } catch (e) {
      setCommitting(false)
      setCommitError(e instanceof Error ? e.message : 'Failed to accept merge')
    }
  }

  function handleConfirmClick() {
    if (warnings.length > 0) {
      setAskConfirm(true)   // require a second yes
    } else {
      commit()
    }
  }

  return (
    <motion.div
      key="merge-preview-backdrop"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: Z.modal,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16, backdropFilter: 'blur(2px)',
      }}
      onClick={e => { if (e.target === e.currentTarget && !committing) onCancel() }}
    >
      <motion.div
        key="merge-preview-modal"
        initial={{ opacity: 0, y: 16, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{    opacity: 0, y: 16, scale: 0.96 }}
        transition={{ type: 'spring', stiffness: 360, damping: 30 }}
        style={{
          background: t.panelBg, border: `1.5px solid ${t.borderNeutral}`,
          borderRadius: 18, boxShadow: t.shadow,
          width: '100%', maxWidth: 960, maxHeight: 'calc(100vh - 32px)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: `1px solid ${t.borderNeutral}`, flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 9,
              background: 'rgb(var(--c-primary-rgb) / 0.10)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <IconGitMerge size={15} color="var(--c-primary)" />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: t.text }}>Merge preview</div>
              <div style={{ fontSize: 11.5, color: t.textMuted, lineHeight: 1.4 }}>
                This is what your tree will look like after merging — are you sure you want to continue?
              </div>
            </div>
          </div>
          <button
            onClick={onCancel}
            disabled={committing}
            style={{
              background: 'none', border: 'none', cursor: committing ? 'default' : 'pointer',
              color: t.textMuted, padding: 4, display: 'flex',
            }}
          >
            <IconX size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 16 }}>

          {/* Three mini trees with a staggered "merge flow" animation:
              A slides in from the left, B from the right, then arrows fan
              inward and the merged tree pops in centred. */}
          <div style={{
            display: 'grid', gap: 12,
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            alignItems: 'stretch',
            position: 'relative',
          }}>
            {loading || !aSnap || !bSnap ? (
              <div style={{
                gridColumn: '1 / -1', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                padding: 40, color: t.textMuted, fontSize: 12,
                gap: 10,
              }}>
                <Spinner size={16} />
                Loading both sides of the tree…
              </div>
            ) : (
              <>
                <motion.div
                  initial={{ opacity: 0, x: -28, scale: 0.96 }}
                  animate={{ opacity: 1, x: 0,   scale: 1 }}
                  transition={{ delay: 0.05, type: 'spring', stiffness: 240, damping: 26 }}
                  style={{ display: 'flex' }}
                >
                  <MiniTree snap={aSnap} isDark={isDark} title="Your node now" accent="var(--c-primary)" />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: 28, scale: 0.96 }}
                  animate={{ opacity: 1, x: 0,  scale: 1 }}
                  transition={{ delay: 0.18, type: 'spring', stiffness: 240, damping: 26 }}
                  style={{ display: 'flex', position: 'relative' }}
                >
                  {/* Tiny "flow" arrow streaming from A & B toward "After merge" */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 1, 0] }}
                    transition={{ delay: 0.55, duration: 0.9, repeat: 1, repeatDelay: 0.1 }}
                    style={{
                      position: 'absolute', top: '50%', right: -8,
                      transform: 'translateY(-50%)',
                      display: 'flex', alignItems: 'center',
                      color: '#22C55E', pointerEvents: 'none', zIndex: 2,
                    }}
                    aria-hidden
                  >
                    <IconArrowRight size={14} />
                  </motion.div>
                  <MiniTree snap={bSnap} isDark={isDark} title="Their node now" accent="#0EA5E9" />
                </motion.div>

                {merged && (
                  <motion.div
                    initial={{ opacity: 0, y: 18, scale: 0.92 }}
                    animate={{ opacity: 1, y: 0,  scale: 1 }}
                    transition={{ delay: 0.9, type: 'spring', stiffness: 220, damping: 24 }}
                    style={{ display: 'flex', position: 'relative' }}
                  >
                    {/* Soft glow underneath the merged tree once it lands */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 1.0, duration: 0.5 }}
                      style={{
                        position: 'absolute', inset: -4, borderRadius: 18,
                        boxShadow: '0 0 0 1px rgba(34,197,94,0.25), 0 10px 30px rgba(34,197,94,0.18)',
                        pointerEvents: 'none',
                      }}
                      aria-hidden
                    />
                    <MiniTree snap={merged} isNew={isNew} isDark={isDark} title="After merge" accent="#22C55E" />
                  </motion.div>
                )}
              </>
            )}
          </div>

          {/* Soft-load error banner(s) */}
          {(aError || bError) && (
            <div style={{
              marginTop: 12, padding: '10px 12px', borderRadius: 10,
              background: isDark ? 'rgba(245,158,11,0.10)' : 'rgba(245,158,11,0.08)',
              border: `1px solid rgba(245,158,11,0.30)`,
              fontSize: 11.5, color: '#B45309', display: 'flex', alignItems: 'flex-start', gap: 8,
            }}>
              <IconAlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{aError || bError}</span>
            </div>
          )}

          {/* Warnings preview (visible before the second confirmation) */}
          {!loading && warnings.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8,
                fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
                textTransform: 'uppercase', color: '#B45309',
              }}>
                <IconAlertTriangle size={12} /> Heads up — {warnings.length} {warnings.length === 1 ? 'warning' : 'warnings'}
              </div>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {warnings.map(w => (
                  <li key={w.kind} style={{
                    fontSize: 11.5, color: t.textMuted, lineHeight: 1.5,
                    padding: '8px 12px', borderRadius: 9,
                    background: isDark ? 'rgba(245,158,11,0.07)' : 'rgba(245,158,11,0.05)',
                    border: `1px solid ${isDark ? 'rgba(245,158,11,0.20)' : 'rgba(245,158,11,0.18)'}`,
                  }}>
                    {w.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {commitError && (
            <p style={{ marginTop: 12, fontSize: 12, color: '#EF4444' }}>{commitError}</p>
          )}
        </div>

        {/* Footer actions */}
        <div style={{
          padding: '12px 18px', borderTop: `1px solid ${t.borderNeutral}`,
          display: 'flex', gap: 10, justifyContent: 'flex-end', flexShrink: 0,
        }}>
          <button
            onClick={onCancel}
            disabled={committing}
            style={{
              padding: '0 18px', height: 40, borderRadius: 11,
              border: `1px solid ${t.borderNeutral}`,
              background: 'none', color: t.textMuted,
              fontSize: 13, fontFamily: 'inherit',
              cursor: committing ? 'default' : 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmClick}
            disabled={committing || loading}
            style={{
              padding: '0 22px', height: 40, borderRadius: 11, border: 'none',
              background: warnings.length > 0
                ? 'linear-gradient(135deg, #F59E0B, var(--c-secondary))'
                : 'linear-gradient(135deg, #22C55E, #16A34A)',
              color: '#fff', fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
              cursor: committing || loading ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 7,
              opacity: committing || loading ? 0.7 : 1,
              boxShadow: '0 4px 14px rgba(34,197,94,0.30)',
            }}
          >
            {committing
              ? <><Spinner size={14} /> Merging…</>
              : warnings.length > 0
                ? <><IconAlertTriangle size={14} /> Yes, merge anyway</>
                : <><IconCheck size={14} /> Yes, merge</>
            }
          </button>
        </div>

        {/* Second-confirmation overlay — triggered only when warnings exist. */}
        <AnimatePresence>
          {askConfirm && !committing && (
            <motion.div
              key="are-you-sure"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{
                position: 'absolute', inset: 0, zIndex: Z.confirmModal,
                background: 'rgba(0,0,0,0.55)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 16,
              }}
              onClick={e => { if (e.target === e.currentTarget) setAskConfirm(false) }}
            >
              <motion.div
                initial={{ scale: 0.94, y: 10 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.94, y: 10 }}
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                style={{
                  background: t.panelBg, border: `1.5px solid ${t.borderNeutral}`,
                  borderRadius: 16, boxShadow: t.shadow,
                  maxWidth: 420, width: '100%', padding: 20,
                }}
              >
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10,
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: 'rgba(245,158,11,0.14)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <IconAlertTriangle size={17} color="var(--c-secondary)" />
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: t.text }}>
                    Are you sure you want to merge?
                  </div>
                </div>
                <p style={{ margin: '0 0 14px', fontSize: 12.5, color: t.textMuted, lineHeight: 1.55 }}>
                  This action joins both trees and cannot be undone from here. The
                  warnings above will remain on the merged node until you clean
                  them up.
                </p>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => setAskConfirm(false)}
                    style={{
                      padding: '0 16px', height: 38, borderRadius: 10,
                      border: `1px solid ${t.borderNeutral}`,
                      background: 'none', color: t.textMuted,
                      fontSize: 12.5, fontFamily: 'inherit', cursor: 'pointer',
                    }}
                  >
                    Go back
                  </button>
                  <button
                    onClick={() => { setAskConfirm(false); commit() }}
                    style={{
                      padding: '0 18px', height: 38, borderRadius: 10, border: 'none',
                      background: 'linear-gradient(135deg, #EF4444, #DC2626)',
                      color: '#fff', fontSize: 12.5, fontWeight: 700, fontFamily: 'inherit',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                    }}
                  >
                    <IconCheck size={13} /> Yes, merge
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  )
}
