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
import PerspectiveBanner from '@/components/graph/PerspectiveBanner'
import ExplorationBanner from '@/components/graph/ExplorationBanner'
import DuplicateFoundModal from '@/components/graph/DuplicateFoundModal'
import NotificationPanel from '@/components/graph/NotificationPanel'
import MergeConflictModal from '@/components/graph/MergeConflictModal'
import MergeComparisonPanel from '@/components/graph/MergeComparisonPanel'
import { useGraphStore } from '@/store/graphStore'
import { useGraphData } from '@/hooks/useGraphData'
import { useNodeActions } from '@/hooks/useNodeActions'
import { getTheme } from '@/lib/theme'
import { api, getToken, type PotentialMatch, type MergeConflict } from '@/lib/api'
import type { PersonData, PendingMatchData, MyPersonInfo } from '@/types'
import type { RelAction } from '@/components/graph/Navbar'

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
  const perspectiveId  = searchParams.get('perspective') ?? undefined
  const viewMergeParam = searchParams.get('viewMerge') ?? undefined

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
  const { isDark, setIsDark, unreadCount, setNotifications } = useGraphStore()
  const t = getTheme(isDark)

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [panelMode, setPanelMode] = useState<'none' | 'edit' | 'view'>('none')
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

  const {
    nodes, edges, setNodes, setEdges,
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

  // When adding a relation from the Navbar, auto-open edit panel for the new node
  const onNavbarAddRelation = useCallback(async (action: RelAction, name: string) => {
    await onAddRelation(action, name)
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
              setPanelMode('edit')
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
        <MiniMap
          style={{ pointerEvents: 'all', background: t.mapBg, border: `1.5px solid ${t.controlBorder}`, borderRadius: '6px' }}
          nodeColor={n => n.data?.isSelf ? '#EA580C' : n.data?.nodeState === 'claimed' ? '#22C55E' : isDark ? '#4A3F35' : '#D97706'}
        />
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
        <span style={{ fontSize: '15px', lineHeight: 1 }}>🌸</span>
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
      <div style={{ position: 'absolute', top: '16px', right: '64px', zIndex: 50 }}>
        <button
          onClick={() => setNotifPanelOpen(v => !v)}
          style={{ position: 'relative', width: '38px', height: '38px', borderRadius: '8px', background: t.toggleBg, color: t.toggleColor, border: `1.5px solid ${t.toggleBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: isDark ? '0 2px 12px rgba(0,0,0,0.5)' : '0 2px 8px rgba(0,0,0,0.12)', transition: 'background 0.3s, color 0.3s' }}
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
        style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 50, width: '38px', height: '38px', borderRadius: '8px', background: t.toggleBg, color: t.toggleColor, border: `1.5px solid ${t.toggleBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: isDark ? '0 2px 12px rgba(0,0,0,0.5)' : '0 2px 8px rgba(0,0,0,0.12)', transition: 'background 0.3s, color 0.3s' }}
        title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {isDark ? <IconSun size={17} /> : <IconMoon size={17} />}
      </button>


      {/* Search bar — centered top */}
      <div style={{
        position:  'absolute',
        top:       '16px',
        left:      '50%',
        transform: 'translateX(-50%)',
        zIndex:    50,
        width:     '320px',
      }}>
        <SearchBar isDark={isDark} />
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
      {perspectiveId && !isExploration && perspectiveName && (
        <PerspectiveBanner
          personName={perspectiveName}
          onBack={() => router.push('/graph')}
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
          onEdit={() => setSelectedNodeId(contextMenu.nodeId)}
          onInvite={async () => {
            try {
              const { invite_token } = await api.persons.generateInvite(contextMenu.nodeId)
              const url = `${window.location.origin}/invite?token=${invite_token}`
              await navigator.clipboard.writeText(url)
            } catch { /* ignore */ }
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
            onViewProfile={() => setPanelMode('view')}
            onUpdate={onUpdateNode}
            onSave={onSaveNode}
            onAddParent={async (name) => { await onAddRelation('father',  name) }}
            onAddChild={async  (name) => { await onAddRelation('son',     name) }}
            onAddSpouse={async (name) => { await onAddRelation('spouse',  name) }}
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
        selectedNodeId={selectedNodeId}
        selectedNodeName={selectedNodeName}
        canDeleteSelected={canDeleteSelected}
        panelMode={panelMode}
        onHome={onHome}
        onAddRelation={onNavbarAddRelation}
        onDeleteSelected={() => onDeleteNode(selectedNodeId!)}
        onEdit={() => setPanelMode(m => m === 'edit' ? 'none' : 'edit')}
        onView={() => setPanelMode(m => m === 'view' ? 'none' : 'view')}
        isMarriedWoman={isMarriedWoman}
        womanView={womanView}
        onWomanViewChange={onWomanViewChange}
        isDark={isDark}
      />
    </div>
  )
}
