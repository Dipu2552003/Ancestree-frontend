'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { IconX, IconCheck } from '@tabler/icons-react'
import type { Node } from '@xyflow/react'
import { getTheme } from '@/lib/theme'
import type { MergeConflict, ConflictType } from '@/lib/api'
import type { PersonData } from '@/types'
import { getInitials } from '@/lib/format/initials'

interface MergeConflictModalProps {
  conflicts: MergeConflict[]
  nodes:     Node[]
  isDark:    boolean
  onClose:   () => void
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function resolvePersonName(id: string, nodes: Node[]): string {
  const node = nodes.find(n => n.id === id)
  const data = node?.data as (PersonData & { fullName?: string }) | undefined
  return data?.fullName ?? '?'
}

// ── Mini node card (looks like a small version of the graph node) ─────────────

interface MiniNodeProps {
  name:    string
  role:    string
  color:   string
  isDark:  boolean
}

function MiniNode({ name, role, color, isDark }: MiniNodeProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
      {/* Circle avatar */}
      <div style={{
        width:          '52px',
        height:         '52px',
        borderRadius:   '50%',
        background:     color,
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        fontSize:       '16px',
        fontWeight:     800,
        color:          '#fff',
        boxShadow:      `0 4px 14px ${color}55`,
        border:         `3px solid ${isDark ? 'rgba(255,255,255,0.12)' : '#fff'}`,
        flexShrink:     0,
      }}>
        {getInitials(name)}
      </div>

      {/* Role chip */}
      <span style={{
        fontSize:        '9px',
        fontWeight:      700,
        color:           color,
        background:      `${color}20`,
        padding:         '2px 7px',
        borderRadius:    '999px',
        textTransform:   'uppercase',
        letterSpacing:   '0.08em',
        whiteSpace:      'nowrap',
      }}>
        {role}
      </span>

      {/* Name */}
      <span style={{
        fontSize:     '11px',
        fontWeight:   600,
        color:        isDark ? '#E5E7EB' : '#1F2937',
        maxWidth:     '72px',
        textAlign:    'center',
        lineHeight:   1.25,
        wordBreak:    'break-word',
      }}>
        {name}
      </span>
    </div>
  )
}

// ── Forbidden badge (red × with label) ───────────────────────────────────────

function ForbiddenBadge({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
      <div style={{
        width:          '38px',
        height:         '38px',
        borderRadius:   '50%',
        background:     'linear-gradient(135deg, #EF4444, #B91C1C)',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        color:          '#fff',
        fontSize:       '24px',
        fontWeight:     900,
        lineHeight:     1,
        boxShadow:      '0 4px 14px rgba(239,68,68,0.5)',
      }}>
        ×
      </div>
      <span style={{
        fontSize:      '9px',
        fontWeight:    700,
        color:         '#EF4444',
        textTransform: 'uppercase',
        letterSpacing: '0.07em',
        textAlign:     'center',
        whiteSpace:    'nowrap',
      }}>
        {label}
      </span>
    </div>
  )
}

// ── Connector lines between parent nodes and child ────────────────────────────

function ParentChildConnector({ isDark, width = 120 }: { isDark: boolean; width?: number }) {
  const c = isDark ? '#374151' : '#D1D5DB'
  const half = width / 2
  return (
    <div style={{ position: 'relative', width: `${width}px`, height: '28px', flexShrink: 0 }}>
      {/* left arm */}
      <div style={{ position: 'absolute', left: 0, top: 0, width: `${half}px`, height: '14px', borderRight: `2px solid ${c}`, borderBottom: `2px solid ${c}`, borderRadius: '0 0 4px 0' }} />
      {/* right arm */}
      <div style={{ position: 'absolute', right: 0, top: 0, width: `${half}px`, height: '14px', borderLeft: `2px solid ${c}`, borderBottom: `2px solid ${c}`, borderRadius: '0 0 0 4px' }} />
      {/* vertical drop */}
      <div style={{ position: 'absolute', left: '50%', top: '14px', width: '2px', height: '14px', background: c, transform: 'translateX(-50%)' }} />
    </div>
  )
}

// ── Per-conflict visual diagrams ──────────────────────────────────────────────

