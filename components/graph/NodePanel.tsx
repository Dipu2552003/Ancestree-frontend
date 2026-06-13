'use client'

// NodePanel — slide-in editor for a single person node.
//
// Owns:
//   • draft state (mirror of PersonData with all-string field values)
//   • save lifecycle (idle → saving → saved → idle)
//   • collapsible section open/closed state
//   • derived `connections` list from rawEdges/rawNodes
//
// Section bodies, the sticky header, and the shared form closures live in
// ./nodeEditor/. The orchestrator composes them.

import { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useGraphStore } from '@/store/graphStore'
import { useIsMobile } from '@/hooks/useIsMobile'
import type { Node, Edge } from '@xyflow/react'
import type { PersonData, SavePayload, EdgeData } from '@/types'
import { getTheme } from '@/lib/theme'
import {
  SectionHeader, ReadOnlyNotice, InviteToClaimCard, PhotoEditor,
  ConnectionsList, AddRelationButton, SaveButton, NodePanelHeader,
  IdentitySection, BirthDeathSection,
  ContactSection, CurrentLocationSection, NativeOriginSection, WorkEducationSection,
  buildFormApi,
  initDraft, draftToPartialPersonData, draftToSavePayload, isDraftDirty, composeFullName,
  type SectionKey, type Draft, type SaveState, type ConnectionRow,
} from './nodeEditor'

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

export default function NodePanel({ node, onClose, onUpdate, onSave, rawEdges, rawNodes, onViewNode, onRemoveConnection, onRequestAddRelation }: NodePanelProps) {
  const { isDark } = useGraphStore()
  const isMobile = useIsMobile()
  const d = node.data as unknown as PersonData
  const canEditProfile = d.isSelf || (d.canEditProfile ?? false)

  const [draft, setDraft] = useState<Draft>(() => initDraft(d))
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [nameError, setNameError] = useState('')
  const [focused, setFocused] = useState<string | null>(null)

  // Collapsible sections — initialised open for any section that has at
  // least one field populated, so users see existing data on open.
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

  const connections: ConnectionRow[] = useMemo(() => {
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
      .filter(Boolean) as ConnectionRow[]
  }, [rawEdges, rawNodes, node.id])

  // Marital status is derived, never stored: married when the person has a
  // spouse connection or any child; single otherwise.
  const maritalStatus: 'single' | 'married' = useMemo(
    () => connections.some(c => c.relLabel === 'Spouse' || c.relLabel === 'Child') ? 'married' : 'single',
    [connections],
  )

  const nameInputRef = useRef<HTMLInputElement>(null)

  // Auto-focus the first-name field if the person was created without a name
  // (the wizard skips the name step in some flows — this lets the user fill
  // it in immediately).
  useEffect(() => {
    if (d.fullName !== 'Unknown') return
    const id = setTimeout(() => { nameInputRef.current?.focus(); nameInputRef.current?.select() }, 120)
    return () => clearTimeout(id)
  }, [d.fullName])

  const orig    = initDraft(d)
  const isDirty = isDraftDirty(draft, orig)

  const commitDraft = useCallback(() => {
    onUpdate(node.id, draftToPartialPersonData(draft))
  }, [draft, node.id, onUpdate])

  const handleSave = useCallback(async () => {
    if (!composeFullName(draft)) {
      setNameError('First name is required')
      nameInputRef.current?.focus()
      return
    }
    setNameError('')
    setSaveState('saving')
    const payload = draftToSavePayload(draft)
    try {
      if (onSave) await onSave(node.id, payload)
      commitDraft()
      setSaveState('saved')
    } catch (err: unknown) {
      setSaveState('idle')
      setNameError(err instanceof Error ? err.message : 'Save failed')
    }
  }, [draft, node.id, onSave, commitDraft])

  // Auto-reset the "Saved" indicator after 2s.
  useEffect(() => {
    if (saveState !== 'saved') return
    const id = setTimeout(() => setSaveState('idle'), 2000)
    return () => clearTimeout(id)
  }, [saveState])

  // Ctrl/Cmd + S quick-save.
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

  const t    = getTheme(isDark)
  const form = buildFormApi({ draft, setDraft, focused, setFocused, nameError, setNameError, isDark })

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

      <NodePanelHeader
        isDark={isDark} isMobile={isMobile}
        isDirty={isDirty} saveState={saveState}
        onClose={onClose}
      />

      {!canEditProfile && <ReadOnlyNotice fullName={d.fullName} isDark={isDark} />}

      {d.canInvite && <InviteToClaimCard nodeId={node.id} fullName={d.fullName} isDark={isDark} />}

      {canEditProfile && (<>
        <PhotoEditor
          photoUrl={draft.photoUrl}
          altName={d.fullName}
          isDark={isDark}
          onChange={(dataUrl, thumbUrl) => setDraft(p => ({ ...p, photoUrl: dataUrl, photoThumbnailUrl: thumbUrl }))}
        />

        <IdentitySection      form={form} nameInputRef={nameInputRef} maritalStatus={maritalStatus} />
        <BirthDeathSection    form={form} />
        <ContactSection         form={form} isOpen={sectionsOpen.contact}         onToggle={() => setSectionsOpen(p => ({ ...p, contact: !p.contact }))} />
        <CurrentLocationSection form={form} isOpen={sectionsOpen.currentLocation} onToggle={() => setSectionsOpen(p => ({ ...p, currentLocation: !p.currentLocation }))} />
        <NativeOriginSection    form={form} isOpen={sectionsOpen.nativeOrigin}    onToggle={() => setSectionsOpen(p => ({ ...p, nativeOrigin: !p.nativeOrigin }))} />
        <WorkEducationSection   form={form} isOpen={sectionsOpen.workEducation}   onToggle={() => setSectionsOpen(p => ({ ...p, workEducation: !p.workEducation }))} />

        <SaveButton saveState={saveState} isDirty={isDirty} isDark={isDark} onSave={handleSave} />
      </>)}

      {connections.length > 0 && (<>
        <SectionHeader title="Connections" isDark={isDark} />
        <ConnectionsList
          connections={connections}
          isDark={isDark}
          onViewNode={onViewNode}
          onRemoveConnection={onRemoveConnection}
        />
      </>)}

      {onRequestAddRelation && (
        <AddRelationButton
          isDark={isDark}
          onClick={() => {
            // Commit in-flight edits so they aren't lost when the wizard
            // takes over the screen.
            if (isDirty && composeFullName(draft)) commitDraft()
            onRequestAddRelation()
          }}
        />
      )}
    </motion.div>
  )
}
