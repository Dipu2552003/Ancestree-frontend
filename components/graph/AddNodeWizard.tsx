'use client'

// AddNodeWizard — orchestrator for the "add relation" flow.
//
// Owns:
//   • the step machine (derived from REL_CONFIG + runtime answers)
//   • all input state (name / gender / birthdate / photo / marriage / etc)
//   • validation + the final onAdd callout
//
// Every visual piece — header, hero preview, each step body — lives in
// ./wizard/. The wizard re-exports WizardExtras and RELATION_LABELS so any
// caller importing from '@/components/graph/AddNodeWizard' keeps working.

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getTheme } from '@/lib/theme'
import { Z } from '@/lib/zIndex'
import PhotoCropModal from './nodeEditor/PhotoCropModal'
import {
  WizardHeader, WizardHero,
  StepName, StepGender, StepBirthdate, StepPhoto,
  StepMarriage, StepRelationship, StepMother, StepBioParents,
  StepMergeSearch,
  getWizardStyles,
  REL_CONFIG, CURRENT_YEAR, MONTH_NAMES,
  type StepId, type MarriageStatus, type AdoptionStatus, type MotherChoice,
  type AddNodeWizardProps,
} from './wizard'

// ── Public re-exports ─────────────────────────────────────────────────────────
// Kept here so external callers (e.g. the graph page) can keep importing from
// '@/components/graph/AddNodeWizard' without knowing about ./wizard.
export type { WizardExtras, MarriageStatus, AdoptionStatus, MotherChoice } from './wizard'
export { RELATION_LABELS } from './wizard'