function ConflictDiagram({
  conflict, nodes, isDark,
}: { conflict: MergeConflict; nodes: Node[]; isDark: boolean }) {
  const ids   = conflict.affected_persons
  const names = ids.map(id => resolvePersonName(id, nodes))

  // ── Double parent ──────────────────────────────────────────────────────────
  if (conflict.type === 'double_parent') {
    // affected_persons = [child_id, ...parent_ids]
    const childName   = names[0] ?? '?'
    const parentNames = names.slice(1)

    const msg       = conflict.message.toLowerCase()
    const isFathers = msg.includes('father')
    const isMothers = msg.includes('mother')
    const pColor    = isFathers ? '#2563EB' : isMothers ? '#DB2777' : '#7C3AED'
    const pRole     = isFathers ? 'Father'  : isMothers ? 'Mother'  : 'Parent'
    const badgeLabel = `${parentNames.length} ${pRole}s!`

    const p1 = parentNames[0] ?? '?'
    const p2 = parentNames[1] ?? (parentNames[0] ?? '?')   // fallback if only 1

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0' }}>
        {/* Warning banner */}
        <div style={{
          marginBottom: '14px',
          padding:      '5px 14px',
          borderRadius: '999px',
          background:   'rgba(239,68,68,0.1)',
          border:       '1.5px solid rgba(239,68,68,0.3)',
          fontSize:     '11px',
          fontWeight:   700,
          color:        '#EF4444',
          letterSpacing: '0.03em',
        }}>
          ⚠️ {parentNames.length} {pRole}s added — only 1 allowed
        </div>

        {/* Parent nodes + × */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <MiniNode name={p1} role={pRole} color={pColor} isDark={isDark} />
          <ForbiddenBadge label={badgeLabel} />
          <MiniNode name={p2} role={pRole} color={pColor} isDark={isDark} />
        </div>

        {/* Connecting lines down */}
        <ParentChildConnector isDark={isDark} width={130} />

        {/* Child node */}
        <MiniNode name={childName} role="Child" color="#059669" isDark={isDark} />
      </div>
    )
  }

  // ── Double spouse ──────────────────────────────────────────────────────────
  if (conflict.type === 'double_spouse') {
    // affected_persons = [canonical_id, ...spouse_ids]
    const personName0 = names[0] ?? '?'
    const spouseNames = names.slice(1)
    const s1 = spouseNames[0] ?? '?'
    const s2 = spouseNames[1] ?? (spouseNames[0] ?? '?')

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0' }}>
        <div style={{
          marginBottom: '14px',
          padding:      '5px 14px',
          borderRadius: '999px',
          background:   'rgba(234,179,8,0.1)',
          border:       '1.5px solid rgba(234,179,8,0.3)',
          fontSize:     '11px',
          fontWeight:   700,
          color:        '#B45309',
          letterSpacing: '0.03em',
        }}>
          ⚠️ {spouseNames.length} Spouses added — only 1 allowed
        </div>

        {/* Spouse nodes + × */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <MiniNode name={s1} role="Wife / Husband" color="var(--c-secondary)" isDark={isDark} />
          <ForbiddenBadge label={`${spouseNames.length} Spouses!`} />
          <MiniNode name={s2} role="Wife / Husband" color="var(--c-secondary)" isDark={isDark} />
        </div>

        {/* Arrow down */}
        <div style={{ height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '2px', height: '20px', background: isDark ? '#374151' : '#D1D5DB' }} />
        </div>

        {/* Person */}
        <MiniNode name={personName0} role="Person" color="var(--c-primary)" isDark={isDark} />
      </div>
    )
  }

  // ── Parent-sibling paradox ─────────────────────────────────────────────────
  if (conflict.type === 'parent_sibling_paradox') {
    const [nameA, nameB] = [names[0] ?? '?', names[1] ?? '?']
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0' }}>
        <div style={{
          marginBottom: '14px',
          padding:      '5px 14px',
          borderRadius: '999px',
          background:   'rgba(239,68,68,0.1)',
          border:       '1.5px solid rgba(239,68,68,0.3)',
          fontSize:     '11px',
          fontWeight:   700,
          color:        '#EF4444',
        }}>
          ⚠️ Same pair is both Parent & Sibling — impossible
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <MiniNode name={nameA} role="Person A" color="#7C3AED" isDark={isDark} />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            <span style={{ fontSize: '9px', fontWeight: 700, color: '#7C3AED', background: '#7C3AED20', padding: '2px 7px', borderRadius: '4px', whiteSpace: 'nowrap' }}>PARENT OF ↓</span>
            <ForbiddenBadge label="Paradox!" />
            <span style={{ fontSize: '9px', fontWeight: 700, color: '#7C3AED', background: '#7C3AED20', padding: '2px 7px', borderRadius: '4px', whiteSpace: 'nowrap' }}>SIBLING OF ↔</span>
          </div>
          <MiniNode name={nameB} role="Person B" color="#7C3AED" isDark={isDark} />
        </div>
      </div>
    )
  }

  // ── Cycle ──────────────────────────────────────────────────────────────────
  if (conflict.type === 'cycle') {
    const [nameA, nameB] = [names[0] ?? '?', names[1] ?? '?']
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0' }}>
        <div style={{
          marginBottom: '14px',
          padding:      '5px 14px',
          borderRadius: '999px',
          background:   'rgba(239,68,68,0.1)',
          border:       '1.5px solid rgba(239,68,68,0.3)',
          fontSize:     '11px',
          fontWeight:   700,
          color:        '#EF4444',
        }}>
          ⚠️ Circular ancestry — a person is their own ancestor
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <MiniNode name={nameA} role="Ancestor" color="#6366F1" isDark={isDark} />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            <span style={{ fontSize: '18px', color: '#6366F1' }}>↕</span>
            <ForbiddenBadge label="Loop!" />
          </div>
          <MiniNode name={nameB} role="Descendant" color="#6366F1" isDark={isDark} />
        </div>
      </div>
    )
  }

  // ── Secondary duplicate ────────────────────────────────────────────────────
  if (conflict.type === 'secondary_duplicate') {
    const [nameA, nameB] = [names[0] ?? '?', names[1] ?? '?']
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0' }}>
        <div style={{
          marginBottom: '14px',
          padding:      '5px 14px',
          borderRadius: '999px',
          background:   'rgba(234,179,8,0.1)',
          border:       '1.5px solid rgba(234,179,8,0.3)',
          fontSize:     '11px',
          fontWeight:   700,
          color:        '#B45309',
        }}>
          ⚠️ Same name appears twice in the tree
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <MiniNode name={nameA} role="Existing" color="var(--c-secondary)" isDark={isDark} />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
            <span style={{ fontSize: '22px', fontWeight: 900, color: 'var(--c-secondary)', lineHeight: 1 }}>≈</span>
            <span style={{ fontSize: '9px', fontWeight: 700, color: 'var(--c-secondary)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Same Name</span>
          </div>
          <MiniNode name={nameB} role="Transferred" color="var(--c-secondary)" isDark={isDark} />
        </div>
      </div>
    )
  }

  // ── Claimed orphan ─────────────────────────────────────────────────────────
  if (conflict.type === 'claimed_orphan') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <div style={{ fontSize: '38px', lineHeight: 1 }}>⛓️‍💥</div>
        <span style={{ fontSize: '12px', fontWeight: 600, color: isDark ? '#9CA3AF' : '#6B7280', textAlign: 'center' }}>
          A user account was disconnected from the tree
        </span>
      </div>
    )
  }

  return null
}

