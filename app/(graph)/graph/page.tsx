'use client'

import { useState, useCallback, useEffect, useRef, useMemo, Suspense } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ReactFlowProvider, Controls, MiniMap, useReactFlow } from '@xyflow/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { IconSun, IconMoon, IconBell } from '@tabler/icons-react'
import GraphCanvas from '@/components/graph/GraphCanvas'
import SearchBar from '@/components/graph/SearchBar'
import DotField from '@/components/graph/DotField'
import NodePanel from '@/components/graph/NodePanel'
import PersonProfileView from '@/components/graph/PersonProfileView'
import Navbar from '@/components/graph/Navbar'
import NodeContextMenu from '@/components/graph/NodeContextMenu'
import TreeTimeline from '@/components/graph/TreeTimeline'
import ExplorationBanner from '@/components/graph/ExplorationBanner'
import MergeSearchModal from '@/components/graph/MergeSearchModal'
import DuplicateFoundModal from '@/components/graph/DuplicateFoundModal'
import NotificationPanel from '@/components/graph/NotificationPanel'
import MergeConflictModal from '@/components/graph/MergeConflictModal'
import MergeComparisonPanel from '@/components/graph/MergeComparisonPanel'
import AddNodeWizard from '@/components/graph/AddNodeWizard'
import SecondSpouseWizard, { deriveActiveSpousesFromEdges, deriveChildrenFromEdges } from '@/components/graph/SecondSpouseWizard'
import { useGraphStore } from '@/store/graphStore'
import { useGraphData } from '@/hooks/useGraphData'
import { useNodeActions } from '@/hooks/useNodeActions'
import { useIsMobile } from '@/hooks/useIsMobile'
import { getTheme } from '@/lib/theme'
import { api, getToken, type PotentialMatch, type MergeConflict } from '@/lib/api'
import { isGhostNodeId, realIdFromGhost, realEdgeId } from '@/lib/graph/ghostNodes'
import type { PersonData, PendingMatchData, MyPersonInfo } from '@/types'
import type { RelAction } from '@/components/graph/Navbar'
import type { WizardExtras } from '@/components/graph/AddNodeWizard'

function asPersonData(data: unknown): PersonData {
  return data as PersonData
}

/**
 * Candidate mothers shown in the wizard's 'mother' step.
 *
 *   - son/daughter:    anchor's own spouses.
 *   - brother/sister:  anchor's *multi-spouse* parent's spouses, with anchor's
 *                      own mother first (so it's the default selection and the
 *                      common "full sibling" case is one click).
 *   - anything else:   empty (no mother step shown).
 *
 * Returned list is empty in single-spouse cases too — the wizard only shows the
 * mother step when this list has 2+ entries.
 */
type SimpleEdge = { id: string; source: string; target: string; data?: unknown }
type SimpleNode = { id: string; data?: { fullName?: string; gender?: string; photoUrl?: string } }
type MotherOption = { id: string; name: string; gender?: string; photoUrl?: string }
function computeMotherOptions(
  action: RelAction,
  anchorId: string | null,
  edges: SimpleEdge[],
  nodes: SimpleNode[],
): MotherOption[] {
  if (!anchorId) return []
  const dataOf = (id: string) => nodes.find(n => n.id === id)?.data
  const optionFor = (id: string): MotherOption => {
    const d = dataOf(id)
    return { id, name: d?.fullName ?? 'Person', gender: d?.gender, photoUrl: d?.photoUrl }
  }
  const relTypeOf = (e: SimpleEdge) =>
    (e.data as { relType?: string } | undefined)?.relType

  const spousesOfPerson = (personId: string): string[] =>
    edges
      .filter(e => relTypeOf(e) === 'SPOUSE_OF' && (e.source === personId || e.target === personId))
      .map(e => e.source === personId ? e.target : e.source)

  if (action === 'son' || action === 'daughter') {
    return spousesOfPerson(anchorId).map(optionFor)
  }

  if (action === 'brother' || action === 'sister') {
    const anchorParents = edges
      .filter(e => relTypeOf(e) === 'PARENT_OF' && e.target === anchorId)
      .map(e => e.source)
    // Find a parent with 2+ spouses — the "shared father" in a multi-wife case.
    const multiSpouseParent = anchorParents.find(p => spousesOfPerson(p).length >= 2)
    if (!multiSpouseParent) return []

    const allWives    = spousesOfPerson(multiSpouseParent)
    const anchorOwnMom = anchorParents.find(p => p !== multiSpouseParent) ?? null
    // Put anchor's own mother first so the default selection = full sibling.
    const ordered = anchorOwnMom
      ? [anchorOwnMom, ...allWives.filter(w => w !== anchorOwnMom)]
      : allWives
    return ordered.map(optionFor)
  }

  return []
}

