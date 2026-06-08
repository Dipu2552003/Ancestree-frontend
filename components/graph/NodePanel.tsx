'use client'

import { useRef, useState, useEffect, useCallback, Fragment, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGraphStore } from '@/store/graphStore'
import { useIsMobile } from '@/hooks/useIsMobile'
import {
  IconX, IconCamera,
  IconCheck, IconLoader2, IconTrash, IconEye, IconScissors, IconPlus, IconChevronDown,
} from '@tabler/icons-react'
import type { Node, Edge } from '@xyflow/react'
import type { PersonData, SavePayload, EdgeData } from '@/types'
import { getTheme } from '@/lib/theme'
import { api } from '@/lib/api'
import { isGhostNodeId, realIdFromGhost } from '@/lib/graph/ghostNodes'

interface NodePanelProps {
  node: Node
  onClose: () => void
  onUpdate: (id: string, data: Partial<PersonData>) => void
  onSave?: (id: string, data: SavePayload) => Promise<void>
  rawEdges?: Edge[]
  rawNodes?: Node[]
  onViewNode?: (id: string) => void
  onRemoveConnection?: (edgeId: string) => Promise<void>
  onRequestAddRelation?: () => void
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

export default function NodePanel({ node, onClose, onUpdate, onSave, rawEdges, rawNodes, onViewNode, onRemoveConnection, onRequestAddRelation }: NodePanelProps) {
  const { isDark } = useGraphStore()
  const isMobile = useIsMobile()
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

  const [removingEdgeId, setRemovingEdgeId] = useState<string | null>(null)

  type SectionKey = 'contact' | 'currentLocation' | 'nativeOrigin' | 'workEducation'
  const initSections = useCallback(() => {
    const anyOf = (keys: string[]) => keys.some(k => Boolean((d as unknown as Record<string, unknown>)[k]))
    return {
      contact:         anyOf(['phone', 'whatsapp', 'email']),
      currentLocation: anyOf(['currentAddress', 'currentCity', 'currentState', 'currentCountry', 'currentPincode']),
      nativeOrigin:    anyOf(['nativeVillage', 'nativeTehsil', 'nativeDistrict', 'nativeState', 'nativeCountry']),
      workEducation:   anyOf(['occupation', 'occupationDetail', 'education', 'bio']),
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node.id])
  const [sectionsOpen, setSectionsOpen] = useState<Record<SectionKey, boolean>>(initSections)
  useEffect(() => { setSectionsOpen(initSections()) }, [initSections])

  const connections = useMemo(() => {
    if (!rawEdges || !rawNodes) return []
    const nodeMap = new Map(rawNodes.map(n => [n.id, n]))
    return rawEdges
      .filter(e => e.source === node.id || e.target === node.id)
      .map(e => {
        const rel = (e.data as unknown as EdgeData)?.relType
        if (!rel) return null
        const otherId = e.source === node.id ? e.target : e.source
        const other   = nodeMap.get(otherId)
        const od      = other?.data as unknown as PersonData | undefined
        let relLabel: string
        if (rel === 'SPOUSE_OF') relLabel = 'Spouse'
        else if (rel === 'SIBLING_OF') relLabel = 'Sibling'
        else if (rel === 'PARENT_OF' && e.source === node.id) relLabel = 'Child'
        else relLabel = 'Parent'
        return { edgeId: e.id, personId: otherId, fullName: od?.fullName ?? 'Unknown', photoUrl: od?.photoUrl as string | undefined, nodeState: od?.nodeState ?? 'proxy', relLabel }
      })
      .filter(Boolean) as { edgeId: string; personId: string; fullName: string; photoUrl?: string; nodeState: string; relLabel: string }[]
  }, [rawEdges, rawNodes, node.id])

  const fileInputRef    = useRef<HTMLInputElement>(null)
  const nameInputRef    = useRef<HTMLInputElement>(null)

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
      const realId = isGhostNodeId(node.id) ? realIdFromGhost(node.id) : node.id
      const { invite_token } = await api.persons.generateInvite(realId)
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

  // ── theme ──────────────────────────────────────────────────────────
  const t        = getTheme(isDark)
  const labelCol = isDark ? '#7A6A52' : '#9A3412'
  const btn1Bg   = isDark ? '#2A1A12' : '#FFF3E8'

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

  const countFilled = (keys: (keyof Draft)[]) =>
    keys.filter(k => Boolean(draft[k])).length

  const sectionHeader = (title: string, opts?: { sectionKey?: SectionKey; fields?: (keyof Draft)[] }) => {
    const sk = opts?.sectionKey
    const isOpen = sk ? sectionsOpen[sk] : true
    const filled = (opts?.fields && sk && !isOpen) ? countFilled(opts.fields) : 0
    const baseStyle: React.CSSProperties = {
      display: 'flex', alignItems: 'center', gap: '8px',
      padding: '10px 16px 8px',
      borderTop: `1px solid ${t.border}`,
      background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)',
      marginTop: '4px',
      userSelect: 'none',
      fontFamily: 'inherit',
      textAlign: 'left',
    }
    const inner = (
      <>
        <div style={{
          width: '2px', height: '12px', borderRadius: '1px', flexShrink: 0,
          background: isDark ? 'rgba(234,88,12,0.45)' : 'rgba(234,88,12,0.35)',
        }} />
        <span style={{
          flex: 1, fontSize: '10px', fontWeight: 700,
          letterSpacing: '0.10em', textTransform: 'uppercase' as const,
          color: isDark ? 'rgba(237,232,227,0.60)' : 'rgba(26,10,0,0.50)',
        }}>
          {title}
        </span>
        {sk && !isOpen && filled > 0 && (
          <span style={{
            fontSize: '9px', fontWeight: 700, color: '#EA580C',
            background: isDark ? 'rgba(234,88,12,0.15)' : 'rgba(234,88,12,0.10)',
            padding: '1px 7px', borderRadius: '10px',
          }}>
            {filled}
          </span>
        )}
        {sk && (
          <motion.span
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            style={{ display: 'flex', color: isDark ? '#4A3F35' : '#C4A882', lineHeight: 0 }}
          >
            <IconChevronDown size={13} strokeWidth={2} />
          </motion.span>
        )}
      </>
    )
    if (!sk) {
      return <div style={baseStyle}>{inner}</div>
    }
    return (
      <button
        type="button"
        onClick={() => setSectionsOpen(p => ({ ...p, [sk]: !p[sk] }))}
        aria-expanded={isOpen}
        style={{ ...baseStyle, width: '100%', cursor: 'pointer', border: 'none' }}
      >
        {inner}
      </button>
    )
  }

  const row = (...children: React.ReactNode[]) => (
    <div style={{ display: 'flex', gap: '10px' }}>
      {children.map((child, i) => <Fragment key={i}>{child}</Fragment>)}
    </div>
  )

  const handleBirthDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    const yr = parseInt(val.slice(0, 4))
    const autoYear = val.length >= 4 && !isNaN(yr) && yr >= 1800 && yr <= 2099 ? String(yr) : undefined
    setDraft(p => ({ ...p, birthDate: val, ...(autoYear !== undefined ? { birthYear: autoYear } : {}) }))
  }