export default function AddNodeWizard({ relAction, anchorName, anchorGender, isDark, motherOptions, fatherName, onAdd, onAddForMerge, onClose }: AddNodeWizardProps) {
  const t   = getTheme(isDark)
  const cfg = REL_CONFIG[relAction]

  // A spouse's gender is the opposite of the anchor's — so when we know the
  // anchor is male/female we infer it and skip the 'gender' step entirely.
  // ('other'/unknown anchor → can't infer → fall back to asking.)
  const impliedSpouseGender =
    relAction === 'spouse'
      ? (anchorGender === 'male' ? 'female' : anchorGender === 'female' ? 'male' : null)
      : null

  const [wizardMode,       setWizardMode]       = useState<'add' | 'search'>('add')
  const [stepIdx,          setStepIdx]          = useState(0)
  const [dir,              setDir]              = useState(1)
  const [fullName,         setFullName]         = useState('')
  const [nameError,        setNameError]        = useState('')
  const [gender,           setGender]           = useState<string>(cfg.impliedGender ?? impliedSpouseGender ?? '')
  const [birthDay,         setBirthDay]         = useState('')
  const [birthMonth,       setBirthMonth]       = useState('')
  const [birthYear,        setBirthYear]        = useState('')
  const [dateError,        setDateError]        = useState('')
  const [dateFieldFocused, setDateFieldFocused] = useState(false)
  const [photoUrl,         setPhotoUrl]         = useState<string | undefined>()
  const [cropSrc,          setCropSrc]          = useState<string | null>(null)
  const [photoHovered,     setPhotoHovered]     = useState(false)
  const [dragOver,         setDragOver]         = useState(false)
  const [saving,           setSaving]           = useState(false)
  const [saved,            setSaved]            = useState(false)

  // Spouse-only — marriage step state
  const [marriageStatus,   setMarriageStatus]   = useState<MarriageStatus>('married')
  const [unionYear,        setUnionYear]        = useState('')
  const [separationYear,   setSeparationYear]   = useState('')
  const [marriageError,    setMarriageError]    = useState('')

  // Son/daughter & brother/sister — adoption + mother choice + bio parents
  const [adoptionStatus,   setAdoptionStatus]   = useState<AdoptionStatus>('biological')
  // Default to the first option so Continue is immediately enabled.
  // First option is: spouse[0] (child case) or anchor's own mother (sibling case).
  const [motherChoice,     setMotherChoice]     = useState<MotherChoice>(
    () => motherOptions?.[0]?.id ?? null,
  )
  const [addBioParents,    setAddBioParents]    = useState(false)
  const [bioMotherName,    setBioMotherName]    = useState('')
  const [bioFatherName,    setBioFatherName]    = useState('')

  // Derived: the effective step list. For son/daughter & brother/sister we
  // extend the base [name, birthdate, photo] list with relationship-specific
  // questions, conditionally adding 'mother' when there are 2+ candidate
  // mothers and 'bio-parents' when the user picks 'adopted'.
  const isChildAdd         = relAction === 'son'     || relAction === 'daughter'
  const isSiblingAdd       = relAction === 'brother' || relAction === 'sister'
  const needsParentChoice  = isChildAdd || isSiblingAdd
  const multiSpouse        = (motherOptions?.length ?? 0) >= 2
  // When the spouse's gender is inferred from the anchor, drop the 'gender' step.
  const baseSteps: StepId[] = impliedSpouseGender ? cfg.steps.filter(s => s !== 'gender') : cfg.steps
  const steps: StepId[] = needsParentChoice
    ? (() => {
        const out: StepId[] = ['name', 'birthdate', 'photo', 'relationship']
        if (multiSpouse)                     out.push('mother')
        if (adoptionStatus === 'adopted')    out.push('bio-parents')
        return out
      })()
    : baseSteps

  const nameRef  = useRef<HTMLInputElement>(null)
  const dayRef   = useRef<HTMLInputElement>(null)
  const monthRef = useRef<HTMLInputElement>(null)
  const yearRef  = useRef<HTMLInputElement>(null)
  const fileRef  = useRef<HTMLInputElement>(null)

  const currentStep = steps[stepIdx]
  const isLastStep  = stepIdx === steps.length - 1

  useEffect(() => {
    const id = setTimeout(() => {
      if (currentStep === 'name')      nameRef.current?.focus()
      if (currentStep === 'birthdate') dayRef.current?.focus()
    }, 260)
    return () => clearTimeout(id)
  }, [currentStep])

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', fn)
    return () => document.removeEventListener('keydown', fn)
  }, [onClose])

  const goNext = () => { setDir(1);  setStepIdx(s => s + 1) }
  const goPrev = () => { setDir(-1); setStepIdx(s => s - 1) }

  const handleNameContinue = () => {
    if (!fullName.trim()) { setNameError('Please enter a name'); return }
    setNameError('')
    goNext()
  }

  const handleBirthdateContinue = () => {
    if (birthDay.trim()) {
      const d = parseInt(birthDay)
      if (isNaN(d) || d < 1 || d > 31) { setDateError('Day must be between 1 and 31'); return }
    }
    if (birthMonth.trim()) {
      const m = parseInt(birthMonth)
      if (isNaN(m) || m < 1 || m > 12) { setDateError('Month must be between 1 and 12'); return }
    }
    if (birthYear.trim()) {
      const y = parseInt(birthYear)
      if (isNaN(y) || y <= 0) { setDateError('Enter a valid year'); return }
    }
    setDateError('')
    goNext()
  }

  const handleCreate = useCallback(async (withPhoto = true) => {
    setSaving(true)
    try {
      const yr = birthYear.trim()  ? parseInt(birthYear)  : undefined
      const mo = birthMonth.trim() ? parseInt(birthMonth) : undefined
      const dy = birthDay.trim()   ? parseInt(birthDay)   : undefined
      const uy = unionYear.trim()      ? parseInt(unionYear)      : undefined
      const sy = separationYear.trim() ? parseInt(separationYear) : undefined
      await onAdd(relAction, fullName.trim(), {
        gender:         gender || undefined,
        birthYear:      yr && !isNaN(yr) ? yr : undefined,
        birthMonth:     mo && !isNaN(mo) ? mo : undefined,
        birthDay:       dy && !isNaN(dy) ? dy : undefined,
        photoUrl:       withPhoto ? photoUrl : undefined,
        marriageStatus: relAction === 'spouse' ? marriageStatus : undefined,
        unionYear:      relAction === 'spouse' && uy && !isNaN(uy) ? uy : undefined,
        separationYear: relAction === 'spouse' && sy && !isNaN(sy) ? sy : undefined,
        adoptionStatus: needsParentChoice ? adoptionStatus : undefined,
        motherChoice:   needsParentChoice && multiSpouse ? motherChoice : undefined,
        bioMotherName:  needsParentChoice && adoptionStatus === 'adopted' && addBioParents ? bioMotherName.trim() || undefined : undefined,
        bioFatherName:  needsParentChoice && adoptionStatus === 'adopted' && addBioParents ? bioFatherName.trim() || undefined : undefined,
      })
      setSaved(true)
    } catch {
      setSaving(false)
    }
  }, [relAction, fullName, gender, birthYear, birthMonth, birthDay, photoUrl, marriageStatus, unionYear, separationYear, needsParentChoice, multiSpouse, adoptionStatus, motherChoice, addBioParents, bioMotherName, bioFatherName, onAdd])

  // Picking/dropping a file opens PhotoCropModal so the user can centre and
  // zoom before it lands on the node. The modal exports an already-compressed
  // 480px JPEG, so no separate compression pass is needed here.
  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) return
    setCropSrc(URL.createObjectURL(file))
  }

  const closeCrop = () => {
    setCropSrc(prev => { if (prev) URL.revokeObjectURL(prev); return null })
  }

  const parsedYear = parseInt(birthYear)
  const ageHint = birthYear.trim() && !isNaN(parsedYear) && parsedYear > 0 && parsedYear <= CURRENT_YEAR
    ? `~ ${CURRENT_YEAR - parsedYear} years old`
    : null

  // formatted date preview shown below the input
  const datePreview = (() => {
    const parts: string[] = []
    if (birthDay.trim())   parts.push(birthDay.padStart(2, '0'))
    if (birthMonth.trim()) {
      const mo = parseInt(birthMonth)
      parts.push(!isNaN(mo) && mo >= 1 && mo <= 12 ? MONTH_NAMES[mo - 1] : birthMonth)
    }
    if (birthYear.trim()) parts.push(birthYear)
    return parts.length ? parts.join(' ') : null
  })()

  const styles = getWizardStyles(isDark, t, saving, saved)

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
        padding: '16px',
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 24 }}
        animate={{ opacity: 1, scale: 1,    y: 0 }}
        exit={{    opacity: 0, scale: 0.92, y: 24 }}
        transition={{ type: 'spring', stiffness: 300, damping: 26 }}
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '520px',
          maxHeight: 'calc(100dvh - 32px)',
          background: isDark ? '#1C1410' : '#FFFAF5',
          border: `1.5px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgb(var(--c-primary-rgb) / 0.14)'}`,
          borderRadius: 22,
          boxShadow: isDark
            ? '0 40px 100px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.04)'
            : '0 40px 100px rgba(0,0,0,0.20), 0 0 0 1px rgb(var(--c-primary-rgb) / 0.06)',
          overflowX: 'hidden', overflowY: 'auto',
        }}
      >
        <WizardHeader
          isDark={isDark} t={t}
          title={`Add ${cfg.label}`}
          anchorName={anchorName}
          stepIdx={stepIdx} steps={steps}
          onBack={goPrev} onClose={onClose}
          isSearchMode={wizardMode === 'search'}
          onToggleSearch={onAddForMerge ? () => setWizardMode(m => m === 'search' ? 'add' : 'search') : undefined}
        />

        {wizardMode === 'search' && onAddForMerge ? (
          <StepMergeSearch
            isDark={isDark} t={t}
            relAction={relAction}
            onAddForMerge={onAddForMerge}
          />
        ) : (
        <>
        <WizardHero
          isDark={isDark} currentStep={currentStep}
          relAction={relAction} direction={cfg.direction}
          anchorName={anchorName} fullName={fullName} gender={gender} photoUrl={photoUrl}
          motherChoice={motherChoice} motherOptions={motherOptions} fatherName={fatherName}
        />

        <div style={{ position: 'relative', overflow: 'hidden' }}>
          <AnimatePresence mode="wait" custom={dir}>

            {currentStep === 'name' && (
              <StepName
                dir={dir} isDark={isDark} t={t} styles={styles}
                relLabel={cfg.label}
                fullName={fullName} nameError={nameError} nameRef={nameRef}
                setFullName={setFullName} setNameError={setNameError}
                onContinue={handleNameContinue}
              />
            )}

            {currentStep === 'gender' && (
              <StepGender
                dir={dir} isDark={isDark} t={t} styles={styles}
                fullName={fullName} gender={gender}
                setGender={setGender} goNext={goNext}
              />
            )}

            {currentStep === 'birthdate' && (
              <StepBirthdate
                dir={dir} isDark={isDark} t={t} styles={styles}
                birthDay={birthDay} birthMonth={birthMonth} birthYear={birthYear}
                dateError={dateError} dateFieldFocused={dateFieldFocused}
                datePreview={datePreview} ageHint={ageHint}
                dayRef={dayRef} monthRef={monthRef} yearRef={yearRef}
                setBirthDay={setBirthDay} setBirthMonth={setBirthMonth} setBirthYear={setBirthYear}
                setDateError={setDateError} setDateFieldFocused={setDateFieldFocused}
                onContinue={handleBirthdateContinue}
                onSkip={() => { setBirthDay(''); setBirthMonth(''); setBirthYear(''); setDateError(''); goNext() }}
              />
            )}

            {currentStep === 'photo' && (
              <StepPhoto
                dir={dir} isDark={isDark} t={t} styles={styles}
                fullName={fullName} photoUrl={photoUrl}
                photoUploading={false} photoHovered={photoHovered}
                dragOver={dragOver} fileRef={fileRef}
                saving={saving} saved={saved} isLastStep={isLastStep}
                setPhotoUrl={setPhotoUrl} setPhotoHovered={setPhotoHovered}
                setDragOver={setDragOver} processFile={processFile}
                onPrimary={() => isLastStep ? handleCreate(true) : goNext()}
                onSkip={() => { if (saving || saved) return; if (isLastStep) handleCreate(false); else { setPhotoUrl(undefined); goNext() } }}
              />
            )}

            {currentStep === 'marriage' && (
              <StepMarriage
                dir={dir} isDark={isDark} t={t} styles={styles}
                marriageStatus={marriageStatus}
                unionYear={unionYear} separationYear={separationYear}
                marriageError={marriageError}
                saving={saving} saved={saved}
                setMarriageStatus={setMarriageStatus}
                setUnionYear={setUnionYear} setSeparationYear={setSeparationYear}
                setMarriageError={setMarriageError}
                onCreate={() => handleCreate(true)}
              />
            )}

            {currentStep === 'relationship' && (
              <StepRelationship
                dir={dir} isDark={isDark} t={t} styles={styles}
                fullName={fullName} isSiblingAdd={isSiblingAdd}
                adoptionStatus={adoptionStatus}
                saving={saving} saved={saved} isLastStep={isLastStep}
                setAdoptionStatus={setAdoptionStatus}
                onPrimary={() => isLastStep ? handleCreate(true) : goNext()}
              />
            )}

            {currentStep === 'mother' && (
              <StepMother
                dir={dir} isDark={isDark} t={t} styles={styles}
                fullName={fullName} anchorName={anchorName}
                isSiblingAdd={isSiblingAdd} adoptionStatus={adoptionStatus}
                motherChoice={motherChoice} motherOptions={motherOptions ?? []}
                saving={saving} saved={saved} isLastStep={isLastStep}
                setMotherChoice={setMotherChoice}
                onPrimary={() => isLastStep ? handleCreate(true) : goNext()}
              />
            )}

            {currentStep === 'bio-parents' && (
              <StepBioParents
                dir={dir} isDark={isDark} t={t} styles={styles}
                fullName={fullName}
                addBioParents={addBioParents}
                bioMotherName={bioMotherName} bioFatherName={bioFatherName}
                saving={saving} saved={saved}
                setAddBioParents={setAddBioParents}
                setBioMotherName={setBioMotherName} setBioFatherName={setBioFatherName}
                onCreate={() => handleCreate(true)}
              />
            )}

          </AnimatePresence>
        </div>
        </>
        )}
      </motion.div>

      {cropSrc && (
        <PhotoCropModal
          src={cropSrc}
          isDark={isDark}
          onCancel={closeCrop}
          onApply={(photo) => {
            setPhotoUrl(photo)
            closeCrop()
          }}
        />
      )}
    </motion.div>
  )
}
