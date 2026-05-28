'use client'

import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import {
  useNodesState, useEdgesState, ReactFlowProvider, Controls, MiniMap,
  useReactFlow, type Node, type Edge,
} from '@xyflow/react'
import { IconSun, IconMoon } from '@tabler/icons-react'
import GraphCanvas from '@/components/graph/GraphCanvas'
import DotField from '@/components/graph/DotField'
import NodePanel from '@/components/graph/NodePanel'
import PersonProfileView from '@/components/graph/PersonProfileView'
import Navbar, { type RelAction } from '@/components/graph/Navbar'
import TimelineRuler from '@/components/graph/TimelineRuler'
import { useGraphStore } from '@/store/graphStore'
import { api, getToken } from '@/lib/api'
import { LAYOUT_MAP, type LayoutId } from '@/lib/layouts'
import { classifyFamilySides } from '@/lib/layouts/classifyNodes'

// ── BFS from self node to compute staggered animation delays ─────────
function bfsDelays(nodes: Node[], edges: Edge[]): Map<string, number> {
  const selfId = nodes.find(n => (n.data as Record<string, unknown>).isSelf)?.id
  if (!selfId) return new Map(nodes.map(n => [n.id, 0]))

  const adj = new Map<string, string[]>()
  for (const n of nodes) adj.set(n.id, [])
  for (const e of edges) {
    const rel = (e.data as Record<string, unknown>)?.relType as string
    if (rel === 'PARENT_OF' || rel === 'SPOUSE_OF') {
      adj.get(e.source)?.push(e.target)
      adj.get(e.target)?.push(e.source)
    }
  }

  const delays = new Map<string, number>([[selfId, 0]])
  const queue: Array<{ id: string; depth: number }> = [{ id: selfId, depth: 0 }]
  while (queue.length > 0) {
    const { id, depth } = queue.shift()!
    for (const nb of adj.get(id) ?? []) {
      if (!delays.has(nb)) {
        delays.set(nb, (depth + 1) * 140)
        queue.push({ id: nb, depth: depth + 1 })
      }
    }
  }
  const maxDelay = Math.max(0, ...[...delays.values()])
  for (const n of nodes) {
    if (!delays.has(n.id)) delays.set(n.id, maxDelay + 140)
  }
  return delays
}

