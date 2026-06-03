'use client'

import { useRef, useState, useEffect, useCallback, Fragment } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGraphStore } from '@/store/graphStore'
import {
  IconX, IconCamera, IconArrowUp, IconArrowDown,
  IconHeart, IconCheck, IconLoader2, IconTrash,
} from '@tabler/icons-react'
import type { Node } from '@xyflow/react'
import type { PersonData, SavePayload } from '@/types'
import { getTheme } from '@/lib/theme'
import { api } from '@/lib/api'

interface NodePanelProps {
  node: Node
  onClose: () => void
  onViewProfile?: () => void
  onUpdate: (id: string, data: Partial<PersonData>) => void
  onAddParent: (name: string) => Promise<void>
  onAddChild: (name: string) => Promise<void>
  onAddSpouse: (name: string) => Promise<void>
  onSave?: (id: string, data: SavePayload) => Promise<void>
}

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

type SaveState = 'idle' | 'saving' | 'saved'

const GENDERS = [
  { value: 'male',    label: 'Male' },
  { value: 'female',  label: 'Female' },
  { value: 'other',   label: 'Other' },
  { value: 'unknown', label: 'Unknown' },
]

function initDraft(d: PersonData) {
  return {
    fullName:         d.fullName ?? '',
    firstName:        d.firstName ?? '',
    middleName:       d.middleName ?? '',
    lastName:         d.lastName ?? '',
    nameNative:       d.nameNative ?? '',
    nickname:         d.nickname ?? '',
    gender:           d.gender ?? '',
    gotra:            d.gotra ?? '',
    religion:         d.religion ?? '',

    birthDate:        d.birthDate ?? '',
    birthYear:        d.birthYear ? String(d.birthYear) : '',
    birthPlace:       d.birthPlace ?? '',
    isDeceased:       Boolean(d.isDeceased),
    deathDate:        d.deathDate ?? '',
    deathYear:        d.deathYear ? String(d.deathYear) : '',
    deathPlace:       d.deathPlace ?? '',

    phone:            d.phone ?? '',
    whatsapp:         d.whatsapp ?? '',
    email:            d.email ?? '',

    currentAddress:   d.currentAddress ?? '',
    currentCity:      d.currentCity ?? '',
    currentState:     d.currentState ?? '',
    currentCountry:   d.currentCountry ?? '',
    currentPincode:   d.currentPincode ?? '',

    nativeVillage:    d.nativeVillage ?? '',
    nativeTehsil:     d.nativeTehsil ?? '',
    nativeDistrict:   d.nativeDistrict ?? '',
    nativeState:      d.nativeState ?? '',
    nativeCountry:    d.nativeCountry ?? '',

    occupation:       d.occupation ?? '',
    occupationDetail: d.occupationDetail ?? '',
    education:        d.education ?? '',
    bio:              d.bio ?? '',

    photoUrl:         d.photoUrl as string | undefined,
  }
}

type Draft = ReturnType<typeof initDraft>

