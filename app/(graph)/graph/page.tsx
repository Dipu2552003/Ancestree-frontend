'use client'

// Graph page — orchestrates data fetching, overlay state, and composition.
//
// Visual pieces:
//   • DotField           — background dot pattern (always mounted)
//   • GraphCanvasArea    — React Flow canvas + Controls + MiniMap
//   • GraphHUD           — top strip (family badge, search, profile, bell, theme)
//   • ExplorationBanner  — banner shown only in exploration mode
//   • Navbar             — bottom action bar
//   • GraphOverlays      — every modal/panel/wizard, composed centrally
//
// Where things live:
//   • Overlay state cluster → hooks/useGraphPageState
//   • Side-effects          → hooks/useGraphPageEffects
//   • Viewport fit          → hooks/useFitViewportOnLoad
//   • Overlay prop builder  → lib/graph/buildOverlayProps

import { useCallback, useEffect, useMemo, useState, Suspense } from 'react'
import { ReactFlowProvider, useReactFlow } from '@xyflow/react'
import { AnimatePresence } from 'framer-motion'
import { useRouter, useSearchParams } from 'next/navigation'
import DotField from '@/components/graph/DotField'
import Navbar from '@/components/graph/Navbar'
import TreeTimeline from '@/components/graph/TreeTimeline'
import ExplorationBanner from '@/components/graph/ExplorationBanner'
import GraphHUD from '@/components/graph/GraphHUD'
import GraphOverlays from '@/components/graph/GraphOverlays'
import GraphLoading from '@/components/graph/GraphLoading'
import GraphCanvasArea from '@/components/graph/GraphCanvasArea'
import { useGraphStore } from '@/store/graphStore'
import { useGraphData } from '@/hooks/useGraphData'
import { useNodeActions } from '@/hooks/useNodeActions'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useGraphPageState } from '@/hooks/useGraphPageState'
import { useGraphPageEffects } from '@/hooks/useGraphPageEffects'
import { useFitViewportOnLoad } from '@/hooks/useFitViewportOnLoad'
import { getTheme } from '@/lib/theme'
import { api, type MergeConflict } from '@/lib/api'
import { isGhostNodeId, realIdFromGhost } from '@/lib/graph/ghostNodes'
import { checkDeletable } from '@/lib/graph/deleteRules'
import { isDupDismissed, getCommunityId } from '@/lib/storage'
import FamilyAdminsPanel from '@/components/graph/FamilyAdminsPanel'
import { buildOverlayProps } from '@/lib/graph/buildOverlayProps'
import type { PersonData } from '@/types'
import type { RelAction } from '@/components/graph/Navbar'
import type { WizardExtras } from '@/components/graph/AddNodeWizard'
import type { SearchResult } from '@/lib/api'