// ── build display edges: family junction edges + remaining singles ──
// - Couples with shared children → single `familyEdge` (junction rendering)
// - PARENT_OF to co-parented children → removed (covered by familyEdge)
// - SPOUSE_OF for couples with shared children → removed (covered by familyEdge)
// - SIBLING_OF → removed (relationship visible from shared parents)
// - Single-parent PARENT_OF and childless SPOUSE_OF → kept with handle assignments
function buildDisplayEdges(nodes: Node[], edges: Edge[]): Edge[] {
  const posMap   = new Map(nodes.map(n => [n.id, n.position]))
  const delayMap = new Map(nodes.map(n => [n.id, (n.data as Record<string, unknown>).animDelay as number ?? 0]))
  const parentsOf  = new Map<string, string[]>()
  const childrenOf = new Map<string, string[]>()

  const edgeDelay = (a: string, b: string) =>
    Math.max(delayMap.get(a) ?? 0, delayMap.get(b) ?? 0) + 70

  for (const e of edges) {
    const rel = (e.data as Record<string, unknown>)?.relType
    if (rel === 'PARENT_OF') {
      if (!parentsOf.has(e.target))  parentsOf.set(e.target, [])
      if (!childrenOf.has(e.source)) childrenOf.set(e.source, [])
      parentsOf.get(e.target)!.push(e.source)
      childrenOf.get(e.source)!.push(e.target)
    }
  }

  const coveredParentIds = new Set<string>()
  const coveredSpouseIds = new Set<string>()
  const familyEdges: Edge[] = []
  const processedPairs = new Set<string>()

  for (const e of edges) {
    const rel = (e.data as Record<string, unknown>)?.relType
    if (rel !== 'SPOUSE_OF') continue

    const pairKey = [e.source, e.target].sort().join('|')
    if (processedPairs.has(pairKey)) continue
    processedPairs.add(pairKey)

    const myKids     = new Set(childrenOf.get(e.source) ?? [])
    const sharedKids = (childrenOf.get(e.target) ?? []).filter(c => myKids.has(c))
    if (sharedKids.length === 0) continue

    familyEdges.push({
      id: `family-${pairKey}`,
      source: e.source,
      target: e.target,
      type: 'familyEdge',
      data: { sharedChildren: sharedKids, animDelay: edgeDelay(e.source, e.target) },
    } as Edge)

    coveredSpouseIds.add(e.id)

    for (const kid of sharedKids) {
      for (const parentId of (parentsOf.get(kid) ?? [])) {
        const pe = edges.find(x =>
          x.source === parentId && x.target === kid &&
          (x.data as Record<string, unknown>)?.relType === 'PARENT_OF'
        )
        if (pe) coveredParentIds.add(pe.id)
      }
    }
  }

  const result: Edge[] = [...familyEdges]

  for (const e of edges) {
    const rel = (e.data as Record<string, unknown>)?.relType
    if (rel === 'SIBLING_OF')        continue
    if (coveredSpouseIds.has(e.id))  continue
    if (coveredParentIds.has(e.id))  continue

    const d = edgeDelay(e.source, e.target)
    if (rel === 'PARENT_OF') {
      result.push({ ...e, sourceHandle: 'bottom', targetHandle: 'top', data: { ...(e.data as Record<string, unknown>), animDelay: d } })
    } else if (rel === 'SPOUSE_OF') {
      const sp = posMap.get(e.source)
      const tp = posMap.get(e.target)
      result.push(sp && tp && sp.x <= tp.x
        ? { ...e, sourceHandle: 'right-s', targetHandle: 'left',  data: { ...(e.data as Record<string, unknown>), animDelay: d } }
        : { ...e, sourceHandle: 'left-s',  targetHandle: 'right', data: { ...(e.data as Record<string, unknown>), animDelay: d } }
      )
    } else {
      result.push({ ...e, data: { ...(e.data as Record<string, unknown>), animDelay: d } })
    }
  }

  return result
}

// ── outer shell — just provides the ReactFlow context ─────────────
export default function GraphPage() {
  return (
    <ReactFlowProvider>
      <GraphInner />
    </ReactFlowProvider>
  )
}