// ── Conflict card heading per type ────────────────────────────────────────────

const TITLES: Record<ConflictType, string> = {
  double_parent:          'Double Parent Conflict',
  double_spouse:          'Multiple Spouse Conflict',
  parent_sibling_paradox: 'Parent & Sibling Paradox',
  cycle:                  'Circular Ancestry Loop',
  secondary_duplicate:    'Duplicate Person Detected',
  claimed_orphan:         'User Account Disconnected',
}

const HINTS: Record<ConflictType, string> = {
  double_parent:          'Open the graph, find the child node, and delete the extra parent edge.',
  double_spouse:          'If this is a remarriage it may be correct; otherwise remove the extra spouse relationship.',
  parent_sibling_paradox: 'One of those relationships is wrong — remove it from the graph.',
  cycle:                  'Reverse or delete one of the parent edges to break the loop.',
  secondary_duplicate:    'They may be the same person — send another merge request, or leave them separate.',
  claimed_orphan:         'Contact the affected user so they can re-link their account to the correct node.',
}

// ── Main modal ─────────────────────────────────────────────────────────────────

export default function MergeConflictModal({
  conflicts, nodes, isDark, onClose,
}: MergeConflictModalProps) {
  const t        = getTheme(isDark)
  const errors   = conflicts.filter(c => c.severity === 'error').length
  const warnings = conflicts.filter(c => c.severity === 'warning').length

  return (
    <AnimatePresence>
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed', inset: 0, zIndex: 400,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '16px',
        }}
        onClick={e => { if (e.target === e.currentTarget) onClose() }}
      >
        <motion.div
          key="modal"
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1,    y: 0  }}
          exit={{    opacity: 0, scale: 0.94, y: 16 }}
          transition={{ type: 'spring', stiffness: 340, damping: 28 }}
          style={{
            background:    t.panelBg,
            border:        `1.5px solid ${t.borderNeutral}`,
            borderRadius:  '22px',
            boxShadow:     isDark ? '0 24px 60px rgba(0,0,0,0.7)' : '0 24px 60px rgba(0,0,0,0.18)',
            width:         '100%',
            maxWidth:      '500px',
            maxHeight:     '88vh',
            overflow:      'hidden',
            display:       'flex',
            flexDirection: 'column',
          }}
        >
          {/* ── Header ────────────────────────────────────────────────────── */}
          <div style={{
            padding:         '20px 20px 16px',
            borderBottom:    `1px solid ${t.controlBorder}`,
            display:         'flex',
            alignItems:      'flex-start',
            justifyContent:  'space-between',
            flexShrink:      0,
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                {/* Icon */}
                <div style={{
                  width: '34px', height: '34px', borderRadius: '10px',
                  background: errors > 0 ? 'rgba(239,68,68,0.12)' : 'rgba(234,179,8,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <span style={{ fontSize: '18px' }}>{errors > 0 ? '⛔' : '⚠️'}</span>
                </div>
                <span style={{ fontSize: '15px', fontWeight: 700, color: t.text }}>
                  Merge completed with conflicts
                </span>
              </div>
              <p style={{ margin: '0 0 10px', fontSize: '12.5px', color: t.textMuted, lineHeight: 1.5 }}>
                Trees were connected, but {conflicts.length} issue{conflicts.length !== 1 ? 's were' : ' was'} found. Fix the relationships shown below.
              </p>
              {/* Summary pills */}
              <div style={{ display: 'flex', gap: '8px' }}>
                {errors > 0 && (
                  <span style={{ padding: '2px 11px', borderRadius: '999px', background: 'rgba(239,68,68,0.10)', fontSize: '11px', fontWeight: 600, color: '#EF4444' }}>
                    {errors} error{errors !== 1 ? 's' : ''}
                  </span>
                )}
                {warnings > 0 && (
                  <span style={{ padding: '2px 11px', borderRadius: '999px', background: 'rgba(234,179,8,0.10)', fontSize: '11px', fontWeight: 600, color: '#B45309' }}>
                    {warnings} warning{warnings !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textMuted, padding: '2px', display: 'flex', flexShrink: 0, marginLeft: '10px' }}
            >
              <IconX size={16} />
            </button>
          </div>

          {/* ── Conflict cards ─────────────────────────────────────────────── */}
          <div style={{ overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {conflicts.map((c, i) => {
              const isError = c.severity === 'error'
              const accentColor = isError ? '#EF4444' : '#F59E0B'
              const bgColor     = isError
                ? (isDark ? 'rgba(239,68,68,0.06)' : 'rgba(239,68,68,0.03)')
                : (isDark ? 'rgba(234,179,8,0.06)'  : 'rgba(234,179,8,0.03)')

              return (
                <div
                  key={i}
                  style={{
                    background:   bgColor,
                    border:       `1.5px solid ${isError ? 'rgba(239,68,68,0.22)' : 'rgba(234,179,8,0.22)'}`,
                    borderLeft:   `4px solid ${accentColor}`,
                    borderRadius: '14px',
                    overflow:     'hidden',
                  }}
                >
                  {/* Card heading */}
                  <div style={{
                    padding:      '12px 14px 8px',
                    borderBottom: `1px solid ${isError ? 'rgba(239,68,68,0.12)' : 'rgba(234,179,8,0.12)'}`,
                    display:      'flex',
                    alignItems:   'center',
                    gap:          '7px',
                  }}>
                    <span style={{ fontSize: '14px' }}>{isError ? '🔴' : '🟡'}</span>
                    <span style={{ fontSize: '12.5px', fontWeight: 700, color: accentColor }}>
                      {TITLES[c.type]}
                    </span>
                  </div>

                  {/* Visual diagram */}
                  <div style={{
                    padding:         '20px 16px',
                    display:         'flex',
                    justifyContent:  'center',
                    background:      isDark ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.6)',
                  }}>
                    <ConflictDiagram conflict={c} nodes={nodes} isDark={isDark} />
                  </div>

                  {/* Fix hint */}
                  <div style={{ padding: '10px 14px 13px' }}>
                    <p style={{ margin: 0, fontSize: '11.5px', color: t.textMuted, lineHeight: 1.5 }}>
                      <span style={{ fontWeight: 600, color: t.text }}>How to fix: </span>
                      {HINTS[c.type]}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>

          {/* ── Footer ─────────────────────────────────────────────────────── */}
          <div style={{ padding: '12px 16px 18px', flexShrink: 0, borderTop: `1px solid ${t.controlBorder}` }}>
            <button
              onClick={onClose}
              style={{
                width:          '100%',
                height:         '44px',
                borderRadius:   '12px',
                border:         'none',
                background:     'linear-gradient(135deg, var(--c-primary), var(--c-primary-strong))',
                color:          '#fff',
                fontSize:       '13.5px',
                fontWeight:     600,
                fontFamily:     'inherit',
                cursor:         'pointer',
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
                gap:            '7px',
                boxShadow:      '0 4px 14px rgb(var(--c-primary-rgb) / 0.35)',
              }}
            >
              <IconCheck size={16} />
              Got it — I'll review my tree
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