function asPersonData(data: unknown): PersonData {
  return data as PersonData
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
  const perspectiveId = searchParams.get('perspective') ?? undefined

  const { getNodes, setCenter, fitView } = useReactFlow()
  const { isDark, setIsDark, unreadCount, setNotifications } = useGraphStore()
  const isMobile = useIsMobile()
  const t = getTheme(isDark)

  const s = useGraphPageState()

  // Community mode — set after mount (JWT lives in localStorage). When set,
  // the family badge becomes clickable and opens the admin list panel.
  const [communityId, setCommunityId] = useState<string | null>(null)
  useEffect(() => { setCommunityId(getCommunityId()) }, [])
  const [adminsPanelOpen, setAdminsPanelOpen] = useState(false)

  const {
    nodes, edges, rawNodes, rawEdges,
    setNodes, setEdges,
    onNodesChange, onEdgesChange,
    visibleNodes, displayEdges,
    graphLoading, fetchGraph, resetAndFetch,
    isMarriedWoman, womanView, onWomanViewChange,
    familyName,
  } = useGraphData(perspectiveId)

  // Total real people in the current family. rawNodes is the backend person set
  // before couple/ghost/load-more pseudo-nodes are injected.
  const memberCount = useMemo(
    () => rawNodes.filter(
      n => !n.id.startsWith('couple_')
        && !n.id.startsWith('__load_more')
        && !isGhostNodeId(n.id),
    ).length,
    [rawNodes],
  )

  const { onUpdateNode, onSaveNode, onDeleteNode, onAddRelation } = useNodeActions(
    rawNodes, rawEdges, setNodes, setEdges, fetchGraph, s.selectedNodeId, s.setSelectedNodeId,
    (newPersonId, matches, myInfo) => {
      if (isDupDismissed(newPersonId)) return
      s.setDuplicateInfo({ newPersonId, matches, myInfo })
    },
  )

  // Exploration mode — true when we're viewing another tree to evaluate a merge.
  // When the exploration banner occupies the top strip, push the whole HUD row
  // down so nothing overlaps it.
  const isExploration    = !!perspectiveId && !!s.pendingMatch
  const EXPLORE_BANNER_H = 46
  const hudOffset        = isExploration ? EXPLORE_BANNER_H : 0
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

  useGraphPageEffects({ s, perspectiveId, nodes, graphLoading, isExploration, matchHighlightNode })

  const perspectivePerson = perspectiveId
    ? nodes.find(n => asPersonData(n.data)?.isSelf) ?? null
    : null
  const perspectiveName   = asPersonData(perspectivePerson?.data)?.fullName ?? ''
  const selectedNode      = s.selectedNodeId ? nodes.find(n => n.id === s.selectedNodeId) ?? null : null
  const selectedNodeName  = asPersonData(selectedNode?.data)?.fullName ?? ''
  const selectedIsSelf    = asPersonData(selectedNode?.data)?.isSelf ?? false
  const selectedIsClaimed = asPersonData(selectedNode?.data)?.nodeState === 'claimed'
  // Deletable = not you, not a claimed account, and an edge node — removing
  // them must not split the tree (see lib/graph/deleteRules.ts).
  const deleteCheck = useMemo(
    () => s.selectedNodeId ? checkDeletable(s.selectedNodeId, rawNodes, rawEdges) : null,
    [s.selectedNodeId, rawNodes, rawEdges],
  )
  const canDeleteSelected = !!s.selectedNodeId && !selectedIsSelf && !selectedIsClaimed
    && (deleteCheck?.deletable ?? false)
  const deleteDisabledReason = !s.selectedNodeId ? undefined
    : selectedIsSelf            ? 'You cannot remove your own node'
    : selectedIsClaimed         ? 'Claimed profiles cannot be removed'
    : deleteCheck?.deletable === false
      ? 'Connects other family members — remove the people beyond them first'
      : undefined

  const canvasReady = useFitViewportOnLoad({
    graphLoading,
    visibleNodesCount: visibleNodes.length,
    perspectiveId,
  })

  const onHome = useCallback(() => {
    const self = getNodes().find(n => asPersonData(n.data)?.isSelf)
    if (self) setCenter(self.position.x + 64, self.position.y + 70, { zoom: 1, duration: 600 })
    else fitView({ padding: 0.35, duration: 600 })
  }, [getNodes, setCenter, fitView])

  const handleSearchSelect = useCallback((personId: string): boolean => {
    const canvasNodes = getNodes()
    const node = canvasNodes.find(n => n.id === personId)
    if (!node) return false
    setCenter(node.position.x + 64, node.position.y + 79, { zoom: 1.2, duration: 500 })
    s.setSelectedNodeId(personId)
    s.setPanelMode('view')
    return true
  }, [getNodes, setCenter, s])

  const handleWizardAdd = useCallback(async (action: RelAction, fullName: string, extras: WizardExtras) => {
    await onAddRelation(action, fullName, extras)
    s.setWizardAction(null)
    s.setPanelMode('edit')
  }, [onAddRelation, s])

  const handleWizardAddForMerge = useCallback(async (action: RelAction, match: SearchResult) => {
    const personId = await onAddRelation(action, match.full_name, {})
    if (personId) {
      try { await api.merges.create({ new_person_id: personId, canonical_person_id: match.id }) }
      catch { /* merge request non-critical — proxy node already created */ }
    }
    s.setWizardAction(null)
    s.setPanelMode('edit')
  }, [onAddRelation, s])

  const onMergeAccepted = useCallback((conflicts: MergeConflict[]) => {
    // Use resetAndFetch so collapse state is recomputed to include the newly-added family unit.
    resetAndFetch()
    // Refresh notification list so all family members' unread counts update
    api.notifications.list()
      .then(({ notifications, unread_count }) => setNotifications(notifications, unread_count))
      .catch(() => {})
    s.setNotifPanelOpen(false)
    s.setMatchPanelOpen(false)
    if (isExploration) router.push('/graph')
    if (conflicts.length > 0) s.setMergeConflicts(conflicts)
  }, [resetAndFetch, isExploration, router, setNotifications, s])

  if (graphLoading) return <GraphLoading isDark={isDark} />

  // Resolve the anchor's "real" id (ghost-stripped) once — used by both wizards.
  const anchorRealId = s.selectedNodeId && isGhostNodeId(s.selectedNodeId)
    ? realIdFromGhost(s.selectedNodeId)
    : s.selectedNodeId

  const overlays = buildOverlayProps({
    s, selectedNode, selectedNodeName, matchHighlightNode, anchorRealId,
    nodes, edges, rawNodes, rawEdges,
    router, fetchGraph, resetAndFetch, onUpdateNode, onSaveNode,
    handleWizardAdd, handleWizardAddForMerge, onMergeAccepted,
  })

  return (
    <div className="app-viewport" style={{ position: 'relative', overflow: 'hidden', background: t.pageBg, transition: 'background 0.4s' }}>
      <DotField isDark={isDark} />

      <GraphCanvasArea
        isDark={isDark} isMobile={isMobile} canvasReady={canvasReady}
        nodes={explorationNodes} edges={displayEdges}
        onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
        onPaneClick={() => {
          s.setContextMenu(null)
          s.setSelectedNodeId(null)
          s.setPanelMode('none')
        }}
        onNodeClick={id => {
          s.setContextMenu(null)
          if (id.startsWith('couple_')) return
          // Synthetic UI chips (load-more) handle their own click — don't open the panel.
          if (id.startsWith('__load_more_')) return
          // In exploration mode, clicking the highlighted node opens the merge comparison panel.
          if (isExploration && matchHighlightNode && id === matchHighlightNode.id) {
            s.setMatchPanelOpen(true)
            return
          }
          s.setSelectedNodeId(prev => {
            if (prev === id) { s.setPanelMode('none'); return null }
            s.setPanelMode('view')
            return id
          })
        }}
        onNodeContextMenu={(event, nodeId) => {
          const node = nodes.find(n => n.id === nodeId)
          if (!node) return
          s.setSelectedNodeId(null)
          s.setPanelMode('none')
          s.setContextMenu({ nodeId, x: event.clientX, y: event.clientY, personData: asPersonData(node.data) })
        }}
      />

      <GraphHUD
        familyName={familyName}
        memberCount={memberCount}
        unreadCount={unreadCount}
        isDark={isDark}
        isMobile={isMobile}
        hudOffset={hudOffset}
        onToggleTheme={() => setIsDark(!isDark)}
        onToggleNotif={() => { s.setHistoryPanelOpen(false); setAdminsPanelOpen(false); s.setNotifPanelOpen(v => !v) }}
        onToggleHistory={() => { s.setNotifPanelOpen(false); setAdminsPanelOpen(false); s.setHistoryPanelOpen(v => !v) }}
        onSelectPerson={handleSearchSelect}
        onFamilyClick={communityId ? () => {
          s.setNotifPanelOpen(false)
          s.setHistoryPanelOpen(false)
          setAdminsPanelOpen(v => !v)
        } : undefined}
      />

      {/* Family admin list — community mode only */}
      <AnimatePresence>
        {adminsPanelOpen && (
          <FamilyAdminsPanel
            isDark={isDark}
            familyName={familyName}
            rawNodes={rawNodes}
            onClose={() => setAdminsPanelOpen(false)}
          />
        )}
      </AnimatePresence>

      {perspectiveId && isExploration && s.pendingMatch && (
        <ExplorationBanner
          mode={s.pendingMatch.mode}
          canonicalPersonName={s.pendingMatch.canonicalPersonName}
          personName={s.pendingMatch.myPersonName}
          isDark={isDark}
        />
      )}

      <Navbar
        familyName={familyName}
        timeline={!isExploration
          ? <TreeTimeline perspectiveId={perspectiveId} perspectiveName={perspectiveName} isDark={isDark} />
          : null}
        selectedNodeId={s.selectedNodeId}
        selectedNodeName={selectedNodeName}
        canDeleteSelected={canDeleteSelected}
        deleteDisabledReason={deleteDisabledReason}
        deleteChildrenNote={deleteCheck?.childrenStayWith ?? null}
        panelMode={s.panelMode}
        onHome={onHome}
        onStartWizard={action => {
          // For "Add spouse", if the anchor already has an active spouse, route
          // to the 3-phase SecondSpouseWizard instead.
          if (action === 'spouse' && s.selectedNodeId) {
            const hasActiveSpouse = rawEdges.some(e => {
              const d = e.data as unknown as { relType?: string; isActive?: boolean } | undefined
              return d?.relType === 'SPOUSE_OF'
                && (e.source === s.selectedNodeId || e.target === s.selectedNodeId)
                && d?.isActive !== false
            })
            if (hasActiveSpouse) {
              if (anchorRealId) s.setSecondSpouseAnchor({ id: anchorRealId, name: selectedNodeName })
              return
            }
          }
          s.setWizardAction(action)
        }}
        onDeleteSelected={() => onDeleteNode(s.selectedNodeId!)}
        onEdit={() => s.setPanelMode(m => m === 'edit' ? 'none' : 'edit')}
        onView={() => s.setPanelMode(m => m === 'view' ? 'none' : 'view')}
        isMarriedWoman={isMarriedWoman}
        womanView={womanView}
        onWomanViewChange={onWomanViewChange}
        isDark={isDark}
        forceAddOpen={s.navbarAddTrigger}
      />

      <GraphOverlays isDark={isDark} {...overlays} />
    </div>
  )
}
