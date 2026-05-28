'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGraphStore } from '@/store/graphStore'
import {
  IconX, IconCamera, IconArrowUp, IconArrowDown,
  IconHeart, IconCheck, IconLoader2, IconTrash,
} from '@tabler/icons-react'
import type { Node } from '@xyflow/react'

interface PersonData {
  fullName: string
  nickname?: string
  gender?: string
  birthYear?: number
  birthPlace?: string
  deathYear?: number
  isAlive: boolean
  isDeceased: boolean
  nodeState: 'proxy' | 'invited' | 'claimed'
  isSelf: boolean
  generation: number
  relationshipToSelf: string
  photoUrl?: string
  gotra?: string
  nativeVillage?: string
  currentCity?: string
  currentCountry?: string
  occupation?: string
  bio?: string
  education?: string
}

interface SavePayload {
  fullName: string
  nickname?: string | null
  gender?: string | null
  birthYear?: number | null
  birthPlace?: string | null
  isDeceased: boolean
  isAlive: boolean
  deathYear?: number | null
  photoUrl?: string | null
  gotra?: string | null
  nativeVillage?: string | null
  currentCity?: string | null
  currentCountry?: string | null
  occupation?: string | null
  bio?: string | null
  education?: string | null
}

interface NodePanelProps {
  node: Node
  onClose: () => void
  onViewProfile?: () => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onUpdate: (id: string, data: any) => void
  onAddParent: (childId: string) => void
  onAddChild: (parentId: string) => void
  onAddSpouse: (personId: string) => void
  onSave?: (id: string, data: SavePayload) => Promise<void>
}

// Resize + JPEG-compress a photo client-side → base64 data URL.
// Max dimension 480 px, quality 0.78 → typically 30-80 KB.
function compressPhoto(file: File): Promise<string> {
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
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', 0.78))
    }
    img.onerror = reject
    img.src = blobUrl
  })
}

type SaveState = 'idle' | 'saving' | 'saved'

const GENDERS = [
  { value: 'male',    label: 'Male' },
  { value: 'female',  label: 'Female' },
  { value: 'other',   label: 'Other' },
  { value: 'unknown', label: 'Unknown' },
]

