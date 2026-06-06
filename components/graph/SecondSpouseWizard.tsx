'use client'

import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { IconX, IconArrowLeft, IconLoader2, IconCheck, IconCamera, IconUser } from '@tabler/icons-react'
import type { Edge } from '@xyflow/react'
import { getTheme, COLORS } from '@/lib/theme'
import { Z } from '@/lib/zIndex'
import { api } from '@/lib/api'
import type { EdgeData } from '@/types'

// ── Photo compression (local copy, same algorithm as AddNodeWizard) ────────────
function compressPhoto(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) return Promise.reject(new Error('Not an image'))
  return new Promise((resolve, reject) => {
    const img = new Image()
    const blobUrl = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(blobUrl)
      const MAX = 480
      const scale = Math.min(1, MAX / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width  = Math.round(img.width  * scale)
      canvas.height = Math.round(img.height * scale)
      const ctx = canvas.getContext('2d')
      if (!ctx) { resolve(canvas.toDataURL()); return }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', 0.78))
    }
    img.onerror = reject
    img.src = blobUrl
  })
}

// ── Types ─────────────────────────────────────────────────────────────────────
type Phase      = 'resolve' | 'add' | 'reparent'
type ExitStatus = 'widowed' | 'divorced' | 'separated' | 'unknown'
/** Which of the two marriages is the currently-active one. */
type ActiveChoice = 'existing' | 'new'

export interface ExistingSpouse {
  relationshipId: string
  personId:       string
  fullName:       string
  isAlive:        boolean
  subType:        string | null
}

export interface ExistingChild {
  personId:           string
  fullName:           string
  photoUrl?:          string | null
  currentMotherId:    string | null
  currentMotherName:  string | null
}

interface SecondSpouseWizardProps {
  anchorId:         string
  anchorName:       string
  /** All active SPOUSE_OF rels on the anchor — the one we'll resolve in Phase 1 */
  existingSpouses:  ExistingSpouse[]
  /** All of anchor's children — re-mother in Phase 3 */
  existingChildren: ExistingChild[]
  isDark:           boolean
  onComplete:       () => void
  onClose:          () => void
}

interface ExitOption { value: ExitStatus; label: (name: string) => string; askYear: string | null }
const EXIT_OPTIONS: ExitOption[] = [
  { value: 'widowed',   label: name => `${name} has passed away`,            askYear: 'Year of passing' },
  { value: 'divorced',  label: ()   => 'They were divorced',                 askYear: 'Year of divorce' },
  { value: 'separated', label: ()   => 'They are separated',                 askYear: null },
  { value: 'unknown',   label: ()   => "I don't know — record this and ask later", askYear: null },
]

// ── Helper: derive children data from edges ───────────────────────────────────
export function deriveChildrenFromEdges(
  anchorId: string,
  edges: Edge[],
  nodes: { id: string; data: { fullName?: string; photoUrl?: string | null } }[],
): ExistingChild[] {
  const nodeMap = new Map(nodes.map(n => [n.id, n.data]))
  const childIds = edges
    .filter(e => (e.data as unknown as EdgeData)?.relType === 'PARENT_OF' && e.source === anchorId)
    .map(e => e.target)

  return childIds.map(childId => {
    // Find the "other parent" — any PARENT_OF to this child whose source is not the anchor
    const otherParent = edges.find(e =>
      (e.data as unknown as EdgeData)?.relType === 'PARENT_OF' &&
      e.target === childId &&
      e.source !== anchorId,
    )
    const motherId   = otherParent?.source ?? null
    const motherName = motherId ? (nodeMap.get(motherId)?.fullName ?? null) : null
    const childData  = nodeMap.get(childId)
    return {
      personId:           childId,
      fullName:           childData?.fullName ?? '',
      photoUrl:           childData?.photoUrl ?? null,
      currentMotherId:    motherId,
      currentMotherName:  motherName,
    }
  })
}

