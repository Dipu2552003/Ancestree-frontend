'use client'

// SecondSpouseWizard — three-phase modal flow for adding a second active
// spouse to a person who already has an active SPOUSE_OF. The flow:
//
//   Phase 1 — RESOLVE   pick which marriage is active + exit status for the
//                       inactive one (only marks the existing rel inactive
//                       when activeChoice = 'new')
//   Phase 2 — ADD       create the new Person + the new SPOUSE_OF rel
//   Phase 3 — REPARENT  for each existing child, optionally reassign mother
//                       to either wife 1, the new wife, or unknown
//
// Phase 3 is skipped if anchor has no children.
//
// Visual pieces (header, each phase body, shared input styles) live in
// ./spouseFlow/. This file owns state + API calls + composition.

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Z } from '@/lib/zIndex'
import { api } from '@/lib/api'
import { compressPhoto } from '@/lib/image/compressPhoto'
import { titleCase } from '@/lib/format/normalize'
import {
  WizardHeader, ResolvePhase, AddPhase, ReparentPhase,
  type ActiveChoice, type ExitStatus, type Phase,
  type ExistingChild, type ExistingSpouse,
} from './spouseFlow'

// ── Re-exports for backwards-compatible imports ──────────────────────────────
// The graph page imports these helpers and types from this file.
export { deriveActiveSpousesFromEdges, deriveChildrenFromEdges } from './spouseFlow'
export type { ExistingSpouse, ExistingChild } from './spouseFlow'

interface SecondSpouseWizardProps {
  anchorId:         string
  anchorName:       string
  /** Anchor's gender — a new spouse is the opposite, so when this is
   *  'male'/'female' we pre-fill it and hide the gender picker. */
  anchorGender?:    string
  /** All active SPOUSE_OF rels on the anchor — the one we'll resolve in Phase 1 */
  existingSpouses:  ExistingSpouse[]
  /** All of anchor's children — re-mother in Phase 3 */
  existingChildren: ExistingChild[]
  isDark:           boolean
  onComplete:       () => void
  onClose:          () => void
}