/**
 * Father shown in the TrioHero on the 'mother' step.
 *   - child-add:    anchor IS the father → undefined (wizard falls back to anchorName)
 *   - sibling-add:  anchor's multi-spouse parent's name (the shared father)
 */
function computeFatherName(
  action: RelAction,
  anchorId: string | null,
  edges: SimpleEdge[],
  nodes: SimpleNode[],
): string | undefined {
  if (!anchorId) return undefined
  if (action !== 'brother' && action !== 'sister') return undefined
  const relTypeOf = (e: SimpleEdge) =>
    (e.data as { relType?: string } | undefined)?.relType
  const spousesOf = (personId: string): number =>
    edges.filter(e => relTypeOf(e) === 'SPOUSE_OF' && (e.source === personId || e.target === personId)).length
  const anchorParents = edges
    .filter(e => relTypeOf(e) === 'PARENT_OF' && e.target === anchorId)
    .map(e => e.source)
  const multiSpouseParent = anchorParents.find(p => spousesOf(p) >= 2)
  if (!multiSpouseParent) return undefined
  return nodes.find(n => n.id === multiSpouseParent)?.data?.fullName
}

export default function GraphPage() {
  return (
    <ReactFlowProvider>
      <Suspense fallback={null}>
        <GraphInner />
      </Suspense>
    </ReactFlowProvider>
  )
}

function GraphInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const perspectiveId  = searchParams.get('perspective') ?? undefined
  const viewMergeParam = searchParams.get('viewMerge')   ?? undefined

  useEffect(() => {
    if (!getToken()) router.replace('/login')
  }, [router])

  // Read exploration / review context stored by DuplicateFoundModal or NotificationPanel.
  // Must depend on perspectiveId: when already on /graph and "View tree" is clicked,
  // router.push doesn't remount the component — the effect must re-run on URL change.
  useEffect(() => {
    const raw = sessionStorage.getItem('pendingMatch')
    if (raw) {
      try { setPendingMatch(JSON.parse(raw) as PendingMatchData) } catch {}
      sessionStorage.removeItem('pendingMatch')
    }
  }, [perspectiveId])

  const { getNodes, setCenter, fitView } = useReactFlow()
  const { isDark, setIsDark, unreadCount, setNotifications, setActiveNodeId } = useGraphStore()
  const isMobile = useIsMobile()
  const t = getTheme(isDark)

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [panelMode, setPanelMode] = useState<'none' | 'edit' | 'view'>('none')
  const [navbarAddTrigger, setNavbarAddTrigger] = useState(0)
  const [wizardAction, setWizardAction] = useState<RelAction | null>(null)
  const [canvasReady, setCanvasReady] = useState(false)
  const fitDone = useRef(false)
  const [contextMenu, setContextMenu] = useState<{
    nodeId: string; x: number; y: number; personData: PersonData
  } | null>(null)
  const [duplicateInfo, setDuplicateInfo] = useState<{
    newPersonId: string; matches: PotentialMatch[]; myInfo: MyPersonInfo
  } | null>(null)
  const [notifPanelOpen,  setNotifPanelOpen]  = useState(false)
  const [mergeConflicts,  setMergeConflicts]  = useState<MergeConflict[]>([])
  const [pendingMatch,    setPendingMatch]    = useState<PendingMatchData | null>(null)
  const [matchPanelOpen,  setMatchPanelOpen]  = useState(false)
  const [mergeSearchNode, setMergeSearchNode] = useState<{ id: string; name: string } | null>(null)
  const [secondSpouseAnchor, setSecondSpouseAnchor] = useState<{ id: string; name: string } | null>(null)
  const [mergeFromNode, setMergeFromNode] = useState<{
    id:        string
    name:      string
    photoUrl:  string | null
    nodeState: string
    matches:   PotentialMatch[] | null   // null = still loading
  } | null>(null)

  const {
    nodes, edges, rawNodes, rawEdges,
    setNodes, setEdges,
    onNodesChange, onEdgesChange,
    visibleNodes, displayEdges,
    graphLoading, fetchGraph, resetAndFetch,
    isMarriedWoman, womanView, onWomanViewChange,
    familyName,
  } = useGraphData(perspectiveId)

  const { onUpdateNode, onSaveNode, onDeleteNode, onAddRelation } = useNodeActions(
    edges, setNodes, setEdges, fetchGraph, selectedNodeId, setSelectedNodeId,
    (newPersonId, matches, myInfo) => setDuplicateInfo({ newPersonId, matches, myInfo }),
  )

  // Fetch notification unread count on load
  useEffect(() => {
    api.notifications.list()
      .then(({ notifications, unread_count }) => setNotifications(notifications, unread_count))
      .catch(() => {})
  }, [setNotifications])

  // Sync active node to the store so PersonNode can subscribe without touching
  // explorationNodes (which would cause all edges to recompute on every click).
  useEffect(() => {
    setActiveNodeId(selectedNodeId ?? contextMenu?.nodeId ?? null)
  }, [selectedNodeId, contextMenu?.nodeId, setActiveNodeId])

  // Long-press on mobile → open context menu (mirrors onNodeContextMenu for right-click)
  const nodesRef = useRef(nodes)
  useEffect(() => { nodesRef.current = nodes }, [nodes])
  useEffect(() => {
    const handler = (e: Event) => {
      const { nodeId, clientX, clientY } = (e as CustomEvent<{ nodeId: string; clientX: number; clientY: number }>).detail
      const node = nodesRef.current.find(n => n.id === nodeId)
      if (!node) return
      setSelectedNodeId(null)
      setPanelMode('none')
      setContextMenu({ nodeId, x: clientX, y: clientY, personData: asPersonData(node.data) })
    }
    window.addEventListener('node-longpress', handler)
    return () => window.removeEventListener('node-longpress', handler)
  }, [])


  const perspectivePerson = perspectiveId
    ? nodes.find(n => asPersonData(n.data)?.isSelf) ?? null
    : null
  const perspectiveName = asPersonData(perspectivePerson?.data)?.fullName ?? ''

  // Exploration mode — true when we're viewing another tree to evaluate a merge
  const isExploration     = !!perspectiveId && !!pendingMatch
  const matchHighlightNode = useMemo(
    () => isExploration ? (nodes.find(n => asPersonData(n.data).isSelf) ?? null) : null,
    [nodes, isExploration],
  )

  // Inject isMatchHighlight into the isSelf node when in exploration mode
  const explorationNodes = useMemo(() => {
    if (!isExploration) return visibleNodes
    return visibleNodes.map(n => {
      if (asPersonData(n.data).isSelf)
        return { ...n, data: { ...n.data, isMatchHighlight: true } }
      return n
    })
  }, [visibleNodes, isExploration])

  const selectedNode      = selectedNodeId ? nodes.find(n => n.id === selectedNodeId) ?? null : null
  const selectedNodeName  = asPersonData(selectedNode?.data)?.fullName ?? ''
  const selectedIsSelf    = asPersonData(selectedNode?.data)?.isSelf ?? false
  const canDeleteSelected = !!selectedNodeId && !selectedIsSelf

  const onHome = useCallback(() => {
    const self = getNodes().find(n => asPersonData(n.data)?.isSelf)
    if (self) setCenter(self.position.x + 64, self.position.y + 70, { zoom: 1, duration: 600 })
    else fitView({ padding: 0.35, duration: 600 })
  }, [getNodes, setCenter, fitView])

  const handleSearchSelect = useCallback((personId: string): boolean => {
    const canvasNodes = getNodes()
    const node = canvasNodes.find(n => n.id === personId)
    if (!node) return false
    setCenter(
      node.position.x + 64,
      node.position.y + 79,
      { zoom: 1.2, duration: 500 },
    )
    setSelectedNodeId(personId)
    setPanelMode('view')
    return true
  }, [getNodes, setCenter, setSelectedNodeId, setPanelMode])

  // Reset viewport state when switching perspective so the new tree is fitted.
  useEffect(() => {
    fitDone.current = false
    setCanvasReady(false)
  }, [perspectiveId])

  // Fit the viewport once after the graph first loads — imperatively, so we can
  // wait for two animation frames (ResizeObserver fires between them) before
  // calling fitView. The canvas stays hidden (opacity 0) until this completes.
  useEffect(() => {
    if (graphLoading || visibleNodes.length === 0 || fitDone.current) return
    fitDone.current = true
    // Two rAF passes: first renders nodes, second fires ResizeObserver + layout.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        fitView({ padding: 0.35, duration: 0 })
        setCanvasReady(true)
      })
    })
  }, [graphLoading, visibleNodes.length, fitView])

  const handleWizardAdd = useCallback(async (action: RelAction, fullName: string, extras: WizardExtras) => {
    await onAddRelation(action, fullName, extras)
    setWizardAction(null)
    setPanelMode('edit')
  }, [onAddRelation])

  // Auto-open the merge comparison panel once the exploration tree has loaded
  useEffect(() => {
    if (isExploration && matchHighlightNode && !graphLoading) {
      setMatchPanelOpen(true)
    }
  }, [isExploration, matchHighlightNode?.id, graphLoading])

  const onMergeAccepted = useCallback((conflicts: MergeConflict[]) => {
    // Use resetAndFetch so the collapse state is recomputed to include the
    // newly-added family unit (e.g. Dipkul + Shilpa + children) from the merge.
    resetAndFetch()
    // Refresh notification list so all family members' unread counts update
    api.notifications.list()
      .then(({ notifications, unread_count }) => setNotifications(notifications, unread_count))
      .catch(() => {})
    setNotifPanelOpen(false)
    setMatchPanelOpen(false)
    if (isExploration) router.push('/graph')
    if (conflicts.length > 0) setMergeConflicts(conflicts)
  }, [resetAndFetch, isExploration, router, setNotifications])

  if (graphLoading) {
    return (
      <div style={{ height: '100vh', background: t.pageBg, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.4s' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '3px solid #FDE8CC', borderTopColor: '#EA580C', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: '#9A6C3C', fontSize: '14px', margin: 0 }}>Loading your family tree…</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  return (
    <div
      style={{ position: 'relative', height: '100vh', overflow: 'hidden', background: t.pageBg, transition: 'background 0.4s' }}
    >
      <DotField isDark={isDark} />

      <motion.div style={{ position: 'absolute', inset: 0, zIndex: 1, opacity: canvasReady ? 1 : 0, transition: 'opacity 0.15s ease' }}>
        <GraphCanvas
          nodes={explorationNodes} edges={displayEdges}
          onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
          onPaneClick={() => {
            setContextMenu(null)
            setSelectedNodeId(null)
            setPanelMode('none')
          }}
          onNodeClick={id => {
            setContextMenu(null)
            if (id.startsWith('couple_')) return

            // In exploration mode, clicking the highlighted node opens the merge comparison panel
            if (isExploration && matchHighlightNode && id === matchHighlightNode.id) {
              setMatchPanelOpen(true)
              return
            }
            setSelectedNodeId(prev => {
              if (prev === id) { setPanelMode('none'); return null }
              setPanelMode('view')
              return id
            })
          }}
          onNodeContextMenu={(event, nodeId) => {
            const node = nodes.find(n => n.id === nodeId)
            if (!node) return
            setSelectedNodeId(null)
            setPanelMode('none')
            setContextMenu({
              nodeId,
              x: event.clientX,
              y: event.clientY,
              personData: asPersonData(node.data),
            })
          }}
        />
      </motion.div>

      <div style={{ position: 'absolute', inset: 0, zIndex: 10, pointerEvents: 'none' }}>
        <Controls style={{ pointerEvents: 'all', background: t.controlBg, border: `1.5px solid ${t.controlBorder}`, borderRadius: '6px', boxShadow: isDark ? '0 2px 12px rgba(0,0,0,0.4)' : '0 2px 8px rgba(0,0,0,0.06)' }} />
        {!isMobile && (
          <MiniMap
            style={{ pointerEvents: 'all', background: t.mapBg, border: `1.5px solid ${t.controlBorder}`, borderRadius: '6px' }}
            nodeColor={n => n.data?.isSelf ? '#EA580C' : n.data?.nodeState === 'claimed' ? '#22C55E' : isDark ? '#4A3F35' : '#D97706'}
          />
        )}
      </div>

      {/* Family name badge — top left */}
      <div style={{
        position: 'absolute', top: '16px', left: '16px', zIndex: 50,
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '7px 14px',
        background: t.cardBg,
        border: `1.5px solid ${t.controlBorder}`,
        borderRadius: '10px',
        boxShadow: isDark ? '0 2px 12px rgba(0,0,0,0.45)' : '0 2px 8px rgba(0,0,0,0.08)',
        userSelect: 'none',
        transition: 'background 0.3s',
      }}>
        <span style={{ fontSize: '15px', lineHeight: 1 }} aria-hidden="true">🌸</span>
        <div style={{ lineHeight: 1.2 }}>
          <div style={{ fontSize: '8.5px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: t.textMuted }}>
            Family
          </div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#EA580C', letterSpacing: '0.01em' }}>
            {familyName}
          </div>
        </div>
      </div>

      {/* Notification bell */}
      <div style={{ position: 'absolute', top: '16px', right: isMobile ? '68px' : '64px', zIndex: 50 }}>
        <button
          onClick={() => setNotifPanelOpen(v => !v)}
          style={{ position: 'relative', width: isMobile ? '44px' : '38px', height: isMobile ? '44px' : '38px', borderRadius: '8px', background: t.toggleBg, color: t.toggleColor, border: `1.5px solid ${t.toggleBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: isDark ? '0 2px 12px rgba(0,0,0,0.5)' : '0 2px 8px rgba(0,0,0,0.12)', transition: 'background 0.3s, color 0.3s' }}
          title="Notifications"
        >
          <IconBell size={17} />
          {unreadCount > 0 && (
            <span style={{ position: 'absolute', top: '-4px', right: '-4px', background: '#EA580C', color: '#fff', borderRadius: '999px', fontSize: '9px', fontWeight: 700, minWidth: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px', lineHeight: 1 }}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </div>

      <button
        onClick={() => setIsDark(!isDark)}
        style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 50, width: isMobile ? '44px' : '38px', height: isMobile ? '44px' : '38px', borderRadius: '8px', background: t.toggleBg, color: t.toggleColor, border: `1.5px solid ${t.toggleBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: isDark ? '0 2px 12px rgba(0,0,0,0.5)' : '0 2px 8px rgba(0,0,0,0.12)', transition: 'background 0.3s, color 0.3s' }}
        title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {isDark ? <IconSun size={17} /> : <IconMoon size={17} />}
      </button>


      {/* Search bar — centered on desktop, full-width below top bar on mobile */}
      <div style={{
        position:  'absolute',
        top:       isMobile ? '68px' : '16px',
        left:      isMobile ? '16px' : '50%',
        transform: isMobile ? 'none' : 'translateX(-50%)',
        zIndex:    50,
        width:     isMobile ? 'calc(100% - 32px)' : '320px',
      }}>
        <SearchBar isDark={isDark} onSelectPerson={handleSearchSelect} />
      </div>

      {perspectiveId && isExploration && pendingMatch && (
        <ExplorationBanner
          mode={pendingMatch.mode}
          familyName={pendingMatch.canonicalFamilyName}
          personName={pendingMatch.myPersonName}
          canonicalPersonName={pendingMatch.canonicalPersonName}
          isDark={isDark}
        />
      )}
      {contextMenu && (
        <NodeContextMenu
          nodeId={contextMenu.nodeId}
          x={contextMenu.x}
          y={contextMenu.y}
          personName={contextMenu.personData.fullName}
          gender={contextMenu.personData.gender}
          canEdit={contextMenu.personData.canEdit ?? false}
          canInvite={contextMenu.personData.canInvite ?? false}
          isSelf={contextMenu.personData.isSelf}
          isViewerNode={contextMenu.personData.isViewerNode ?? false}
          onViewTree={() => router.push(`/graph?perspective=${contextMenu.nodeId}`)}
          onEdit={() => { setSelectedNodeId(contextMenu.nodeId); setPanelMode('edit') }}
          onInvite={async () => {
            try {
              const inviteRealId = isGhostNodeId(contextMenu.nodeId) ? realIdFromGhost(contextMenu.nodeId) : contextMenu.nodeId
              const { invite_token } = await api.persons.generateInvite(inviteRealId)
              const url = `${window.location.origin}/invite?token=${invite_token}`
              await navigator.clipboard.writeText(url)
            } catch { /* ignore */ }
          }}
          onMergeNode={() => {
            const { nodeId, personData } = contextMenu
            const realNodeId = isGhostNodeId(nodeId) ? realIdFromGhost(nodeId) : nodeId
            const src = {
              id:        realNodeId,
              name:      personData.fullName,
              photoUrl:  personData.photoUrl ?? null,
              nodeState: personData.nodeState,
              matches:   null as PotentialMatch[] | null,
            }
            setMergeFromNode(src)
            api.merges.searchDuplicates(personData.fullName)
              .then(({ results }) => {
                setMergeFromNode(prev => {
                  if (!prev || prev.id !== src.id) return prev
                  // No matches → fall back to the manual search modal
                  if (results.length === 0) {
                    setMergeFromNode(null)
                    setMergeSearchNode({ id: src.id, name: src.name })
                    return null
                  }
                  return { ...prev, matches: results }
                })
              })
              .catch(() => {
                // On error fall back to manual search
                setMergeFromNode(null)
                setMergeSearchNode({ id: src.id, name: src.name })
              })
          }}
          onClose={() => setContextMenu(null)}
        />
      )}

      <AnimatePresence>
        {panelMode === 'edit' && selectedNodeId && selectedNode && (
          <NodePanel
            key={selectedNodeId}
            node={selectedNode}
            onClose={() => setPanelMode('none')}
            onUpdate={onUpdateNode}
            onSave={onSaveNode}
            rawEdges={rawEdges}
            rawNodes={rawNodes}
            onViewNode={(id) => { setSelectedNodeId(id); setPanelMode('view') }}
            onRemoveConnection={async (edgeId) => {
              await api.relationships.delete(realEdgeId(edgeId))
              await fetchGraph()
            }}
            onRequestAddRelation={() => setNavbarAddTrigger(c => c + 1)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {panelMode === 'view' && selectedNodeId && selectedNode && (
          <PersonProfileView
            key={selectedNodeId}
            node={selectedNode}
            onBack={() => setPanelMode('none')}
            onEdit={() => setPanelMode('edit')}
          />
        )}
      </AnimatePresence>

      {/* Duplicate-found modal — shown after a node is created with matches */}
      {duplicateInfo && (
        <DuplicateFoundModal
          newPersonId={duplicateInfo.newPersonId}
          myInfo={duplicateInfo.myInfo}
          matches={duplicateInfo.matches}
          isDark={isDark}
          onDismiss={() => setDuplicateInfo(null)}
        />
      )}

      {/* Right-click Merge: loading spinner while auto-searching */}
      {mergeFromNode && mergeFromNode.matches === null && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 300,
          background: 'rgba(0,0,0,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
          onClick={() => setMergeFromNode(null)}
        >
          <div style={{
            background: t.panelBg, border: `1.5px solid ${t.borderNeutral}`,
            borderRadius: 16, padding: '28px 36px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
            boxShadow: t.shadow,
          }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid #FDE8CC', borderTopColor: '#EA580C', animation: 'spin 0.8s linear infinite' }} />
            <p style={{ margin: 0, fontSize: 13, color: t.textMuted }}>Searching for matches…</p>
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      )}

      {/* Right-click Merge: DuplicateFoundModal with source node card when matches found */}
      {mergeFromNode && mergeFromNode.matches !== null && mergeFromNode.matches.length > 0 && (
        <DuplicateFoundModal
          newPersonId={mergeFromNode.id}
          myInfo={{ fullName: mergeFromNode.name, photoUrl: mergeFromNode.photoUrl }}
          matches={mergeFromNode.matches}
          isDark={isDark}
          onDismiss={() => setMergeFromNode(null)}
          sourceNode={{ photoUrl: mergeFromNode.photoUrl, nodeState: mergeFromNode.nodeState }}
        />
      )}

      {/* Notification panel — slides in from right */}
      <AnimatePresence>
        {notifPanelOpen && (
          <NotificationPanel
            key="notif-panel"
            isDark={isDark}
            onClose={() => setNotifPanelOpen(false)}
            onMergeAccepted={onMergeAccepted}
          />
        )}
      </AnimatePresence>

      {/* Merge conflict modal — blocks until dismissed so user can't miss it */}
      {mergeConflicts.length > 0 && (
        <MergeConflictModal
          conflicts={mergeConflicts}
          nodes={nodes}
          isDark={isDark}
          onClose={() => setMergeConflicts([])}
        />
      )}

      {/* Merge comparison panel — opened by clicking the highlighted match node */}
      <AnimatePresence>
        {matchPanelOpen && pendingMatch && matchHighlightNode && (
          <MergeComparisonPanel
            key="merge-panel"
            pendingMatch={pendingMatch}
            matchNode={matchHighlightNode}
            nodes={nodes}
            edges={edges}
            isDark={isDark}
            onClose={() => setMatchPanelOpen(false)}
            onNotSamePerson={() => setMatchPanelOpen(false)}
            onRequestSent={() => router.push('/graph')}
            onBackToTree={() => router.push('/graph')}
            onAccepted={onMergeAccepted}
            onRejected={() => router.push('/graph')}
          />
        )}
      </AnimatePresence>

      <Navbar
        familyName={familyName}
        timeline={!isExploration
          ? <TreeTimeline perspectiveId={perspectiveId} perspectiveName={perspectiveName} isDark={isDark} />
          : null}
        selectedNodeId={selectedNodeId}
        selectedNodeName={selectedNodeName}
        canDeleteSelected={canDeleteSelected}
        panelMode={panelMode}
        onHome={onHome}
        onStartWizard={action => {
          // For "Add spouse", check if this person already has an active spouse.
          // If yes, route to the 3-phase SecondSpouseWizard instead.
          if (action === 'spouse' && selectedNodeId) {
            const hasActiveSpouse = rawEdges.some(e => {
              const d = e.data as unknown as { relType?: string; isActive?: boolean } | undefined
              return d?.relType === 'SPOUSE_OF'
                && (e.source === selectedNodeId || e.target === selectedNodeId)
                && d?.isActive !== false
            })
            if (hasActiveSpouse) {
              const anchorRealId = isGhostNodeId(selectedNodeId) ? realIdFromGhost(selectedNodeId) : selectedNodeId
              setSecondSpouseAnchor({ id: anchorRealId, name: selectedNodeName })
              return
            }
          }
          setWizardAction(action)
        }}
        onDeleteSelected={() => onDeleteNode(selectedNodeId!)}
        onEdit={() => setPanelMode(m => m === 'edit' ? 'none' : 'edit')}
        onView={() => setPanelMode(m => m === 'view' ? 'none' : 'view')}
        isMarriedWoman={isMarriedWoman}
        womanView={womanView}
        onWomanViewChange={onWomanViewChange}
        isDark={isDark}
        forceAddOpen={navbarAddTrigger}
      />

      {/* Add node wizard */}
      <AnimatePresence>
        {wizardAction && (
          <AddNodeWizard
            key="add-node-wizard"
            relAction={wizardAction}
            anchorName={selectedNodeName}
            isDark={isDark}
            motherOptions={computeMotherOptions(wizardAction, selectedNodeId && isGhostNodeId(selectedNodeId) ? realIdFromGhost(selectedNodeId) : selectedNodeId, rawEdges, rawNodes)}
            fatherName={computeFatherName(wizardAction, selectedNodeId && isGhostNodeId(selectedNodeId) ? realIdFromGhost(selectedNodeId) : selectedNodeId, rawEdges, rawNodes)}
            onAdd={handleWizardAdd}
            onClose={() => setWizardAction(null)}
          />
        )}
      </AnimatePresence>

      {/* Second-spouse wizard — opened when "Add spouse" hits a node that already
          has an active SPOUSE_OF. Three phases: resolve current marriage,
          add new spouse, re-mother existing children. */}
      <AnimatePresence>
        {secondSpouseAnchor && (
          <SecondSpouseWizard
            key="second-spouse-wizard"
            anchorId={secondSpouseAnchor.id}
            anchorName={secondSpouseAnchor.name}
            existingSpouses={deriveActiveSpousesFromEdges(
              secondSpouseAnchor.id,
              rawEdges,
              rawNodes.map(n => ({ id: n.id, data: n.data as { fullName?: string; isAlive?: boolean } })),
            )}
            existingChildren={deriveChildrenFromEdges(
              secondSpouseAnchor.id,
              rawEdges,
              rawNodes.map(n => ({ id: n.id, data: n.data as { fullName?: string; photoUrl?: string | null } })),
            )}
            isDark={isDark}
            onComplete={async () => { setSecondSpouseAnchor(null); await fetchGraph() }}
            onClose={() => setSecondSpouseAnchor(null)}
          />
        )}
      </AnimatePresence>

      {/* Merge search modal — opened from context menu "Merge node" */}
      <AnimatePresence>
        {mergeSearchNode && (
          <MergeSearchModal
            key="merge-search"
            sourceNodeId={mergeSearchNode.id}
            sourceNodeName={mergeSearchNode.name}
            onClose={() => setMergeSearchNode(null)}
          />
        )}
      </AnimatePresence>

    </div>
  )
}