  const handleDeathDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    const yr = parseInt(val.slice(0, 4))
    const autoYear = val.length >= 4 && !isNaN(yr) && yr >= 1800 && yr <= 2099 ? String(yr) : undefined
    setDraft(p => ({ ...p, deathDate: val, ...(autoYear !== undefined ? { deathYear: autoYear } : {}) }))
  }

  return (
    <motion.div
      initial={isMobile ? { y: '100%' } : { x: 320 }}
      animate={isMobile ? { y: 0 } : { x: 0 }}
      exit={isMobile ? { y: '100%' } : { x: 320 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      style={isMobile ? {
        position: 'fixed', bottom: 0, left: 0, right: 0, height: '85vh',
        background: t.panelBg, zIndex: 111,
        display: 'flex', flexDirection: 'column',
        borderTop: `1.5px solid ${t.border}`,
        borderRadius: '16px 16px 0 0',
        overflowY: 'auto',
      } : {
        position: 'fixed', top: 0, right: 0, height: '100vh', width: '320px',
        background: t.panelBg, zIndex: 100,
        display: 'flex', flexDirection: 'column',
        borderLeft: `1.5px solid ${t.border}`,
        overflowY: 'auto',
      }}
    >
      {/* Drag handle — mobile only */}
      {isMobile && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px', flexShrink: 0, pointerEvents: 'none' }}>
          <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)' }} />
        </div>
      )}
      {/* Screen-reader live region for save feedback */}
      <span
        aria-live="polite"
        aria-atomic="true"
        style={{
          position: 'absolute', width: 1, height: 1,
          padding: 0, margin: '-1px', overflow: 'hidden',
          clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0,
        }}
      >
        {saveState === 'saving' ? 'Saving changes' : saveState === 'saved' ? 'Changes saved successfully' : ''}
      </span>

      {/* ── Header ── */}
      <div style={{
        height: '52px', background: t.cardBg,
        borderBottom: `1.5px solid ${t.border}`,
        display: 'flex', alignItems: 'center',
        justifyContent: 'flex-end', padding: '0 12px', flexShrink: 0,
        position: 'sticky', top: 0, zIndex: 10,
      }}>
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
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: isMobile ? '10px' : '4px', display: 'flex', alignItems: 'center', color: labelCol }}>
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

      {/* ── Invite to claim (proxy nodes — shown near the top as primary CTA) ── */}
      {d.canInvite && (
        <div style={{
          margin: '12px 16px 0', padding: '14px 16px', borderRadius: '10px',
          background: isDark ? '#0D1F0D' : '#F0FDF4',
          border: `1px solid ${isDark ? '#14532D' : '#BBF7D0'}`,
          display: 'flex', flexDirection: 'column', gap: '10px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px', lineHeight: 1 }}>⚡</span>
            <div>
              <p style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: isDark ? '#4ADE80' : '#15803D' }}>
                Invite to join
              </p>
              <p style={{ margin: '2px 0 0', fontSize: '11px', lineHeight: 1.4, color: isDark ? 'rgba(74,222,128,0.70)' : 'rgba(22,163,74,0.75)' }}>
                {d.fullName?.split(' ')[0] ?? 'This person'} hasn't joined yet
              </p>
            </div>
          </div>
          {!inviteCode ? (
            <motion.button
              onClick={handleGenerateInvite}
              disabled={inviteGenerating}
              whileHover={!inviteGenerating ? { scale: 1.015 } : {}}
              whileTap={!inviteGenerating ? { scale: 0.975 } : {}}
              style={{
                width: '100%', height: '34px', borderRadius: '8px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                cursor: inviteGenerating ? 'default' : 'pointer',
                fontSize: '12px', fontWeight: 600, fontFamily: 'inherit',
                background: isDark ? '#14532D' : '#16A34A', color: '#fff', border: 'none',
                opacity: inviteGenerating ? 0.6 : 1, transition: 'opacity 0.15s',
              }}
            >
              {inviteGenerating
                ? <><motion.div animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}><IconLoader2 size={13} /></motion.div> Generating…</>
                : 'Generate invite code'
              }
            </motion.button>
          ) : (
            <>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                background: isDark ? '#1A2A1A' : '#DCFCE7',
                border: `1.5px solid ${isDark ? '#14532D' : '#86EFAC'}`,
                borderRadius: '8px', padding: '0 12px', height: '40px',
              }}>
                <span style={{
                  flex: 1, fontFamily: 'monospace', fontSize: '14px',
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
                  {inviteCopied ? <IconCheck size={14} strokeWidth={2.5} /> : 'Copy'}
                </button>
              </div>
              <p style={{ fontSize: '11px', margin: 0, lineHeight: 1.5, color: isDark ? 'rgba(74,222,128,0.70)' : 'rgba(21,128,61,0.70)' }}>
                Share with {d.fullName?.split(' ')[0] ?? 'them'} — enter at{' '}
                <span style={{ color: '#EA580C' }}>/invite</span> to join.
              </p>
              <button
                onClick={handleGenerateInvite}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                  fontSize: '10.5px', color: t.textMuted, textAlign: 'left' as const,
                  fontFamily: 'inherit', textDecoration: 'underline',
                }}
              >
                Regenerate code
              </button>
            </>
          )}
        </div>
      )}

      {canEditProfile && (<>

        {/* ── Photo ── */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 16px 0' }}>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            onMouseEnter={() => setPhotoHovered(true)}
            onMouseLeave={() => setPhotoHovered(false)}
            aria-label={draft.photoUrl ? 'Change photo' : 'Add photo'}
            aria-busy={photoUploading}
            style={{
              width: '80px', height: '80px', borderRadius: '6px',
              background: btn1Bg, border: `2px dashed ${photoHovered ? '#FB923C' : t.border}`,
              overflow: 'hidden', cursor: 'pointer', position: 'relative',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              transition: 'border-color 0.15s ease',
              padding: 0, fontFamily: 'inherit',
            }}
          >
            {photoUploading ? (
              <IconLoader2 size={20} color="#EA580C" style={{ animation: 'spin 0.8s linear infinite' }} />
            ) : draft.photoUrl ? (
              <>
                <img src={draft.photoUrl} alt={`Photo of ${d.fullName}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
          </button>
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
            <div style={{ flex: 1, minWidth: 0 }}>
              <label style={labelStyle}>Birth date</label>
              <input
                type="text"
                value={draft.birthDate}
                onChange={handleBirthDateChange}
                onFocus={() => setFocused('birthDate')} onBlur={() => setFocused(null)}
                placeholder="YYYY-MM-DD"
                style={inputStyle('birthDate')}
              />
            </div>,
            field('Birth year', 'birthYear', 'YYYY', { type: 'number', half: true }),
          )}
          {field('Birth place', 'birthPlace', 'City or village')}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {/* span is non-interactive; the button below has aria-label for AT */}
            <span style={labelStyle}>Deceased</span>
            <button
              type="button"
              role="switch"
              aria-checked={draft.isDeceased}
              aria-label="Deceased"
              onClick={() => setDraft(p => ({ ...p, isDeceased: !p.isDeceased, deathDate: '', deathYear: '', deathPlace: '' }))}
              style={{
                width: '36px', height: '20px', borderRadius: '10px',
                background: draft.isDeceased ? '#EA580C' : (isDark ? '#2A2520' : '#E5E7EB'),
                position: 'relative', cursor: 'pointer', transition: 'background 0.2s ease',
                flexShrink: 0, border: 'none', padding: 0,
              }}
            >
              <div style={{
                position: 'absolute', top: '2px', left: draft.isDeceased ? '18px' : '2px',
                width: '16px', height: '16px', borderRadius: '50%', background: 'white',
                transition: 'left 0.2s ease', boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
              }} />
            </button>
          </div>

          <AnimatePresence>
            {draft.isDeceased && (
              <motion.div
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '10px' }}
              >
                {row(
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <label style={labelStyle}>Death date</label>
                    <input
                      type="text"
                      value={draft.deathDate}
                      onChange={handleDeathDateChange}
                      onFocus={() => setFocused('deathDate')} onBlur={() => setFocused(null)}
                      placeholder="YYYY-MM-DD"
                      style={inputStyle('deathDate')}
                    />
                  </div>,
                  field('Death year', 'deathYear', 'YYYY', { type: 'number', half: true }),
                )}
                {field('Death place', 'deathPlace', 'City or village')}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── CONTACT ── */}
        {sectionHeader('Contact', { sectionKey: 'contact', fields: ['phone', 'whatsapp', 'email'] })}
        {sectionsOpen.contact && (
          <div style={{ padding: '12px 16px 4px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {field('Phone', 'phone', '+91 98765 43210', { type: 'tel' })}
            {field('WhatsApp', 'whatsapp', '+91 98765 43210', { type: 'tel' })}
            {field('Email', 'email', 'name@example.com', { type: 'email' })}
          </div>
        )}

        {/* ── CURRENT LOCATION ── */}
        {sectionHeader('Current Location', { sectionKey: 'currentLocation', fields: ['currentAddress', 'currentCity', 'currentState', 'currentCountry', 'currentPincode'] })}
        {sectionsOpen.currentLocation && (
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
        )}

        {/* ── NATIVE / ORIGIN ── */}
        {sectionHeader('Native / Origin', { sectionKey: 'nativeOrigin', fields: ['nativeVillage', 'nativeTehsil', 'nativeDistrict', 'nativeState', 'nativeCountry'] })}
        {sectionsOpen.nativeOrigin && (
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
        )}

        {/* ── WORK & EDUCATION ── */}
        {sectionHeader('Work & Education', { sectionKey: 'workEducation', fields: ['occupation', 'occupationDetail', 'education', 'bio'] })}
        {sectionsOpen.workEducation && (
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
        )}

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

      {/* ── Connections ── */}
      {connections.length > 0 && (<>
        {sectionHeader('Connections')}
        <div style={{ padding: '10px 16px 4px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {connections.map(conn => {
            const initials = conn.fullName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
            const avatarBg = conn.nodeState === 'claimed' ? '#C2410C' : conn.nodeState === 'proxy' || conn.nodeState === 'invited' ? '#D97706' : '#94A3B8'
            const isRemoving = removingEdgeId === conn.edgeId
            return (
              <div
                key={conn.edgeId}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '9px 12px',
                  borderRadius: '10px',
                  background: isDark ? 'rgba(255,255,255,0.04)' : '#FFF7ED',
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : '#FDE8CC'}`,
                  opacity: isRemoving ? 0.5 : 1,
                  transition: 'opacity 0.2s',
                }}
              >
                {/* Avatar */}
                <div style={{
                  width: '34px', height: '34px', borderRadius: '6px', flexShrink: 0,
                  overflow: 'hidden', background: avatarBg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {conn.photoUrl
                    ? <img src={conn.photoUrl} alt={conn.fullName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ fontSize: '12px', fontWeight: 700, color: '#fff', letterSpacing: '0.02em' }}>{initials}</span>
                  }
                </div>

                {/* Name + label */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {conn.fullName}
                  </div>
                  <div style={{ fontSize: '10px', color: t.textMuted, marginTop: '1px' }}>{conn.relLabel}</div>
                </div>

                {/* View button */}
                <button
                  onClick={() => onViewNode?.(conn.personId)}
                  disabled={isRemoving}
                  title="View"
                  style={{
                    width: '28px', height: '28px', borderRadius: '6px', border: 'none',
                    background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: t.textMuted, flexShrink: 0,
                    transition: 'background 0.15s, color 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.13)' : 'rgba(0,0,0,0.10)'; e.currentTarget.style.color = '#EA580C' }}
                  onMouseLeave={e => { e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'; e.currentTarget.style.color = t.textMuted }}
                >
                  <IconEye size={14} />
                </button>

                {/* Remove button */}
                <button
                  onClick={async () => {
                    if (!onRemoveConnection || isRemoving) return
                    setRemovingEdgeId(conn.edgeId)
                    try { await onRemoveConnection(conn.edgeId) }
                    finally { setRemovingEdgeId(null) }
                  }}
                  disabled={isRemoving}
                  title="Remove connection"
                  style={{
                    width: '28px', height: '28px', borderRadius: '6px', border: 'none',
                    background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
                    cursor: isRemoving ? 'default' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: t.textMuted, flexShrink: 0,
                    transition: 'background 0.15s, color 0.15s',
                  }}
                  onMouseEnter={e => { if (!isRemoving) { e.currentTarget.style.background = isDark ? 'rgba(239,68,68,0.18)' : '#FEE2E2'; e.currentTarget.style.color = '#EF4444' } }}
                  onMouseLeave={e => { e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'; e.currentTarget.style.color = t.textMuted }}
                >
                  {isRemoving
                    ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}><IconLoader2 size={13} /></motion.div>
                    : <IconScissors size={13} />
                  }
                </button>
              </div>
            )
          })}
        </div>
      </>)}

      {/* ── Add relation ── */}
      {onRequestAddRelation && (
        <div style={{ padding: '12px 16px 28px' }}>
          <button
            onClick={() => {
              if (isDirty && draft.fullName.trim()) commitDraft()
              onRequestAddRelation()
            }}
            style={{
              width: '100%', height: '38px', borderRadius: '8px', border: '1px solid rgba(234,88,12,0.30)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              cursor: 'pointer', fontSize: '13px', fontWeight: 500, fontFamily: 'inherit',
              background: isDark ? 'rgba(234,88,12,0.12)' : 'rgba(234,88,12,0.07)',
              color: '#EA580C',
              transition: 'background 0.15s, border-color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = isDark ? 'rgba(234,88,12,0.20)' : 'rgba(234,88,12,0.12)'; e.currentTarget.style.borderColor = 'rgba(234,88,12,0.55)' }}
            onMouseLeave={e => { e.currentTarget.style.background = isDark ? 'rgba(234,88,12,0.12)' : 'rgba(234,88,12,0.07)'; e.currentTarget.style.borderColor = 'rgba(234,88,12,0.30)' }}
          >
            <IconPlus size={15} strokeWidth={2.5} />
            Add relation
          </button>
        </div>
      )}

    </motion.div>
  )
}