export default function SecondSpouseWizard({
  anchorId, anchorName, anchorGender, existingSpouses, existingChildren, isDark, onComplete, onClose,
}: SecondSpouseWizardProps) {
  // The new spouse is the opposite gender to the anchor (when known).
  const impliedGender =
    anchorGender === 'male' ? 'female' : anchorGender === 'female' ? 'male' : ''
  const [phase,   setPhase]   = useState<Phase>('resolve')
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')

  // ── Phase 1 state ────────────────────────────────────────────────────────
  // Default = 'new' (most common case — user added a second wife because
  // the first one passed away or they remarried).
  const [activeChoice, setActiveChoice] = useState<ActiveChoice>('new')
  const [exitStatus,   setExitStatus]   = useState<ExitStatus>('widowed')
  const [exitYear,     setExitYear]     = useState('')

  // ── Phase 2 state — new spouse profile ──────────────────────────────────
  const [newName,        setNewName]        = useState('')
  const [newNameErr,     setNewNameErr]     = useState('')
  const [newGender,      setNewGender]      = useState<'male' | 'female' | 'other' | ''>(impliedGender)
  const [newBirthYear,   setNewBirthYear]   = useState('')
  const [newPhotoUrl,    setNewPhotoUrl]    = useState<string | undefined>()
  const [newPhotoBusy,   setNewPhotoBusy]   = useState(false)
  const [newUnionYear,   setNewUnionYear]   = useState('')

  // ── Phase 3 state — mother choice per child ─────────────────────────────
  const [createdSpouseId, setCreatedSpouseId] = useState<string | null>(null)
  const [motherChoices, setMotherChoices] = useState<Record<string, string | 'unknown'>>(
    () => Object.fromEntries(existingChildren.map(c => [c.personId, c.currentMotherId ?? 'unknown'])),
  )

  const wife1 = existingSpouses[0] // single source to ask about — business rule

  // ── Phase 1: resolve marriages ──────────────────────────────────────────
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

  // ── Phase 2: create new spouse + SPOUSE_OF ──────────────────────────────
  const handleAddNewSpouse = useCallback(async () => {
    const name = titleCase(newName)
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
      //   active = 'both'     → both marriages current   → 'married'
      //   active = 'existing' → new spouse is the *ex*   → use exitStatus from Phase 1
      const subType = activeChoice === 'existing' ? exitStatus : 'married'
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
        onComplete()
      } else {
        setPhase('reparent')
      }
    } catch (err) {
      setSaving(false)
      setError((err as Error).message || 'Could not add the new spouse')
    }
  }, [newName, newGender, newBirthYear, newPhotoUrl, newUnionYear, activeChoice, exitStatus, exitYear, anchorId, existingChildren.length, onComplete])

  // ── Phase 3: reparent children ──────────────────────────────────────────
  const handleReparent = useCallback(async () => {
    setSaving(true); setError('')
    try {
      // Only send the diff — children whose chosen mother differs from their
      // current one. Skipping unchanged rows means the API stays a no-op when
      // the user just hits Confirm.
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

  // ── Photo upload — used by Phase 2 ──────────────────────────────────────
  const processFile = async (file: File) => {
    setNewPhotoBusy(true)
    try { setNewPhotoUrl(await compressPhoto(file)) } catch {}
    finally { setNewPhotoBusy(false) }
  }

  const cardBg     = isDark ? '#1C1410' : '#FFFAF5'
  const cardBorder = isDark ? '1.5px solid rgba(255,255,255,0.08)' : '1.5px solid rgb(var(--c-primary-rgb) / 0.14)'

  const phaseIndex = phase === 'resolve' ? 0 : phase === 'add' ? 1 : 2
  const totalPhases = existingChildren.length > 0 ? 3 : 2

  const headerTitle =
      phase === 'resolve'  ? 'Resolve current marriage'
    : phase === 'add'      ? 'Add the new spouse'
    :                        'Mother of each child'

  const onHeaderBack = phase === 'resolve'
    ? onClose
    : () => setPhase(phase === 'reparent' ? 'add' : 'resolve')

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
            : '0 40px 100px rgba(0,0,0,0.20), 0 0 0 1px rgb(var(--c-primary-rgb) / 0.06)',
        }}
      >
        <WizardHeader
          title={headerTitle}
          anchorName={anchorName}
          isDark={isDark}
          phaseIndex={phaseIndex}
          totalPhases={totalPhases}
          isFirstPhase={phase === 'resolve'}
          onBack={onHeaderBack}
        />

        <AnimatePresence mode="wait">
          {phase === 'resolve' && (
            <ResolvePhase
              key="resolve"
              anchorName={anchorName}
              wife1={wife1}
              activeChoice={activeChoice}
              setActiveChoice={setActiveChoice}
              exitStatus={exitStatus}
              setExitStatus={setExitStatus}
              exitYear={exitYear}
              setExitYear={setExitYear}
              saving={saving}
              error={error}
              isDark={isDark}
              onContinue={handleResolve}
            />
          )}

          {phase === 'add' && (
            <AddPhase
              key="add"
              isDark={isDark}
              saving={saving}
              error={error}
              hasChildren={existingChildren.length > 0}
              activeChoice={activeChoice}
              exitStatus={exitStatus}
              hideGender={impliedGender !== ''}
              newName={newName}            setNewName={setNewName}
              newNameErr={newNameErr}      setNewNameErr={setNewNameErr}
              newGender={newGender}        setNewGender={setNewGender}
              newBirthYear={newBirthYear}  setNewBirthYear={setNewBirthYear}
              newUnionYear={newUnionYear}  setNewUnionYear={setNewUnionYear}
              exitYear={exitYear}          setExitYear={setExitYear}
              newPhotoUrl={newPhotoUrl}
              newPhotoBusy={newPhotoBusy}
              onPhotoFile={processFile}
              onSubmit={handleAddNewSpouse}
            />
          )}

          {phase === 'reparent' && (
            <ReparentPhase
              key="reparent"
              anchorName={anchorName}
              existingChildren={existingChildren}
              wife1={wife1}
              createdSpouseId={createdSpouseId}
              createdSpouseName={newName}
              motherChoices={motherChoices}
              setMotherChoices={setMotherChoices}
              saving={saving}
              error={error}
              isDark={isDark}
              onConfirm={handleReparent}
              onSkip={() => {
                // Reset to current values and skip the API call.
                setMotherChoices(Object.fromEntries(existingChildren.map(c => [c.personId, c.currentMotherId ?? 'unknown'])))
                onComplete()
              }}
            />
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  )
}