// ── Helper: derive existing active spouses from edges ─────────────────────────
export function deriveActiveSpousesFromEdges(
  anchorId: string,
  edges: Edge[],
  nodes: { id: string; data: { fullName?: string; isAlive?: boolean } }[],
): ExistingSpouse[] {
  const nodeMap = new Map(nodes.map(n => [n.id, n.data]))
  return edges
    .filter(e => {
      const d = e.data as unknown as EdgeData | undefined
      if (d?.relType !== 'SPOUSE_OF') return false
      if (e.source !== anchorId && e.target !== anchorId) return false
      return d?.isActive !== false   // active or undefined-defaults-to-active
    })
    .map(e => {
      const otherId = e.source === anchorId ? e.target : e.source
      const other   = nodeMap.get(otherId)
      return {
        relationshipId: e.id,
        personId:       otherId,
        fullName:       other?.fullName ?? '',
        isAlive:        other?.isAlive ?? true,
        subType:        (e.data as unknown as EdgeData)?.subType ?? 'married',
      }
    })
}

// ── Main component ────────────────────────────────────────────────────────────
export default function SecondSpouseWizard({
  anchorId, anchorName, existingSpouses, existingChildren, isDark, onComplete, onClose,
}: SecondSpouseWizardProps) {
  const t = getTheme(isDark)

  const [phase,   setPhase]   = useState<Phase>('resolve')
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')

  // ── Phase 1 state ────────────────────────────────────────────────────────────
  // Step A: which marriage is currently active? Default = new (most common case).
  // Step B: pick the exit status for the inactive one + optional year.
  const [activeChoice, setActiveChoice] = useState<ActiveChoice>('new')
  const [exitStatus,   setExitStatus]   = useState<ExitStatus>('widowed')
  const [exitYear,     setExitYear]     = useState('')

  // ── Phase 2 state — new spouse profile ──────────────────────────────────────
  const [newName,        setNewName]        = useState('')
  const [newNameErr,     setNewNameErr]     = useState('')
  const [newGender,      setNewGender]      = useState<'male' | 'female' | 'other' | ''>('')
  const [newBirthYear,   setNewBirthYear]   = useState('')
  const [newPhotoUrl,    setNewPhotoUrl]    = useState<string | undefined>()
  const [newPhotoBusy,   setNewPhotoBusy]   = useState(false)
  const [newUnionYear,   setNewUnionYear]   = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  // ── Phase 3 state — mother choice per child ─────────────────────────────────
  // Default: keep current (which is usually wife 1).
  const [createdSpouseId,    setCreatedSpouseId] = useState<string | null>(null)
  const [motherChoices, setMotherChoices] = useState<Record<string, string | 'unknown'>>(
    () => Object.fromEntries(existingChildren.map(c => [c.personId, c.currentMotherId ?? 'unknown'])),
  )

  const wife1 = existingSpouses[0] // single source to ask about — business rule

  // ── Phase 1: resolve marriages ─────────────────────────────────────────────
  // - activeChoice = 'new'      → PATCH existing wife 1 with the exit status.
  //                                 New spouse gets sub_type='married' in Phase 2.
  // - activeChoice = 'existing' → wife 1 stays untouched.
  //                                 New spouse gets sub_type=exitStatus in Phase 2.
  const handleResolve = useCallback(async () => {
    setSaving(true); setError('')
    try {
      if (activeChoice === 'new' && wife1) {
        const sep = exitYear.trim() ? parseInt(exitYear) : null
        await api.relationships.update(wife1.relationshipId, {
          sub_type:        exitStatus,
          separation_year: sep && !isNaN(sep) ? sep : null,
        })
      }
      setSaving(false)
      setPhase('add')
    } catch (err) {
      setSaving(false)
      setError((err as Error).message || 'Could not update the existing marriage')
    }
  }, [activeChoice, exitStatus, exitYear, wife1])

  // ── Phase 2: create new spouse + SPOUSE_OF ─────────────────────────────────
  const handleAddNewSpouse = useCallback(async () => {
    const name = newName.trim()
    if (!name) { setNewNameErr('Please enter a name'); return }
    setNewNameErr('')

    setSaving(true); setError('')
    try {
      const yr  = newBirthYear.trim() ? parseInt(newBirthYear) : undefined
      const uy  = newUnionYear.trim() ? parseInt(newUnionYear) : undefined
      const ey  = exitYear.trim()     ? parseInt(exitYear)     : undefined
      const person = await api.persons.create({
        full_name:  name,
        is_alive:   true,
        gender:     newGender || undefined,
        birth_year: yr && !isNaN(yr) ? yr : undefined,
      })
      if (newPhotoUrl) {
        try { await api.persons.update(person.id, { photo_url: newPhotoUrl }) } catch { /* non-fatal */ }
      }
      // Determine the new SPOUSE_OF's status based on which marriage is active.
      //   active = 'new'      → this marriage is current → 'married'
      //   active = 'existing' → new spouse is the *ex* → use exitStatus from Phase 1
      const subType = activeChoice === 'new' ? 'married' : exitStatus
      const sepYear = activeChoice === 'existing' && ey && !isNaN(ey) ? ey : undefined

      // ONLY the SPOUSE_OF edge — no child cascade (Phase 3 handles it).
      await api.relationships.create({
        from_person_id: person.id,
        to_person_id:   anchorId,
        rel_type:       'SPOUSE_OF',
        sub_type:       subType,
        union_year:     uy && !isNaN(uy) ? uy : undefined,
        separation_year: sepYear,
      })
      setCreatedSpouseId(person.id)
      setSaving(false)
      if (existingChildren.length === 0) {
        // No children → skip Phase 3 entirely.
        onComplete()
      } else {
        setPhase('reparent')
      }
    } catch (err) {
      setSaving(false)
      setError((err as Error).message || 'Could not add the new spouse')
    }
  }, [newName, newGender, newBirthYear, newPhotoUrl, newUnionYear, activeChoice, exitStatus, exitYear, anchorId, existingChildren.length, onComplete])

  // ── Phase 3: reparent children ─────────────────────────────────────────────
  const handleReparent = useCallback(async () => {
    setSaving(true); setError('')
    try {
      const changes = existingChildren
        .map(c => {
          const choice = motherChoices[c.personId]
          const newMotherId = choice === 'unknown' ? null : choice
          if (newMotherId === c.currentMotherId) return null
          return { child_id: c.personId, new_mother_id: newMotherId }
        })
        .filter((x): x is { child_id: string; new_mother_id: string | null } => x !== null)

      if (changes.length > 0) {
        await api.persons.reparent(anchorId, changes)
      }
      setSaving(false)
      onComplete()
    } catch (err) {
      setSaving(false)
      setError((err as Error).message || 'Could not save mother assignments')
    }
  }, [existingChildren, motherChoices, anchorId, onComplete])

  // ── Photo upload ──────────────────────────────────────────────────────────
  const processFile = async (file: File) => {
    setNewPhotoBusy(true)
    try { setNewPhotoUrl(await compressPhoto(file)) } catch {}
    finally { setNewPhotoBusy(false) }
  }

  // ── Shared styles ─────────────────────────────────────────────────────────
  const cardBg     = isDark ? '#1C1410' : '#FFFAF5'
  const cardBorder = isDark ? '1.5px solid rgba(255,255,255,0.08)' : '1.5px solid rgba(234,88,12,0.14)'
  const inputStyle: React.CSSProperties = {
    width: '100%', height: 46, padding: '0 14px',
    fontSize: 15, fontFamily: 'inherit',
    border: `1.5px solid ${isDark ? 'rgba(234,88,12,0.35)' : 'rgba(234,88,12,0.28)'}`,
    borderRadius: 11, outline: 'none',
    background: isDark ? 'rgba(255,255,255,0.05)' : '#fff',
    color: t.text, boxSizing: 'border-box',
  }
  const btnPrimary: React.CSSProperties = {
    width: '100%', height: 44, borderRadius: 11, border: 'none',
    background: saving ? (isDark ? '#3A2A18' : '#FDE8CC') : COLORS.saffron,
    color: saving ? COLORS.saffron : '#fff',
    cursor: saving ? 'default' : 'pointer',
    fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    boxShadow: saving ? 'none' : '0 2px 10px rgba(234,88,12,0.30)',
    transition: 'background 0.2s, color 0.2s',
  }
  const btnGhost: React.CSSProperties = {
    background: 'none', border: 'none', cursor: 'pointer',
    fontSize: 12, color: t.textMuted, fontFamily: 'inherit',
    padding: '8px 0', textAlign: 'center',
  }

  const phaseIndex = phase === 'resolve' ? 0 : phase === 'add' ? 1 : 2
  const totalPhases = existingChildren.length > 0 ? 3 : 2

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: Z.modal,
        background: isDark ? 'rgba(0,0,0,0.78)' : 'rgba(0,0,0,0.48)',
        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 24 }}
        transition={{ type: 'spring', stiffness: 300, damping: 26 }}
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 560,
          maxHeight: 'calc(100vh - 40px)', overflowY: 'auto',
          background: cardBg, border: cardBorder, borderRadius: 22,
          boxShadow: isDark
            ? '0 40px 100px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.04)'
            : '0 40px 100px rgba(0,0,0,0.20), 0 0 0 1px rgba(234,88,12,0.06)',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 20px 14px',
          borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}`,
          display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, background: cardBg, zIndex: 1,
        }}>
          <button
            onClick={phase === 'resolve' ? onClose : () => setPhase(phase === 'reparent' ? 'add' : 'resolve')}
            style={{
              width: 32, height: 32, borderRadius: 9, flexShrink: 0, border: 'none', cursor: 'pointer',
              background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)', color: t.textMuted,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {phase === 'resolve' ? <IconX size={14} /> : <IconArrowLeft size={14} />}
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: t.text, lineHeight: 1.2 }}>
              {phase === 'resolve' && 'Resolve current marriage'}
              {phase === 'add'     && 'Add the new spouse'}
              {phase === 'reparent' && 'Mother of each child'}
            </div>
            <div style={{ fontSize: 11, color: t.textMuted, marginTop: 2 }}>
              for <span style={{ color: COLORS.saffron, fontWeight: 600 }}>{anchorName}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
            {Array.from({ length: totalPhases }).map((_, i) => (
              <motion.div key={i}
                animate={{
                  width: i === phaseIndex ? 18 : 6,
                  background: i <= phaseIndex ? COLORS.saffron : isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.10)',
                }}
                style={{ height: 5, borderRadius: 3 }}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">

          {/* ── Phase 1: which marriage is active? ───────────────────────── */}
          {phase === 'resolve' && (
            <motion.div key="resolve"
              initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.22 }}
              style={{ padding: '22px 24px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}
            >
              <div>
                <p style={{ margin: 0, fontSize: 14, color: t.text, lineHeight: 1.55 }}>
                  <span style={{ color: COLORS.saffron, fontWeight: 700 }}>{anchorName}</span>{' '}
                  is currently married to{' '}
                  <span style={{ fontWeight: 700, color: t.text }}>{wife1?.fullName ?? 'someone'}</span>.
                  Only one marriage can be active at a time — which one is it now?
                </p>
              </div>

              {/* Active-marriage picker */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {([
                  { value: 'existing' as const, label: `${wife1?.fullName ?? 'The first wife'} is still the active marriage` },
                  { value: 'new'      as const, label: 'The new spouse will become the active marriage' },
                ]).map(opt => {
                  const active = activeChoice === opt.value
                  return (
                    <button key={opt.value}
                      onClick={() => setActiveChoice(opt.value)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '12px 13px', borderRadius: 11, cursor: 'pointer',
                        fontFamily: 'inherit', textAlign: 'left',
                        border: `1.5px solid ${active ? COLORS.saffron : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.09)'}`,
                        background: active ? (isDark ? 'rgba(234,88,12,0.12)' : 'rgba(234,88,12,0.07)') : isDark ? 'rgba(255,255,255,0.02)' : '#FFFAF5',
                        color: active ? COLORS.saffron : t.text,
                        fontSize: 13, fontWeight: 600,
                      }}>
                      <span style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${active ? COLORS.saffron : t.textMuted}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {active && <span style={{ width: 7, height: 7, borderRadius: '50%', background: COLORS.saffron }} />}
                      </span>
                      <span>{opt.label}</span>
                    </button>
                  )
                })}
              </div>

              {/* Exit status for the *inactive* spouse */}
              {(() => {
                const inactiveName = activeChoice === 'new'
                  ? (wife1?.fullName ?? 'the first wife')
                  : 'the new spouse'
                const optMeta = EXIT_OPTIONS.find(o => o.value === exitStatus)
                return (
                  <div style={{
                    display: 'flex', flexDirection: 'column', gap: 10,
                    padding: 14, borderRadius: 13,
                    background: isDark ? 'rgba(255,255,255,0.02)' : '#FFFAF5',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(234,88,12,0.10)'}`,
                  }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: t.text, letterSpacing: '0.02em' }}>
                      What happened with {inactiveName}?
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {EXIT_OPTIONS.map(opt => {
                        const active = exitStatus === opt.value
                        return (
                          <button key={opt.value}
                            onClick={() => setExitStatus(opt.value)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 9,
                              padding: '10px 12px', borderRadius: 9, cursor: 'pointer',
                              fontFamily: 'inherit', textAlign: 'left',
                              border: `1.5px solid ${active ? COLORS.saffron : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)'}`,
                              background: active ? (isDark ? 'rgba(234,88,12,0.10)' : 'rgba(234,88,12,0.06)') : 'transparent',
                              color: active ? COLORS.saffron : t.text,
                              fontSize: 12.5, fontWeight: 600,
                            }}>
                            <span style={{ width: 13, height: 13, borderRadius: '50%', border: `2px solid ${active ? COLORS.saffron : t.textMuted}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              {active && <span style={{ width: 5, height: 5, borderRadius: '50%', background: COLORS.saffron }} />}
                            </span>
                            <span>{opt.label(inactiveName)}</span>
                          </button>
                        )
                      })}
                    </div>
                    {optMeta?.askYear && (
                      <div>
                        <label style={{ display: 'block', marginBottom: 6, fontSize: 11.5, fontWeight: 600, color: t.textMuted, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                          {optMeta.askYear}
                        </label>
                        <input
                          value={exitYear}
                          onChange={e => setExitYear(e.target.value.replace(/\D/g, '').slice(0, 4))}
                          placeholder="YYYY"
                          inputMode="numeric"
                          style={inputStyle}
                        />
                      </div>
                    )}
                  </div>
                )
              })()}

              {error && <p style={{ margin: 0, fontSize: 12, color: COLORS.error }}>{error}</p>}

              <motion.button onClick={handleResolve} disabled={saving}
                whileHover={!saving ? { scale: 1.015 } : {}}
                whileTap={!saving ? { scale: 0.98 } : {}}
                style={btnPrimary}>
                {saving && <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}><IconLoader2 size={15} /></motion.div>}
                {saving ? 'Saving…' : 'Continue →'}
              </motion.button>
            </motion.div>
          )}

          {/* ── Phase 2: add new spouse ─────────────────────────────────── */}
          {phase === 'add' && (
            <motion.div key="add"
              initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.22 }}
              style={{ padding: '22px 24px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}
            >
              <p style={{ margin: 0, fontSize: 13, color: t.textMuted, lineHeight: 1.5 }}>
                Their basics. You can fill in more from the node panel later.
              </p>

              {/* Photo */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <button onClick={() => fileRef.current?.click()}
                  style={{
                    width: 64, height: 64, borderRadius: '50%',
                    border: newPhotoUrl ? 'none' : `1.5px dashed ${COLORS.saffron}`,
                    background: newPhotoUrl ? 'transparent' : (isDark ? 'rgba(234,88,12,0.08)' : 'rgba(234,88,12,0.06)'),
                    cursor: newPhotoBusy ? 'default' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: 0, flexShrink: 0,
                  }}>
                  {newPhotoBusy ? (
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}>
                      <IconLoader2 size={20} color={COLORS.saffron} />
                    </motion.div>
                  ) : newPhotoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={newPhotoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <IconCamera size={22} color={COLORS.saffron} />
                  )}
                </button>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f); e.target.value = '' }} />
                <span style={{ fontSize: 12, color: t.textMuted }}>Optional photo</span>
              </div>

              {/* Name */}
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 11.5, fontWeight: 600, color: t.textMuted, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  Full name
                </label>
                <input
                  value={newName}
                  onChange={e => { setNewName(e.target.value); setNewNameErr('') }}
                  placeholder="e.g. Shilpa Khandelwal"
                  style={{ ...inputStyle, borderColor: newNameErr ? COLORS.error : undefined }}
                />
                {newNameErr && <p style={{ margin: '4px 0 0', fontSize: 11.5, color: COLORS.error }}>{newNameErr}</p>}
              </div>

              {/* Gender + birth year row */}
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1.4 }}>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 11.5, fontWeight: 600, color: t.textMuted, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                    Gender
                  </label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {(['female', 'male', 'other'] as const).map(g => {
                      const active = newGender === g
                      const label  = g === 'female' ? 'Female' : g === 'male' ? 'Male' : 'Other'
                      return (
                        <button key={g} onClick={() => setNewGender(active ? '' : g)}
                          style={{
                            flex: 1, height: 44, borderRadius: 11, cursor: 'pointer', fontFamily: 'inherit',
                            border: `1.5px solid ${active ? COLORS.saffron : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.09)'}`,
                            background: active ? (isDark ? 'rgba(234,88,12,0.12)' : 'rgba(234,88,12,0.07)') : isDark ? 'rgba(255,255,255,0.02)' : '#FFFAF5',
                            color: active ? COLORS.saffron : t.text,
                            fontSize: 12.5, fontWeight: 600,
                          }}>
                          {label}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 11.5, fontWeight: 600, color: t.textMuted, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                    Birth year
                  </label>
                  <input
                    value={newBirthYear}
                    onChange={e => setNewBirthYear(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="YYYY"
                    inputMode="numeric"
                    style={inputStyle}
                  />
                </div>
              </div>

              <div style={{ height: 1, background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)', margin: '4px 0' }} />

              {/* Status banner — already decided in Phase 1 */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '9px 12px', borderRadius: 10,
                background: isDark ? 'rgba(234,88,12,0.10)' : 'rgba(234,88,12,0.06)',
                border: `1px solid ${isDark ? 'rgba(234,88,12,0.22)' : 'rgba(234,88,12,0.18)'}`,
              }}>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: COLORS.saffron, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  {activeChoice === 'new'
                    ? 'New active marriage'
                    : `Recorded as ${exitStatus}`}
                </span>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 11.5, fontWeight: 600, color: t.textMuted, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                    Year of marriage
                  </label>
                  <input
                    value={newUnionYear}
                    onChange={e => setNewUnionYear(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="YYYY"
                    inputMode="numeric"
                    style={inputStyle}
                  />
                </div>
                {activeChoice === 'existing' && EXIT_OPTIONS.find(o => o.value === exitStatus)?.askYear && (
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: 6, fontSize: 11.5, fontWeight: 600, color: t.textMuted, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                      {EXIT_OPTIONS.find(o => o.value === exitStatus)?.askYear}
                    </label>
                    <input
                      value={exitYear}
                      onChange={e => setExitYear(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      placeholder="YYYY"
                      inputMode="numeric"
                      style={inputStyle}
                    />
                  </div>
                )}
              </div>

              {error && <p style={{ margin: 0, fontSize: 12, color: COLORS.error }}>{error}</p>}

              <motion.button onClick={handleAddNewSpouse} disabled={saving}
                whileHover={!saving ? { scale: 1.015 } : {}}
                whileTap={!saving ? { scale: 0.98 } : {}}
                style={btnPrimary}>
                {saving && <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}><IconLoader2 size={15} /></motion.div>}
                {saving ? 'Adding…' : existingChildren.length > 0 ? 'Continue →' : '✓ Add to family tree'}
              </motion.button>
            </motion.div>
          )}

          {/* ── Phase 3: reparent ────────────────────────────────────────── */}
          {phase === 'reparent' && (
            <motion.div key="reparent"
              initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.22 }}
              style={{ padding: '22px 24px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}
            >
              <p style={{ margin: 0, fontSize: 13, color: t.text, lineHeight: 1.55 }}>
                <span style={{ color: COLORS.saffron, fontWeight: 700 }}>{anchorName}</span>{' '}
                has <strong>{existingChildren.length}</strong> {existingChildren.length === 1 ? 'child' : 'children'}.
                Who is the biological mother of each?
              </p>

              {existingChildren.map(child => {
                const chosen = motherChoices[child.personId]
                const options: { id: string | 'unknown'; label: string }[] = []
                if (wife1) options.push({ id: wife1.personId, label: `${wife1.fullName} (first wife)` })
                if (createdSpouseId && newName.trim()) {
                  options.push({ id: createdSpouseId, label: `${newName.trim()} (new wife)` })
                }
                // Allow "current other parent" if it's neither (covers edge cases)
                if (child.currentMotherId && child.currentMotherId !== wife1?.personId && child.currentMotherId !== createdSpouseId) {
                  options.push({ id: child.currentMotherId, label: `${child.currentMotherName ?? 'Current'} (current)` })
                }
                options.push({ id: 'unknown', label: 'Unknown' })

                return (
                  <div key={child.personId} style={{
                    padding: 12, borderRadius: 13,
                    background: isDark ? 'rgba(255,255,255,0.02)' : '#FFFAF5',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(234,88,12,0.10)'}`,
                    display: 'flex', flexDirection: 'column', gap: 10,
                  }}>
                    {/* Child header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
                        background: 'linear-gradient(135deg, #EA580C, #C2410C)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontSize: 14, fontWeight: 600 }}>
                        {child.photoUrl
                          // eslint-disable-next-line @next/next/no-img-element
                          ? <img src={child.photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <IconUser size={18} />
                        }
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: t.text }}>{child.fullName}</div>
                    </div>

                    {/* Options */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      {options.map(opt => {
                        const active = chosen === opt.id
                        return (
                          <button key={String(opt.id)}
                            onClick={() => setMotherChoices(prev => ({ ...prev, [child.personId]: opt.id }))}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 9,
                              padding: '9px 11px', borderRadius: 9, cursor: 'pointer',
                              fontFamily: 'inherit', textAlign: 'left',
                              border: `1.5px solid ${active ? COLORS.saffron : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)'}`,
                              background: active ? (isDark ? 'rgba(234,88,12,0.10)' : 'rgba(234,88,12,0.06)') : 'transparent',
                              color: active ? COLORS.saffron : t.text,
                              fontSize: 12.5, fontWeight: 600,
                            }}>
                            <span style={{ width: 13, height: 13, borderRadius: '50%', border: `2px solid ${active ? COLORS.saffron : t.textMuted}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {active && <span style={{ width: 5, height: 5, borderRadius: '50%', background: COLORS.saffron }} />}
                            </span>
                            <span>{opt.label}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}

              {error && <p style={{ margin: 0, fontSize: 12, color: COLORS.error }}>{error}</p>}

              <motion.button onClick={handleReparent} disabled={saving}
                whileHover={!saving ? { scale: 1.015 } : {}}
                whileTap={!saving ? { scale: 0.98 } : {}}
                style={btnPrimary}>
                {saving && <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}><IconLoader2 size={15} /></motion.div>}
                <IconCheck size={15} strokeWidth={2.5} />
                {saving ? 'Saving…' : 'Confirm and finish'}
              </motion.button>

              <button onClick={() => { setMotherChoices(Object.fromEntries(existingChildren.map(c => [c.personId, c.currentMotherId ?? 'unknown']))); onComplete() }} style={btnGhost}>
                Skip — I'll do this later
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </motion.div>
    </motion.div>
  )
}