// ── inner — has access to useReactFlow ────────────────────────────
function GraphInner() {
  const router = useRouter()
  const { fitView, setCenter, getNodes } = useReactFlow()
  const { isDark, setIsDark } = useGraphStore()

  const initialLoadDone = useRef(false)

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [profileNodeId, setProfileNodeId]   = useState<string | null>(null)
  const [graphLoading, setGraphLoading]     = useState(true)
  const [familyName, setFamilyName]         = useState('Family')
  const [layoutId, setLayoutId]             = useState<LayoutId>('default')
  const layoutIdRef = useRef<LayoutId>('default')

  const selectedNode = selectedNodeId ? nodes.find(n => n.id === selectedNodeId) ?? null : null
  const profileNode  = profileNodeId  ? nodes.find(n => n.id === profileNodeId)  ?? null : null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const selectedNodeName: string   = (selectedNode?.data as any)?.fullName ?? ''
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const selectedNodeIsSelf: boolean = (selectedNode?.data as any)?.isSelf ?? false
  // Enable delete for any selected node except the user's own self-node.
  // Server enforces creator/admin check and returns 403 if not permitted.
  const canDeleteSelected: boolean = !!selectedNodeId && !selectedNodeIsSelf

  // ── graph fetch ───────────────────────────────────────────────
  const fetchGraph = useCallback(async () => {
    try {
      const data = await api.graph.fetch()
      const rawEdges      = data.edges.map(e => ({ ...e, type: 'sketchEdge' }))
      const layoutedNodes = LAYOUT_MAP.get(layoutIdRef.current)!.algorithm(data.nodes, rawEdges)
      if (!initialLoadDone.current) {
        initialLoadDone.current = true
        const delays = bfsDelays(layoutedNodes, rawEdges)
        setNodes(layoutedNodes.map((n: Node) => ({
          ...n,
          data: { ...(n.data as object), animDelay: delays.get(n.id) ?? 0 },
        })))
      } else {
        setNodes(layoutedNodes)
      }
      setEdges(rawEdges)
    } catch (err) {
      console.error('Failed to fetch graph:', err)
    } finally {
      setGraphLoading(false)
    }
  }, [setNodes, setEdges])

  // ── default layout filter: hide wife-side extended family ────────
  // Any wife/spouse that bridges into the main tree is kept visible.
  // Her parents, siblings, and their descendants are hidden.
  const idsToHide = useMemo(() => {
    if (layoutId !== 'default') return new Set<string>()
    const cls = classifyFamilySides(nodes, edges)
    if (!cls) return new Set<string>()
    const { maternalSet } = cls

    // A maternal node with a SPOUSE_OF edge to a non-maternal node is a
    // bridge (Mummy, or any other wife) — keep her visible.
    const keepVisible = new Set<string>()
    for (const e of edges) {
      const rel = (e.data as Record<string, unknown>)?.relType
      if (rel !== 'SPOUSE_OF') continue
      if (maternalSet.has(e.source) && !maternalSet.has(e.target)) keepVisible.add(e.source)
      if (maternalSet.has(e.target) && !maternalSet.has(e.source)) keepVisible.add(e.target)
    }

    const hide = new Set<string>()
    for (const id of maternalSet) {
      if (!keepVisible.has(id)) hide.add(id)
    }
    return hide
  }, [layoutId, nodes, edges])

  const visibleNodes = useMemo(
    () => idsToHide.size > 0 ? nodes.filter(n => !idsToHide.has(n.id)) : nodes,
    [nodes, idsToHide],
  )

  const visibleEdges = useMemo(
    () => idsToHide.size > 0
      ? edges.filter(e => !idsToHide.has(e.source) && !idsToHide.has(e.target))
      : edges,
    [edges, idsToHide],
  )

  // ── display edges: family junctions + single-parent lines ────────
  const displayEdges = useMemo(() => buildDisplayEdges(visibleNodes, visibleEdges), [visibleNodes, visibleEdges])

  // ── auth guard + initial load ─────────────────────────────────
  useEffect(() => {
    if (!getToken()) { router.replace('/login'); return }

    // derive family name from stored user
    try {
      const raw = localStorage.getItem('user')
      if (raw) {
        const u = JSON.parse(raw) as { display_name?: string }
        if (u.display_name) {
          const last = u.display_name.trim().split(' ').pop() ?? u.display_name
          setFamilyName(last)
        }
      }
    } catch { /* ignore */ }

    fetchGraph()
  }, [fetchGraph, router])

  // ── re-center on self node ────────────────────────────────────
  const onHome = useCallback(() => {
    const self = getNodes().find(n => (n.data as Record<string, unknown>)?.isSelf)
    if (self) {
      setCenter(self.position.x + 64, self.position.y + 70, { zoom: 1, duration: 600 })
    } else {
      fitView({ padding: 0.35, duration: 600 })
    }
  }, [getNodes, setCenter, fitView])

  // ── node click ────────────────────────────────────────────────
  const onNodeClick = useCallback((nodeId: string) => {
    setSelectedNodeId(prev => prev === nodeId ? null : nodeId)
    setProfileNodeId(null)
  }, [])

  const onClosePanel   = useCallback(() => setSelectedNodeId(null), [])
  const onCloseProfile = useCallback(() => setProfileNodeId(null), [])

  // ── update node local state ───────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onUpdateNode = useCallback((id: string, newData: any) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, data: { ...n.data, ...newData } } : n))
  }, [setNodes])

  // ── delete node ──────────────────────────────────────────────
  const onDeleteNode = useCallback(async (id: string) => {
    await api.persons.delete(id)
    setNodes(prev => prev.filter(n => n.id !== id))
    setEdges(prev => prev.filter(e => e.source !== id && e.target !== id))
    setSelectedNodeId(null)
  }, [setNodes, setEdges])

  // ── persist changes to backend ───────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onSaveNode = useCallback(async (id: string, payload: any) => {
    await api.persons.update(id, {
      full_name:       payload.fullName,
      nickname:        payload.nickname ?? null,
      gender:          payload.gender ?? null,
      birth_year:      payload.birthYear ?? null,
      birth_place:     payload.birthPlace ?? null,
      is_alive:        payload.isAlive,
      death_year:      payload.deathYear ?? null,
      photo_url:       payload.photoUrl ?? null,
      gotra:           payload.gotra ?? null,
      native_village:  payload.nativeVillage ?? null,
      current_city:    payload.currentCity ?? null,
      current_country: payload.currentCountry ?? null,
      occupation:      payload.occupation ?? null,
      bio:             payload.bio ?? null,
      education:       payload.education ?? null,
    })
    onUpdateNode(id, {
      fullName: payload.fullName, nickname: payload.nickname,
      gender: payload.gender, birthYear: payload.birthYear,
      birthPlace: payload.birthPlace, isAlive: payload.isAlive,
      isDeceased: payload.isDeceased, deathYear: payload.deathYear,
      photoUrl: payload.photoUrl, gotra: payload.gotra,
      nativeVillage: payload.nativeVillage, currentCity: payload.currentCity,
      currentCountry: payload.currentCountry, occupation: payload.occupation,
      bio: payload.bio, education: payload.education,
    })
  }, [onUpdateNode])

  // ── layout switching ─────────────────────────────────────────
  const onLayoutChange = useCallback((id: LayoutId) => {
    layoutIdRef.current = id
    setLayoutId(id)
    setNodes(prev => LAYOUT_MAP.get(id)!.algorithm(prev, edges))
  }, [edges, setNodes])

  // ── add relation via Navbar ───────────────────────────────────
  const onAddRelation = useCallback(async (action: RelAction) => {
    if (!selectedNodeId) return
    const genderMap: Partial<Record<RelAction, string>> = {
      father: 'male', mother: 'female',
      son: 'male', daughter: 'female',
      brother: 'male', sister: 'female',
    }
    const gender = genderMap[action]
    try {
      const person = await api.persons.create({
        full_name: 'Unknown', is_alive: true, ...(gender ? { gender } : {}),
      })
      const relMap: Record<RelAction, 'PARENT_OF' | 'SPOUSE_OF' | 'SIBLING_OF'> = {
        father: 'PARENT_OF', mother: 'PARENT_OF',
        son: 'PARENT_OF', daughter: 'PARENT_OF',
        brother: 'SIBLING_OF', sister: 'SIBLING_OF',
        spouse: 'SPOUSE_OF',
      }
      const isParentOfChild = action === 'son' || action === 'daughter'
      const isParent = action === 'father' || action === 'mother'
      await api.relationships.create({
        from_person_id: isParentOfChild ? selectedNodeId : person.id,
        to_person_id:   isParentOfChild ? person.id : selectedNodeId,
        rel_type: relMap[action],
      })

      // Auto-create spouse link between co-parents
      if (isParent) {
        // Find existing parents of selectedNodeId
        const existingParents = edges
          .filter(e => e.target === selectedNodeId && (e.data as Record<string,unknown>)?.relType === 'PARENT_OF')
          .map(e => e.source)
        for (const parentId of existingParents) {
          try {
            await api.relationships.create({
              from_person_id: person.id,
              to_person_id: parentId,
              rel_type: 'SPOUSE_OF',
            })
          } catch { /* ignore duplicate */ }
        }
      }

      // Auto-create parent link from existing spouse to new child
      if (isParentOfChild) {
        const spouses = edges
          .filter(e => (e.data as Record<string,unknown>)?.relType === 'SPOUSE_OF' && (e.source === selectedNodeId || e.target === selectedNodeId))
          .map(e => e.source === selectedNodeId ? e.target : e.source)
        for (const spouseId of spouses) {
          try {
            await api.relationships.create({
              from_person_id: spouseId,
              to_person_id: person.id,
              rel_type: 'PARENT_OF',
            })
          } catch { /* ignore duplicate */ }
        }
      }

      // When adding a spouse, connect new spouse as co-parent of all existing children
      if (action === 'spouse') {
        const existingChildren = edges
          .filter(e => e.source === selectedNodeId && (e.data as Record<string,unknown>)?.relType === 'PARENT_OF')
          .map(e => e.target)
        for (const childId of existingChildren) {
          try {
            await api.relationships.create({
              from_person_id: person.id,
              to_person_id: childId,
              rel_type: 'PARENT_OF',
            })
          } catch { /* ignore duplicate */ }
        }
      }

      // When adding a sibling, connect the new sibling to all existing parents
      if (action === 'brother' || action === 'sister') {
        const existingParents = edges
          .filter(e => e.target === selectedNodeId && (e.data as Record<string,unknown>)?.relType === 'PARENT_OF')
          .map(e => e.source)
        for (const parentId of existingParents) {
          try {
            await api.relationships.create({
              from_person_id: parentId,
              to_person_id: person.id,
              rel_type: 'PARENT_OF',
            })
          } catch { /* ignore duplicate */ }
        }
      }

      await fetchGraph()
      setSelectedNodeId(person.id)
    } catch (err) {
      console.error('Failed to add relation:', err)
    }
  }, [selectedNodeId, edges, fetchGraph])

  // ── 3D tilt ───────────────────────────────────────────────────
  const rawX = useMotionValue(0)
  const rawY = useMotionValue(0)
  const springX = useSpring(rawX, { stiffness: 50, damping: 18 })
  const springY = useSpring(rawY, { stiffness: 50, damping: 18 })
  const rotateY = useTransform(springX, [-0.5, 0.5], [-8, 8])
  const rotateX = useTransform(springY, [-0.5, 0.5], [5, -5])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    rawX.set((e.clientX - rect.left) / rect.width - 0.5)
    rawY.set((e.clientY - rect.top) / rect.height - 0.5)
  }, [rawX, rawY])

  const handleMouseLeave = useCallback(() => { rawX.set(0); rawY.set(0) }, [rawX, rawY])

  // ── theme tokens ──────────────────────────────────────────────
  const dotBg        = isDark ? '#0B0A09' : '#FFF7ED'
  const toggleBg     = isDark ? '#2A2520' : '#1A0A00'
  const toggleColor  = isDark ? '#EDE8E3' : '#FFF7ED'
  const toggleBorder = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.15)'
  const ctrlBg       = isDark ? '#1C1A18' : 'white'
  const ctrlBdr      = isDark ? 'rgba(255,255,255,0.08)' : '#FDE8CC'
  const mapBg        = isDark ? '#141210' : '#FFFBF4'

  // ── loading state ─────────────────────────────────────────────
  if (graphLoading) {
    return (
      <div style={{
        height: '100vh', background: dotBg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background 0.4s',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '50%',
            border: '3px solid #FDE8CC', borderTopColor: '#EA580C',
            animation: 'spin 0.8s linear infinite', margin: '0 auto 16px',
          }} />
          <p style={{ color: '#9A6C3C', fontSize: '14px', margin: 0 }}>
            Loading your family tree…
          </p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  return (
    <div
      style={{ position: 'relative', height: '100vh', overflow: 'hidden', perspective: '1100px', background: dotBg, transition: 'background 0.4s' }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <DotField isDark={isDark} />

      {/* 3D tilt canvas */}
      <motion.div style={{ position: 'absolute', inset: 0, zIndex: 1, rotateY, rotateX, transformOrigin: 'center center' }}>
        <GraphCanvas
          nodes={visibleNodes} edges={displayEdges}
          onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
        />
      </motion.div>

      {/* Fixed HUD */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 10, pointerEvents: 'none' }}>
        <Controls style={{
          pointerEvents: 'all',
          background: ctrlBg, border: `1.5px solid ${ctrlBdr}`,
          borderRadius: '6px',
          boxShadow: isDark ? '0 2px 12px rgba(0,0,0,0.4)' : '0 2px 8px rgba(0,0,0,0.06)',
        }} />
        {layoutId !== 'timeline' && (
          <MiniMap
            style={{
              pointerEvents: 'all',
              background: mapBg, border: `1.5px solid ${ctrlBdr}`, borderRadius: '6px',
            }}
            nodeColor={n =>
              n.data?.isSelf ? '#EA580C'
                : n.data?.nodeState === 'claimed' ? '#22C55E'
                  : isDark ? '#4A3F35' : '#D97706'
            }
          />
        )}
      </div>

      {/* Theme toggle — top right */}
      <button
        onClick={() => setIsDark(!isDark)}
        style={{
          position: 'absolute', top: '16px', right: '16px', zIndex: 50,
          width: '38px', height: '38px', borderRadius: '8px',
          background: toggleBg, color: toggleColor,
          border: `1.5px solid ${toggleBorder}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: isDark ? '0 2px 12px rgba(0,0,0,0.5)' : '0 2px 8px rgba(0,0,0,0.12)',
          transition: 'background 0.3s, color 0.3s',
        }}
        title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {isDark ? <IconSun size={17} /> : <IconMoon size={17} />}
      </button>

      {/* Timeline ruler — only in timeline mode */}
      {layoutId === 'timeline' && <TimelineRuler isDark={isDark} />}

      {/* Edit panel */}
      <AnimatePresence>
        {selectedNodeId && selectedNode && (
          <NodePanel
            key={selectedNodeId}
            node={selectedNode}
            onClose={onClosePanel}
            onViewProfile={() => { setProfileNodeId(selectedNodeId); setSelectedNodeId(null) }}
            onUpdate={onUpdateNode}
            onSave={onSaveNode}
            onAddParent={id => onAddRelation('father').then(() => setSelectedNodeId(id))}
            onAddChild={id  => onAddRelation('son').then(() => setSelectedNodeId(id))}
            onAddSpouse={id => onAddRelation('spouse').then(() => setSelectedNodeId(id))}
          />
        )}
      </AnimatePresence>

      {/* Profile view */}
      <AnimatePresence>
        {profileNodeId && profileNode && (
          <PersonProfileView
            key={profileNodeId}
            node={profileNode}
            onBack={onCloseProfile}
            onEdit={() => { setSelectedNodeId(profileNodeId); setProfileNodeId(null) }}
          />
        )}
      </AnimatePresence>

      {/* Navbar */}
      <Navbar
        familyName={familyName}
        selectedNodeId={selectedNodeId}
        selectedNodeName={selectedNodeName}
        canDeleteSelected={canDeleteSelected}
        layoutId={layoutId}
        onHome={onHome}
        onAddRelation={onAddRelation}
        onDeleteSelected={() => onDeleteNode(selectedNodeId!)}
        onLayoutChange={onLayoutChange}
        isDark={isDark}
      />
    </div>
  )
}