export default function NodePanel({ node, onClose, onViewProfile, onUpdate, onAddParent, onAddChild, onAddSpouse, onSave }: NodePanelProps) {
  const { isDark } = useGraphStore()
  const d = node.data as unknown as PersonData
  const canEditProfile = d.isSelf || (d.canEditProfile ?? false)

  const [draft, setDraft] = useState<Draft>(() => initDraft(d))
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [nameError, setNameError] = useState('')
  const [inviteCode, setInviteCode] = useState<string | null>(null)
  const [inviteGenerating, setInviteGenerating] = useState(false)
  const [inviteCopied, setInviteCopied] = useState(false)
  const [focused, setFocused] = useState<string | null>(null)
  const [photoHovered, setPhotoHovered] = useState(false)
  const [photoUploading, setPhotoUploading] = useState(false)

  const [pendingAdd, setPendingAdd]         = useState<'parent' | 'child' | 'spouse' | null>(null)
  const [pendingName, setPendingName]       = useState('')
  const [pendingNameErr, setPendingNameErr] = useState('')
  const [pendingAdding, setPendingAdding]   = useState(false)

  const fileInputRef    = useRef<HTMLInputElement>(null)
  const nameInputRef    = useRef<HTMLInputElement>(null)
  const pendingNameRef  = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (d.fullName !== 'Unknown') return
    const id = setTimeout(() => { nameInputRef.current?.focus(); nameInputRef.current?.select() }, 120)
    return () => clearTimeout(id)
  }, [d.fullName])

  const str = (v: string) => v.trim() || null

  const orig = initDraft(d)
  const isDirty = (Object.keys(draft) as (keyof Draft)[]).some(k => draft[k] !== orig[k])

  const commitDraft = useCallback(() => {
    onUpdate(node.id, {
      fullName:         draft.fullName.trim(),
      firstName:        str(draft.firstName) ?? undefined,
      middleName:       str(draft.middleName) ?? undefined,
      lastName:         str(draft.lastName) ?? undefined,
      nameNative:       str(draft.nameNative) ?? undefined,
      nickname:         str(draft.nickname) ?? undefined,
      gender:           draft.gender || undefined,
      gotra:            str(draft.gotra) ?? undefined,
      religion:         str(draft.religion) ?? undefined,
      birthDate:        str(draft.birthDate) ?? undefined,
      birthYear:        draft.birthYear ? parseInt(draft.birthYear) : undefined,
      birthPlace:       str(draft.birthPlace) ?? undefined,
      isDeceased:       draft.isDeceased,
      isAlive:          !draft.isDeceased,
      deathDate:        draft.isDeceased ? (str(draft.deathDate) ?? undefined) : undefined,
      deathYear:        draft.isDeceased && draft.deathYear ? parseInt(draft.deathYear) : undefined,
      deathPlace:       draft.isDeceased ? (str(draft.deathPlace) ?? undefined) : undefined,
      phone:            str(draft.phone) ?? undefined,
      whatsapp:         str(draft.whatsapp) ?? undefined,
      email:            str(draft.email) ?? undefined,
      currentAddress:   str(draft.currentAddress) ?? undefined,
      currentCity:      str(draft.currentCity) ?? undefined,
      currentState:     str(draft.currentState) ?? undefined,
      currentCountry:   str(draft.currentCountry) ?? undefined,
      currentPincode:   str(draft.currentPincode) ?? undefined,
      nativeVillage:    str(draft.nativeVillage) ?? undefined,
      nativeTehsil:     str(draft.nativeTehsil) ?? undefined,
      nativeDistrict:   str(draft.nativeDistrict) ?? undefined,
      nativeState:      str(draft.nativeState) ?? undefined,
      nativeCountry:    str(draft.nativeCountry) ?? undefined,
      occupation:       str(draft.occupation) ?? undefined,
      occupationDetail: str(draft.occupationDetail) ?? undefined,
      education:        str(draft.education) ?? undefined,
      bio:              str(draft.bio) ?? undefined,
      photoUrl:         draft.photoUrl,
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
      fullName:         draft.fullName.trim(),
      firstName:        str(draft.firstName),
      middleName:       str(draft.middleName),
      lastName:         str(draft.lastName),
      nameNative:       str(draft.nameNative),
      nickname:         str(draft.nickname),
      gender:           draft.gender || null,
      gotra:            str(draft.gotra),
      religion:         str(draft.religion),
      birthDate:        str(draft.birthDate),
      birthYear:        draft.birthYear ? parseInt(draft.birthYear) : null,
      birthPlace:       str(draft.birthPlace),
      isDeceased:       draft.isDeceased,
      isAlive:          !draft.isDeceased,
      deathDate:        draft.isDeceased ? str(draft.deathDate) : null,
      deathYear:        draft.isDeceased && draft.deathYear ? parseInt(draft.deathYear) : null,
      deathPlace:       draft.isDeceased ? str(draft.deathPlace) : null,
      phone:            str(draft.phone),
      whatsapp:         str(draft.whatsapp),
      email:            str(draft.email),
      currentAddress:   str(draft.currentAddress),
      currentCity:      str(draft.currentCity),
      currentState:     str(draft.currentState),
      currentCountry:   str(draft.currentCountry),
      currentPincode:   str(draft.currentPincode),
      nativeVillage:    str(draft.nativeVillage),
      nativeTehsil:     str(draft.nativeTehsil),
      nativeDistrict:   str(draft.nativeDistrict),
      nativeState:      str(draft.nativeState),
      nativeCountry:    str(draft.nativeCountry),
      occupation:       str(draft.occupation),
      occupationDetail: str(draft.occupationDetail),
      education:        str(draft.education),
      bio:              str(draft.bio),
      photoUrl:         draft.photoUrl ?? null,
    }
    try {
      if (onSave) await onSave(node.id, payload)
      commitDraft()
      setSaveState('saved')
    } catch (err: unknown) {
      setSaveState('idle')
      setNameError(err instanceof Error ? err.message : 'Save failed')
    }
  }, [draft, node.id, onSave, commitDraft])

  useEffect(() => {
    if (saveState !== 'saved') return
    const id = setTimeout(() => setSaveState('idle'), 2000)
    return () => clearTimeout(id)
  }, [saveState])

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

  const handleGenerateInvite = useCallback(async () => {
    setInviteGenerating(true)
    try {
      const { invite_token } = await api.persons.generateInvite(node.id)
      setInviteCode(invite_token)
    } catch (err: unknown) {
      console.error(err)
    } finally {
      setInviteGenerating(false)
    }
  }, [node.id])

  useEffect(() => {
    if (!inviteCopied) return
    const id = setTimeout(() => setInviteCopied(false), 2000)
    return () => clearTimeout(id)
  }, [inviteCopied])

  const handleCopyInvite = useCallback(async () => {
    if (!inviteCode) return
    try { await navigator.clipboard.writeText(inviteCode) } catch { /* clipboard unavailable */ }
    setInviteCopied(true)
  }, [inviteCode])

  const withAutoSave = (action: () => void) => {
    if (isDirty && draft.fullName.trim()) commitDraft()
    action()
  }

  // ── theme ──────────────────────────────────────────────────────────
  const t        = getTheme(isDark)
  const labelCol = isDark ? '#7A6A52' : '#9A3412'
  const btn1Bg   = isDark ? '#2A1A12' : '#FFF3E8'
  const btn2Bg   = isDark ? '#251510' : '#FFF3E8'
  const btn3Bg   = isDark ? '#221C10' : '#FFF8F0'

  const saveBg = saveState === 'saved'
    ? (isDark ? '#14401A' : '#DCFCE7')
    : isDirty
      ? '#EA580C'
      : (isDark ? '#221A10' : '#FFF3E8')
  const saveTextCol = saveState === 'saved'
    ? (isDark ? '#4ADE80' : '#16A34A')
    : isDirty ? '#FFFFFF' : t.textMuted

  const set = (key: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setDraft(p => ({ ...p, [key]: e.target.value }))

  const inputStyle = (key: string): React.CSSProperties => ({
    width: '100%', height: '36px',
    border: `1.5px solid ${nameError && key === 'fullName' ? '#EF4444' : focused === key ? '#FB923C' : t.border}`,
    borderRadius: '8px', padding: '0 10px', fontSize: '13px',
    color: t.text, background: t.inputBg, outline: 'none',
    fontFamily: 'inherit', boxSizing: 'border-box',
    transition: 'border-color 0.15s ease',
  })

  const labelStyle: React.CSSProperties = {
    fontSize: '10px', textTransform: 'uppercase',
    letterSpacing: '0.08em', color: labelCol,
    marginBottom: '5px', display: 'block',
  }

  const field = (label: string, key: keyof Draft, placeholder: string, opts?: { type?: string; half?: boolean }) => (
    <div style={opts?.half ? { flex: 1, minWidth: 0 } : {}}>
      <label style={labelStyle}>{label}</label>
      <input
        type={opts?.type ?? 'text'}
        value={draft[key] as string}
        onChange={set(key)}
        onFocus={() => setFocused(key)} onBlur={() => setFocused(null)}
        placeholder={placeholder}
        style={inputStyle(key)}
      />
    </div>
  )

  const sectionHeader = (title: string) => (
    <div style={{
      fontSize: '9.5px', fontWeight: 600, letterSpacing: '0.10em',
      textTransform: 'uppercase', color: t.textMuted,
      padding: '10px 16px 6px',
      borderTop: `1px solid ${t.border}`,
      background: t.sectionBg,
      marginTop: '4px',
    }}>
      {title}
    </div>
  )

  const row = (...children: React.ReactNode[]) => (
    <div style={{ display: 'flex', gap: '10px' }}>
      {children.map((child, i) => <Fragment key={i}>{child}</Fragment>)}
    </div>
  )

  return (
    <motion.div
      initial={{ x: 320 }}
      animate={{ x: 0 }}
      exit={{ x: 320 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      style={{
        position: 'fixed', top: 0, right: 0, height: '100vh', width: '320px',
        background: t.panelBg, zIndex: 100,
        display: 'flex', flexDirection: 'column',
        borderLeft: `1.5px solid ${t.border}`,
        overflowY: 'auto',
      }}
    >
      {/* ── Header ── */}
      <div style={{
        height: '52px', background: t.cardBg,
        borderBottom: `1.5px solid ${t.border}`,
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', padding: '0 12px', flexShrink: 0,
        position: 'sticky', top: 0, zIndex: 10,
      }}>
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
              background: 'transparent', color: isDark ? '#7A6A52' : '#9A6C3C',
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

      {/* Read-only notice */}
      {!canEditProfile && (
        <div style={{
          margin: '14px 16px 0', padding: '10px 14px', borderRadius: '10px',
          background: isDark ? 'rgba(255,255,255,0.04)' : '#FFF7ED',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#FDE8CC'}`,
        }}>
          <p style={{ margin: 0, fontSize: '12px', color: isDark ? '#7A6A52' : '#9A6C3C', lineHeight: 1.55 }}>
            Only <strong>{d.fullName?.split(' ')[0] ?? 'this person'}</strong> can edit their profile.
            You can still connect them to family members below.
          </p>
        </div>
      )}

      {canEditProfile && (<>

        {/* ── Photo ── */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 16px 0' }}>
          <div
            onClick={() => fileInputRef.current?.click()}
            onMouseEnter={() => setPhotoHovered(true)}
            onMouseLeave={() => setPhotoHovered(false)}
            style={{
              width: '80px', height: '80px', borderRadius: '6px',
              background: btn1Bg, border: `2px dashed ${photoHovered ? '#FB923C' : t.border}`,
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
              style={{ marginTop: '5px', background: 'none', border: 'none', fontSize: '10px', color: t.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px', padding: 0 }}>
              <IconTrash size={10} /> Remove photo
            </button>
          )}
        </div>

        {/* ── IDENTITY ── */}
        {sectionHeader('Identity')}
        <div style={{ padding: '12px 16px 4px', display: 'flex', flexDirection: 'column', gap: '10px' }}>

          <div>
            <label style={labelStyle}>Full name *</label>
            <input
              ref={nameInputRef}
              value={draft.fullName}
              onChange={e => { setDraft(p => ({ ...p, fullName: e.target.value })); setNameError('') }}
              onFocus={() => setFocused('fullName')} onBlur={() => setFocused(null)}
              placeholder="Enter full name"
              style={inputStyle('fullName')}
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

          {row(
            field('First name', 'firstName', 'First', { half: true }),
            field('Middle name', 'middleName', 'Middle', { half: true }),
          )}
          {row(
            field('Last name', 'lastName', 'Last', { half: true }),
            field('Native name', 'nameNative', 'नाम', { half: true }),
          )}
          {field('Nickname / Known as', 'nickname', 'e.g. Bablu, Pinky')}

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
                    color: draft.gender === g.value ? '#fff' : t.text,
                    transition: 'background 0.15s, color 0.15s',
                  }}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          {row(
            field('Gotra', 'gotra', 'e.g. Kashyap', { half: true }),
            field('Religion', 'religion', 'e.g. Hindu', { half: true }),
          )}
        </div>

        {/* ── BIRTH & DEATH ── */}
        {sectionHeader('Birth & Death')}
        <div style={{ padding: '12px 16px 4px', display: 'flex', flexDirection: 'column', gap: '10px' }}>

          {row(
            field('Birth date', 'birthDate', 'YYYY-MM-DD', { half: true }),
            field('Birth year', 'birthYear', 'YYYY', { type: 'number', half: true }),
          )}
          {field('Birth place', 'birthPlace', 'City or village')}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={labelStyle}>Deceased</span>
            <div
              onClick={() => setDraft(p => ({ ...p, isDeceased: !p.isDeceased, deathDate: '', deathYear: '', deathPlace: '' }))}
              style={{
                width: '36px', height: '20px', borderRadius: '10px',
                background: draft.isDeceased ? '#EA580C' : (isDark ? '#2A2520' : '#E5E7EB'),
                position: 'relative', cursor: 'pointer', transition: 'background 0.2s ease',
                flexShrink: 0,
              }}
            >
              <div style={{
                position: 'absolute', top: '2px', left: draft.isDeceased ? '18px' : '2px',
                width: '16px', height: '16px', borderRadius: '50%', background: 'white',
                transition: 'left 0.2s ease', boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
              }} />
            </div>
          </div>

          <AnimatePresence>
            {draft.isDeceased && (
              <motion.div
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '10px' }}
              >
                {row(
                  field('Death date', 'deathDate', 'YYYY-MM-DD', { half: true }),
                  field('Death year', 'deathYear', 'YYYY', { type: 'number', half: true }),
                )}
                {field('Death place', 'deathPlace', 'City or village')}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── CONTACT ── */}
        {sectionHeader('Contact')}
        <div style={{ padding: '12px 16px 4px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {field('Phone', 'phone', '+91 98765 43210', { type: 'tel' })}
          {field('WhatsApp', 'whatsapp', '+91 98765 43210', { type: 'tel' })}
          {field('Email', 'email', 'name@example.com', { type: 'email' })}
        </div>

        {/* ── CURRENT LOCATION ── */}
        {sectionHeader('Current Location')}
        <div style={{ padding: '12px 16px 4px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {field('Address', 'currentAddress', 'Street / apartment')}
          {row(
            field('City', 'currentCity', 'City', { half: true }),
            field('State', 'currentState', 'State', { half: true }),
          )}
          {row(
            field('Country', 'currentCountry', 'India', { half: true }),
            field('Pincode', 'currentPincode', '000000', { half: true }),
          )}
        </div>

        {/* ── NATIVE / ORIGIN ── */}
        {sectionHeader('Native / Origin')}
        <div style={{ padding: '12px 16px 4px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {row(
            field('Village', 'nativeVillage', 'Ancestral village', { half: true }),
            field('Tehsil', 'nativeTehsil', 'Tehsil', { half: true }),
          )}
          {row(
            field('District', 'nativeDistrict', 'District', { half: true }),
            field('State', 'nativeState', 'State', { half: true }),
          )}
          {field('Country', 'nativeCountry', 'India')}
        </div>

        {/* ── WORK & EDUCATION ── */}
        {sectionHeader('Work & Education')}
        <div style={{ padding: '12px 16px 4px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {field('Occupation', 'occupation', 'e.g. Engineer, Farmer')}
          {field('Occupation detail', 'occupationDetail', 'Company / more detail')}
          {field('Education', 'education', 'Highest qualification')}
          <div>
            <label style={labelStyle}>Bio</label>
            <textarea
              value={draft.bio}
              onChange={set('bio')}
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
                style={{ fontSize: '10px', color: t.textMuted, textAlign: 'center', margin: '6px 0 0', letterSpacing: '0.04em' }}>
                Ctrl + S to save
              </motion.p>
            )}
          </AnimatePresence>
        </div>

      </>)}

      {/* ── Connect family ── */}
      {sectionHeader('Connect family')}
      <div style={{ padding: '12px 16px 28px', display: 'flex', flexDirection: 'column', gap: '6px' }}>

        {/* Relation type buttons — hidden when a form is open */}
        {!pendingAdd && (<>
          <button
            onClick={() => { withAutoSave(() => {}); setPendingAdd('parent'); setPendingName(''); setPendingNameErr(''); setTimeout(() => pendingNameRef.current?.focus(), 50) }}
            style={{ width: '100%', height: '38px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '12.5px', fontWeight: 500, border: '1px solid transparent', fontFamily: 'inherit', background: btn1Bg, color: '#C2410C', padding: '0 14px', transition: 'border-color 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = '#EA580C44')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'transparent')}
          >
            <IconArrowUp size={15} /> Add parent
          </button>
          <button
            onClick={() => { withAutoSave(() => {}); setPendingAdd('child'); setPendingName(''); setPendingNameErr(''); setTimeout(() => pendingNameRef.current?.focus(), 50) }}
            style={{ width: '100%', height: '38px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '12.5px', fontWeight: 500, border: '1px solid transparent', fontFamily: 'inherit', background: btn2Bg, color: '#9A3412', padding: '0 14px', transition: 'border-color 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = '#C2410C44')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'transparent')}
          >
            <IconArrowDown size={15} /> Add child
          </button>
          <button
            onClick={() => { withAutoSave(() => {}); setPendingAdd('spouse'); setPendingName(''); setPendingNameErr(''); setTimeout(() => pendingNameRef.current?.focus(), 50) }}
            style={{ width: '100%', height: '38px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '12.5px', fontWeight: 500, border: '1px solid transparent', fontFamily: 'inherit', background: btn3Bg, color: '#D97706', padding: '0 14px', transition: 'border-color 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = '#D9770644')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'transparent')}
          >
            <IconHeart size={15} /> Add spouse / partner
          </button>
        </>)}

        {/* Inline name form — shown when a relation type is selected */}
        {pendingAdd && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '6px 0' }}>
            <p style={{ margin: 0, fontSize: '11px', color: labelCol, textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600 }}>
              {pendingAdd === 'parent' ? 'Adding parent' : pendingAdd === 'child' ? 'Adding child' : 'Adding spouse'}
            </p>

            <div>
              <label style={labelStyle}>Full name <span style={{ color: '#EF4444' }}>*</span></label>
              <input
                ref={pendingNameRef}
                value={pendingName}
                onChange={e => { setPendingName(e.target.value); setPendingNameErr('') }}
                onKeyDown={async e => {
                  if (e.key === 'Enter') {
                    if (!pendingName.trim()) { setPendingNameErr('Name is required'); return }
                    setPendingAdding(true)
                    try {
                      if (pendingAdd === 'parent')  await onAddParent(pendingName.trim())
                      else if (pendingAdd === 'child')   await onAddChild(pendingName.trim())
                      else if (pendingAdd === 'spouse') { await onAddSpouse(pendingName.trim()); onClose() }
                      setPendingAdd(null)
                    } catch (err: unknown) {
                      setPendingNameErr(err instanceof Error ? err.message : 'Failed')
                      setPendingAdding(false)
                    }
                  }
                  if (e.key === 'Escape') setPendingAdd(null)
                }}
                placeholder="Enter full name"
                style={inputStyle('pendingName')}
              />
              {pendingNameErr && (
                <span style={{ fontSize: '11px', color: '#EF4444', marginTop: '4px', display: 'block' }}>{pendingNameErr}</span>
              )}
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setPendingAdd(null)}
                disabled={pendingAdding}
                style={{ flex: 1, height: '34px', borderRadius: '8px', border: `1px solid ${t.border}`, background: 'transparent', cursor: 'pointer', fontSize: '12px', fontFamily: 'inherit', color: t.textMuted }}
              >
                Cancel
              </button>
              <button
                disabled={pendingAdding}
                onClick={async () => {
                  if (!pendingName.trim()) { setPendingNameErr('Name is required'); pendingNameRef.current?.focus(); return }
                  setPendingAdding(true)
                  setPendingNameErr('')
                  try {
                    if (pendingAdd === 'parent')       await onAddParent(pendingName.trim())
                    else if (pendingAdd === 'child')   await onAddChild(pendingName.trim())
                    else if (pendingAdd === 'spouse') { await onAddSpouse(pendingName.trim()); onClose() }
                    setPendingAdd(null)
                  } catch (err: unknown) {
                    setPendingNameErr(err instanceof Error ? err.message : 'Failed')
                    setPendingAdding(false)
                  }
                }}
                style={{
                  flex: 2, height: '34px', borderRadius: '8px', border: 'none',
                  background: pendingAdding ? '#F0A070' : '#EA580C',
                  color: '#fff', fontSize: '12px', fontWeight: 600,
                  fontFamily: 'inherit', cursor: pendingAdding ? 'default' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                }}
              >
                {pendingAdding
                  ? <><motion.div animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}><IconLoader2 size={13} /></motion.div> Creating…</>
                  : `Create ${pendingAdd}`
                }
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Invite to claim ── */}
      {d.canInvite && (
        <>
          {sectionHeader('Invite to claim')}
          <div style={{ padding: '12px 16px 28px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {!inviteCode ? (
              <motion.button
                onClick={handleGenerateInvite}
                disabled={inviteGenerating}
                whileHover={!inviteGenerating ? { scale: 1.015 } : {}}
                whileTap={!inviteGenerating ? { scale: 0.975 } : {}}
                style={{
                  width: '100%', height: '38px', borderRadius: '8px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  cursor: inviteGenerating ? 'default' : 'pointer',
                  fontSize: '12.5px', fontWeight: 500, border: 'none', fontFamily: 'inherit',
                  background: isDark ? '#1A2A1A' : '#F0FDF4',
                  color: isDark ? '#4ADE80' : '#16A34A',
                  opacity: inviteGenerating ? 0.6 : 1,
                }}
              >
                {inviteGenerating
                  ? <><motion.div animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}><IconLoader2 size={14} /></motion.div> Generating…</>
                  : '⚡ Generate invite code'
                }
              </motion.button>
            ) : (
              <>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  background: isDark ? '#1A2A1A' : '#F0FDF4',
                  border: `1.5px solid ${isDark ? '#14532D' : '#BBF7D0'}`,
                  borderRadius: '8px', padding: '0 12px', height: '42px',
                }}>
                  <span style={{
                    flex: 1, fontFamily: 'monospace', fontSize: '15px',
                    fontWeight: 700, letterSpacing: '0.12em',
                    color: isDark ? '#4ADE80' : '#15803D',
                  }}>
                    {inviteCode}
                  </span>
                  <button
                    onClick={handleCopyInvite}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
                      color: isDark ? '#4ADE80' : '#16A34A', fontSize: '11px', fontFamily: 'inherit',
                      fontWeight: 600, flexShrink: 0,
                    }}
                  >
                    {inviteCopied ? <IconCheck size={15} strokeWidth={2.5} /> : '📋 Copy'}
                  </button>
                </div>
                <p style={{ fontSize: '11px', color: t.textMuted, margin: 0, lineHeight: 1.5 }}>
                  Share this code with {d.fullName?.split(' ')[0] ?? 'them'}. They can enter it on the{' '}
                  <span style={{ color: '#EA580C' }}>/invite</span> page to join the family tree.
                </p>
                <button
                  onClick={handleGenerateInvite}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                    fontSize: '11px', color: t.textMuted, textAlign: 'left', fontFamily: 'inherit',
                    textDecoration: 'underline',
                  }}
                >
                  Regenerate code
                </button>
              </>
            )}
          </div>
        </>
      )}
    </motion.div>
  )
}