export default function NodePanel({ node, onClose, onViewProfile, onUpdate, onAddParent, onAddChild, onAddSpouse, onSave }: NodePanelProps) {
  const { isDark } = useGraphStore()
  const d = node.data as unknown as PersonData

  const [draft, setDraft] = useState({
    fullName:       d.fullName ?? '',
    nickname:       d.nickname ?? '',
    gender:         d.gender ?? '',
    birthYear:      d.birthYear ? String(d.birthYear) : '',
    birthPlace:     d.birthPlace ?? '',
    isDeceased:     Boolean(d.isDeceased),
    deathYear:      d.deathYear ? String(d.deathYear) : '',
    photoUrl:       d.photoUrl as string | undefined,
    gotra:          d.gotra ?? '',
    nativeVillage:  d.nativeVillage ?? '',
    currentCity:    d.currentCity ?? '',
    currentCountry: d.currentCountry ?? '',
    occupation:     d.occupation ?? '',
    bio:            d.bio ?? '',
    education:      d.education ?? '',
  })

  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [nameError, setNameError] = useState('')
  const [focused, setFocused] = useState<string | null>(null)
  const [photoHovered, setPhotoHovered] = useState(false)
  const [photoUploading, setPhotoUploading] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (d.fullName === 'Unknown') {
      setTimeout(() => { nameInputRef.current?.focus(); nameInputRef.current?.select() }, 120)
    }
  }, [d.fullName])

  const str = (v: string) => v.trim() || null

  const isDirty =
    draft.fullName       !== (d.fullName ?? '') ||
    draft.nickname       !== (d.nickname ?? '') ||
    draft.gender         !== (d.gender ?? '') ||
    draft.birthYear      !== (d.birthYear ? String(d.birthYear) : '') ||
    draft.birthPlace     !== (d.birthPlace ?? '') ||
    draft.isDeceased     !== Boolean(d.isDeceased) ||
    draft.deathYear      !== (d.deathYear ? String(d.deathYear) : '') ||
    draft.photoUrl       !== d.photoUrl ||
    draft.gotra          !== (d.gotra ?? '') ||
    draft.nativeVillage  !== (d.nativeVillage ?? '') ||
    draft.currentCity    !== (d.currentCity ?? '') ||
    draft.currentCountry !== (d.currentCountry ?? '') ||
    draft.occupation     !== (d.occupation ?? '') ||
    draft.bio            !== (d.bio ?? '') ||
    draft.education      !== (d.education ?? '')

  const commitDraft = useCallback(() => {
    onUpdate(node.id, {
      fullName:       draft.fullName.trim(),
      nickname:       str(draft.nickname) ?? undefined,
      gender:         draft.gender || undefined,
      birthYear:      draft.birthYear ? parseInt(draft.birthYear) : undefined,
      birthPlace:     str(draft.birthPlace) ?? undefined,
      isDeceased:     draft.isDeceased,
      isAlive:        !draft.isDeceased,
      deathYear:      draft.isDeceased && draft.deathYear ? parseInt(draft.deathYear) : undefined,
      photoUrl:       draft.photoUrl,
      gotra:          str(draft.gotra) ?? undefined,
      nativeVillage:  str(draft.nativeVillage) ?? undefined,
      currentCity:    str(draft.currentCity) ?? undefined,
      currentCountry: str(draft.currentCountry) ?? undefined,
      occupation:     str(draft.occupation) ?? undefined,
      bio:            str(draft.bio) ?? undefined,
      education:      str(draft.education) ?? undefined,
    })
  }, [draft, node.id, onUpdate])

  const handleSave = useCallback(async () => {
    if (!draft.fullName.trim()) {
      setNameError('Name is required')
      nameInputRef.current?.focus()
      return
    }
    setNameError('')
    setSaveState('saving')
    const payload: SavePayload = {
      fullName:       draft.fullName.trim(),
      nickname:       str(draft.nickname),
      gender:         draft.gender || null,
      birthYear:      draft.birthYear ? parseInt(draft.birthYear) : null,
      birthPlace:     str(draft.birthPlace),
      isDeceased:     draft.isDeceased,
      isAlive:        !draft.isDeceased,
      deathYear:      draft.isDeceased && draft.deathYear ? parseInt(draft.deathYear) : null,
      photoUrl:       draft.photoUrl ?? null,
      gotra:          str(draft.gotra),
      nativeVillage:  str(draft.nativeVillage),
      currentCity:    str(draft.currentCity),
      currentCountry: str(draft.currentCountry),
      occupation:     str(draft.occupation),
      bio:            str(draft.bio),
      education:      str(draft.education),
    }
    try {
      if (onSave) await onSave(node.id, payload)
      commitDraft()
      setSaveState('saved')
      setTimeout(() => setSaveState('idle'), 2000)
    } catch (err: unknown) {
      setSaveState('idle')
      setNameError(err instanceof Error ? err.message : 'Save failed')
    }
  }, [draft, node.id, onSave, commitDraft])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        if (isDirty) handleSave()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleSave, isDirty])

  const withAutoSave = (action: () => void) => {
    if (isDirty && draft.fullName.trim()) commitDraft()
    action()
  }

  // ── theme ─────────────────────────────────────────────────────────
  const panelBg   = isDark ? '#18160F' : '#FFFFFF'
  const headerBg  = isDark ? '#1C1A12' : '#FFFBF4'
  const borderCol = isDark ? 'rgba(255,255,255,0.07)' : '#FDE8CC'
  const labelCol  = isDark ? '#7A6A52' : '#9A3412'
  const textCol   = isDark ? '#EDE8E3' : '#431407'
  const inputBg   = isDark ? '#141210' : '#FFFBF4'
  const inputBdr  = isDark ? 'rgba(255,255,255,0.10)' : '#FDE8CC'
  const mutedCol  = isDark ? '#5A4A38' : '#C4A882'
  const sectionCol = isDark ? '#3A2A18' : '#F5E8D8'
  const btn1Bg    = isDark ? '#2A1A12' : '#FFF3E8'
  const btn2Bg    = isDark ? '#251510' : '#FFF3E8'
  const btn3Bg    = isDark ? '#221C10' : '#FFF8F0'

  const saveBg = saveState === 'saved'
    ? (isDark ? '#14401A' : '#DCFCE7')
    : isDirty
      ? '#EA580C'
      : (isDark ? '#221A10' : '#FFF3E8')
  const saveTextCol = saveState === 'saved'
    ? (isDark ? '#4ADE80' : '#16A34A')
    : isDirty ? '#FFFFFF' : mutedCol

  const inputStyle = (key: string): React.CSSProperties => ({
    width: '100%', height: '36px',
    border: `1.5px solid ${nameError && key === 'name' ? '#EF4444' : focused === key ? '#FB923C' : inputBdr}`,
    borderRadius: '8px', padding: '0 10px', fontSize: '13px',
    color: textCol, background: inputBg, outline: 'none',
    fontFamily: 'inherit', boxSizing: 'border-box',
    transition: 'border-color 0.15s ease',
  })

  const labelStyle: React.CSSProperties = {
    fontSize: '10px', textTransform: 'uppercase',
    letterSpacing: '0.08em', color: labelCol,
    marginBottom: '5px', display: 'block',
  }

  const sectionHeader = (title: string) => (
    <div style={{
      fontSize: '9.5px', fontWeight: 600, letterSpacing: '0.10em',
      textTransform: 'uppercase', color: mutedCol,
      padding: '10px 16px 6px',
      borderTop: `1px solid ${borderCol}`,
      background: sectionCol,
      marginTop: '4px',
    }}>
      {title}
    </div>
  )

  return (
    <motion.div
      initial={{ x: 320 }}
      animate={{ x: 0 }}
      exit={{ x: 320 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      style={{
        position: 'fixed', top: 0, right: 0, height: '100vh', width: '300px',
        background: panelBg, zIndex: 100,
        display: 'flex', flexDirection: 'column',
        borderLeft: `1.5px solid ${borderCol}`,
        overflowY: 'auto',
      }}
    >
      {/* Header */}
      <div style={{
        height: '52px', background: headerBg,
        borderBottom: `1.5px solid ${borderCol}`,
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', padding: '0 12px', flexShrink: 0,
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        {/* View / Edit toggle */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '2px',
          background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
          borderRadius: '8px', padding: '3px',
        }}>
          <button
            onClick={onViewProfile}
            style={{
              height: '28px', padding: '0 12px', borderRadius: '6px', border: 'none',
              fontSize: '12px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
              background: 'transparent',
              color: isDark ? '#7A6A52' : '#9A6C3C',
              transition: 'background 0.15s, color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
          >
            View
          </button>
          <div style={{
            height: '28px', padding: '0 12px', borderRadius: '6px',
            fontSize: '12px', fontWeight: 600,
            background: isDark ? '#2A2018' : '#FFFFFF',
            color: isDark ? '#EDE8E3' : '#431407',
            display: 'flex', alignItems: 'center',
            boxShadow: isDark ? '0 1px 4px rgba(0,0,0,0.4)' : '0 1px 4px rgba(0,0,0,0.10)',
          }}>
            Edit
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <AnimatePresence>
            {isDirty && saveState === 'idle' && (
              <motion.div
                initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0 }}
                style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#EA580C' }}
                title="Unsaved changes"
              />
            )}
          </AnimatePresence>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', color: labelCol }}>
            <IconX size={18} />
          </button>
        </div>
      </div>

      {/* Photo */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 16px 0' }}>
        <div
          onClick={() => fileInputRef.current?.click()}
          onMouseEnter={() => setPhotoHovered(true)}
          onMouseLeave={() => setPhotoHovered(false)}
          style={{
            width: '80px', height: '80px', borderRadius: '6px',
            background: btn1Bg, border: `2px dashed ${photoHovered ? '#FB923C' : borderCol}`,
            overflow: 'hidden', cursor: 'pointer', position: 'relative',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            transition: 'border-color 0.15s ease',
          }}
        >
          {photoUploading ? (
            <IconLoader2 size={20} color="#EA580C" style={{ animation: 'spin 0.8s linear infinite' }} />
          ) : draft.photoUrl ? (
            <>
              <img src={draft.photoUrl} alt="photo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{
                position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.42)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: photoHovered ? 1 : 0, transition: 'opacity 0.15s ease',
              }}>
                <IconCamera size={18} color="white" />
              </div>
            </>
          ) : (
            <>
              <IconCamera size={20} color={photoHovered ? '#FB923C' : '#D97706'} style={{ transition: 'color 0.15s' }} />
              <span style={{ fontSize: '9px', color: photoHovered ? '#FB923C' : '#D97706', marginTop: '3px', transition: 'color 0.15s' }}>Add photo</span>
            </>
          )}
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }}
          onChange={async e => {
            const file = e.target.files?.[0]
            if (!file) return
            setPhotoUploading(true)
            try {
              const dataUrl = await compressPhoto(file)
              setDraft(p => ({ ...p, photoUrl: dataUrl }))
            } finally {
              setPhotoUploading(false)
              e.target.value = ''
            }
          }}
        />
        {draft.photoUrl && (
          <button onClick={() => setDraft(p => ({ ...p, photoUrl: undefined }))}
            style={{ marginTop: '5px', background: 'none', border: 'none', fontSize: '10px', color: mutedCol, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px', padding: 0 }}>
            <IconTrash size={10} /> Remove photo
          </button>
        )}
      </div>

      {/* ── IDENTITY ── */}
      {sectionHeader('Identity')}
      <div style={{ padding: '12px 16px 4px', display: 'flex', flexDirection: 'column', gap: '10px' }}>

        {/* Full name */}
        <div>
          <label style={labelStyle}>Full name *</label>
          <input
            ref={nameInputRef}
            value={draft.fullName}
            onChange={e => { setDraft(p => ({ ...p, fullName: e.target.value })); setNameError('') }}
            onFocus={() => setFocused('name')} onBlur={() => setFocused(null)}
            placeholder="Enter full name"
            style={inputStyle('name')}
          />
          <AnimatePresence>
            {nameError && (
              <motion.span initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={{ fontSize: '11px', color: '#EF4444', marginTop: '4px', display: 'block' }}>
                {nameError}
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Nickname */}
        <div>
          <label style={labelStyle}>Nickname / Known as</label>
          <input
            value={draft.nickname}
            onChange={e => setDraft(p => ({ ...p, nickname: e.target.value }))}
            onFocus={() => setFocused('nickname')} onBlur={() => setFocused(null)}
            placeholder="e.g. Bablu, Pinky"
            style={inputStyle('nickname')}
          />
        </div>

        {/* Gender */}
        <div>
          <label style={labelStyle}>Gender</label>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {GENDERS.map(g => (
              <button
                key={g.value}
                onClick={() => setDraft(p => ({ ...p, gender: p.gender === g.value ? '' : g.value }))}
                style={{
                  height: '30px', padding: '0 12px', borderRadius: '6px', border: 'none',
                  fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit',
                  background: draft.gender === g.value
                    ? '#EA580C'
                    : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'),
                  color: draft.gender === g.value ? '#fff' : textCol,
                  transition: 'background 0.15s, color 0.15s',
                }}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── DATES ── */}
      {sectionHeader('Dates')}
      <div style={{ padding: '12px 16px 4px', display: 'flex', flexDirection: 'column', gap: '10px' }}>

        {/* Birth year + Deceased toggle */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Birth year</label>
            <input type="number" value={draft.birthYear}
              onChange={e => setDraft(p => ({ ...p, birthYear: e.target.value }))}
              onFocus={() => setFocused('birth')} onBlur={() => setFocused(null)}
              placeholder="YYYY" style={inputStyle('birth')} />
          </div>
          <div style={{ paddingBottom: '8px', flexShrink: 0 }}>
            <span style={{ ...labelStyle, marginBottom: '6px' }}>Deceased</span>
            <div
              onClick={() => setDraft(p => ({ ...p, isDeceased: !p.isDeceased, deathYear: !p.isDeceased ? p.deathYear : '' }))}
              style={{
                width: '36px', height: '20px', borderRadius: '10px',
                background: draft.isDeceased ? '#EA580C' : (isDark ? '#2A2520' : '#E5E7EB'),
                position: 'relative', cursor: 'pointer', transition: 'background 0.2s ease',
              }}
            >
              <div style={{
                position: 'absolute', top: '2px', left: draft.isDeceased ? '18px' : '2px',
                width: '16px', height: '16px', borderRadius: '50%', background: 'white',
                transition: 'left 0.2s ease', boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
              }} />
            </div>
          </div>
        </div>

        {/* Birth place */}
        <div>
          <label style={labelStyle}>Birth place</label>
          <input value={draft.birthPlace}
            onChange={e => setDraft(p => ({ ...p, birthPlace: e.target.value }))}
            onFocus={() => setFocused('birthPlace')} onBlur={() => setFocused(null)}
            placeholder="City or village"
            style={inputStyle('birthPlace')} />
        </div>

        {/* Death year */}
        <AnimatePresence>
          {draft.isDeceased && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}
            >
              <label style={labelStyle}>Year of death</label>
              <input type="number" value={draft.deathYear}
                onChange={e => setDraft(p => ({ ...p, deathYear: e.target.value }))}
                onFocus={() => setFocused('death')} onBlur={() => setFocused(null)}
                placeholder="YYYY" style={{ ...inputStyle('death'), maxWidth: '120px' }} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── HERITAGE ── */}
      {sectionHeader('Heritage')}
      <div style={{ padding: '12px 16px 4px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div>
          <label style={labelStyle}>Gotra</label>
          <input value={draft.gotra}
            onChange={e => setDraft(p => ({ ...p, gotra: e.target.value }))}
            onFocus={() => setFocused('gotra')} onBlur={() => setFocused(null)}
            placeholder="e.g. Kashyap, Bhardwaj"
            style={inputStyle('gotra')} />
        </div>
        <div>
          <label style={labelStyle}>Native village / town</label>
          <input value={draft.nativeVillage}
            onChange={e => setDraft(p => ({ ...p, nativeVillage: e.target.value }))}
            onFocus={() => setFocused('nativeVillage')} onBlur={() => setFocused(null)}
            placeholder="Ancestral home"
            style={inputStyle('nativeVillage')} />
        </div>
      </div>

      {/* ── LOCATION ── */}
      {sectionHeader('Current location')}
      <div style={{ padding: '12px 16px 4px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div>
          <label style={labelStyle}>City</label>
          <input value={draft.currentCity}
            onChange={e => setDraft(p => ({ ...p, currentCity: e.target.value }))}
            onFocus={() => setFocused('city')} onBlur={() => setFocused(null)}
            placeholder="Current city"
            style={inputStyle('city')} />
        </div>
        <div>
          <label style={labelStyle}>Country</label>
          <input value={draft.currentCountry}
            onChange={e => setDraft(p => ({ ...p, currentCountry: e.target.value }))}
            onFocus={() => setFocused('country')} onBlur={() => setFocused(null)}
            placeholder="e.g. India"
            style={inputStyle('country')} />
        </div>
      </div>

      {/* ── WORK & EDUCATION ── */}
      {sectionHeader('Work & Education')}
      <div style={{ padding: '12px 16px 4px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div>
          <label style={labelStyle}>Occupation</label>
          <input value={draft.occupation}
            onChange={e => setDraft(p => ({ ...p, occupation: e.target.value }))}
            onFocus={() => setFocused('occupation')} onBlur={() => setFocused(null)}
            placeholder="e.g. Engineer, Farmer"
            style={inputStyle('occupation')} />
        </div>
        <div>
          <label style={labelStyle}>Education</label>
          <input value={draft.education}
            onChange={e => setDraft(p => ({ ...p, education: e.target.value }))}
            onFocus={() => setFocused('education')} onBlur={() => setFocused(null)}
            placeholder="Highest qualification"
            style={inputStyle('education')} />
        </div>
        <div>
          <label style={labelStyle}>Bio</label>
          <textarea
            value={draft.bio}
            onChange={e => setDraft(p => ({ ...p, bio: e.target.value }))}
            onFocus={() => setFocused('bio')} onBlur={() => setFocused(null)}
            placeholder="A short note about this person…"
            rows={3}
            style={{
              ...inputStyle('bio'), height: 'auto', padding: '8px 10px',
              resize: 'vertical', lineHeight: '1.5',
            }}
          />
        </div>
      </div>

      {/* ── Save ── */}
      <div style={{ padding: '16px 16px 8px' }}>
        <motion.button
          onClick={handleSave}
          disabled={saveState === 'saving' || saveState === 'saved'}
          whileHover={isDirty && saveState === 'idle' ? { scale: 1.015 } : {}}
          whileTap={isDirty && saveState === 'idle' ? { scale: 0.975 } : {}}
          style={{
            width: '100%', height: '40px', borderRadius: '8px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
            cursor: saveState !== 'idle' ? 'default' : 'pointer',
            fontSize: '13px', fontWeight: 600, border: 'none', fontFamily: 'inherit',
            background: saveBg, color: saveTextCol,
            transition: 'background 0.25s ease, color 0.25s ease',
          }}
        >
          {saveState === 'saving' && (
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}>
              <IconLoader2 size={15} />
            </motion.div>
          )}
          {saveState === 'saved' && <IconCheck size={15} strokeWidth={2.5} />}
          {saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Saved' : 'Save changes'}
        </motion.button>
        <AnimatePresence>
          {isDirty && saveState === 'idle' && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ fontSize: '10px', color: mutedCol, textAlign: 'center', margin: '6px 0 0', letterSpacing: '0.04em' }}>
              Ctrl + S to save
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* ── Connect family ── */}
      {sectionHeader('Connect family')}
      <div style={{ padding: '12px 16px 28px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <button
          onClick={() => withAutoSave(() => onAddParent(node.id))}
          style={{
            width: '100%', height: '38px', borderRadius: '8px',
            display: 'flex', alignItems: 'center', gap: '10px',
            cursor: 'pointer', fontSize: '12.5px', fontWeight: 500,
            border: `1px solid transparent`, fontFamily: 'inherit',
            background: btn1Bg, color: '#C2410C', padding: '0 14px',
            transition: 'border-color 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = '#EA580C44')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'transparent')}
        >
          <IconArrowUp size={15} /> Add parent
        </button>
        <button
          onClick={() => withAutoSave(() => onAddChild(node.id))}
          style={{
            width: '100%', height: '38px', borderRadius: '8px',
            display: 'flex', alignItems: 'center', gap: '10px',
            cursor: 'pointer', fontSize: '12.5px', fontWeight: 500,
            border: `1px solid transparent`, fontFamily: 'inherit',
            background: btn2Bg, color: '#9A3412', padding: '0 14px',
            transition: 'border-color 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = '#C2410C44')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'transparent')}
        >
          <IconArrowDown size={15} /> Add child
        </button>
        <button
          onClick={() => withAutoSave(() => { onAddSpouse(node.id); onClose() })}
          style={{
            width: '100%', height: '38px', borderRadius: '8px',
            display: 'flex', alignItems: 'center', gap: '10px',
            cursor: 'pointer', fontSize: '12.5px', fontWeight: 500,
            border: `1px solid transparent`, fontFamily: 'inherit',
            background: btn3Bg, color: '#D97706', padding: '0 14px',
            transition: 'border-color 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = '#D9770644')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'transparent')}
        >
          <IconHeart size={15} /> Add spouse / partner
        </button>
      </div>
    </motion.div>
  )
}
