'use client'

import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  useNodesState, useEdgesState,
  type Node, type Edge, type NodeChange, type EdgeChange,
} from '@xyflow/react'
import type { Dispatch, SetStateAction } from 'react'
import type { PersonData } from '@/types'
import { api, getToken, setToken } from '@/lib/api'
import { layoutEngine } from '@/lib/layouts/layoutEngine'
import { filterGraphBySide, type WomanView } from '@/lib/layouts/familySideFilter'
import { computeNodeRoles, computeDefaultCollapsedUnits } from '@/lib/layouts/computeNodeRoles'
import { bfsDelays, buildDisplayEdges, buildCollapseMap, remapEdgesForCollapse } from '@/lib/graph/edgeUtils'
import { computeFamilyName } from '@/lib/graph/computeFamilyName'
import { injectGhostsForIntraFamilyMarriages } from '@/lib/graph/ghostNodes'
import { useGraphStore } from '@/store/graphStore'
import { LOAD_MORE_NODE_WIDTH, LOAD_MORE_NODE_HEIGHT } from '@/components/graph/LoadMoreNode'

interface GraphDataReturn {
  nodes: Node[]
  edges: Edge[]
  rawNodes: Node[]
  rawEdges: Edge[]
  setNodes: Dispatch<SetStateAction<Node[]>>
  setEdges: Dispatch<SetStateAction<Edge[]>>
  onNodesChange: (changes: NodeChange[]) => void
  onEdgesChange: (changes: EdgeChange[]) => void
  visibleNodes: Node[]
  displayEdges: Edge[]
  graphLoading: boolean
  graphError: boolean
  graphFailCount: number
  fetchGraph: () => Promise<void>
  resetAndFetch: () => Promise<void>
  isMarriedWoman: boolean
  womanView: WomanView
  onWomanViewChange: (v: WomanView) => void
  familyName: string
  updateRawNode: (id: string, data: Partial<PersonData>) => void
}

export function useGraphData(perspectivePersonId?: string): GraphDataReturn {
  const router = useRouter()
  const collapseInitialised = useRef(false)

  // Raw backend data — no layout applied
  const [rawNodes, setRawNodes] = useState<Node[]>([])
  const [rawEdges, setRawEdges] = useState<Edge[]>([])

  // React Flow internal state (selection, etc.) — synced to visibleNodes
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])

  const [graphLoading, setGraphLoading] = useState(true)
  // Cold-start failure surfacing: `graphError` flips the canvas to a retry
  // screen; `graphFailCount` counts consecutive failures so the screen can
  // escalate from "Try again" to "reach out to admin" on the second miss.
  const [graphError, setGraphError] = useState(false)
  const [graphFailCount, setGraphFailCount] = useState(0)
  const [womanView, setWomanView] = useState<WomanView>('sasural')

  const {
    collapsedUnitIds, initCollapseState,
    ancestorDepth, descendantDepth,
    hasMoreAncestors, hasMoreDescendants,
    setDepthFlags,
  } = useGraphStore()

  // ── Fetch raw data from backend ───────────────────────────────────────────
  const fetchGraph = useCallback(async () => {
    setGraphError(false)
    setGraphLoading(true)
    try {
      const data = await api.graph.fetch(perspectivePersonId, ancestorDepth, descendantDepth)
      setDepthFlags({
        hasMoreAncestors:   data.meta.hasMoreAncestors,
        hasMoreDescendants: data.meta.hasMoreDescendants,
      })
      const rawE = data.edges.map(e => ({ ...e, type: 'sketchEdge' }))

      // Bake animation delays into rawNodes (once, uses only edge structure)
      const delays = bfsDelays(data.nodes, rawE)
      const rawN = data.nodes.map((n: Node) => ({
        ...n,
        data: { ...(n.data as object), animDelay: delays.get(n.id) ?? 0, isPerspectiveView: !!perspectivePersonId },
      }))

      // Initialise collapse state BEFORE setting raw nodes so that both
      // the Zustand store and the React state update in the same render batch.
      // (If we set raw nodes first, the layout runs once with empty collapsedSet,
      // then again after initCollapseState — causing nodes to visibly jump.)
      if (!collapseInitialised.current) {
        collapseInitialised.current = true
        const roles = computeNodeRoles(rawN, rawE)
        const defaultCollapsed = computeDefaultCollapsedUnits(rawE, roles)
        initCollapseState(defaultCollapsed)
      }

      setRawNodes(rawN)
      setRawEdges(rawE)
      setGraphFailCount(0)
    } catch (err) {
      console.error('Failed to fetch graph:', err)
      setGraphError(true)
      setGraphFailCount(c => c + 1)
    } finally {
      setGraphLoading(false)
    }
  }, [perspectivePersonId, initCollapseState, ancestorDepth, descendantDepth, setDepthFlags])

  // ── Derive collapse set from store ────────────────────────────────────────
  const collapsedSet = useMemo(() => new Set(collapsedUnitIds), [collapsedUnitIds])

  // ── Filter by side (mayka / sasural) ─────────────────────────────────────
  const { nodes: filteredNodes, edges: filteredEdges, isMarriedWoman } = useMemo(
    () => rawNodes.length > 0
      ? filterGraphBySide(rawNodes, rawEdges, womanView)
      : { nodes: [], edges: [], isMarriedWoman: false },
    [rawNodes, rawEdges, womanView],
  )

  // ── Inject ghost nodes for intra-family marriages ────────────────────────
  // Cousin / sister-in-law marriages produce a SPOUSE_OF between two people
  // who both have lineage in the tree. Ghosts duplicate the further-from-self
  // partner so the spouse line and the couple's children render next to the
  // anchor, instead of crossing the canvas.
  const { nodes: ghostedNodes, edges: ghostedEdges } = useMemo(
    () => filteredNodes.length > 0
      ? (() => {
          const r = injectGhostsForIntraFamilyMarriages(filteredNodes, filteredEdges)
          return { nodes: r.nodes, edges: r.edges }
        })()
      : { nodes: [] as typeof filteredNodes, edges: [] as typeof filteredEdges },
    [filteredNodes, filteredEdges],
  )

  // ── Family name — topmost blood-line ancestor's first name ───────────────
  const familyName = useMemo(
    () => computeFamilyName(ghostedNodes, ghostedEdges),
    [ghostedNodes, ghostedEdges],
  )

  // ── Layout with collapse ──────────────────────────────────────────────────
  const laidOutNodes = useMemo(() => {
    if (ghostedNodes.length === 0) return []
    let perspective: 'self' | 'mother' | 'spouse' = 'self'
    if (isMarriedWoman && womanView === 'sasural') perspective = 'spouse'
    return layoutEngine(ghostedNodes, ghostedEdges, perspective, collapsedSet)
  }, [ghostedNodes, ghostedEdges, isMarriedWoman, womanView, collapsedSet])

  // ── Inject "Load N more" chips above the top row / below the bottom row ──
  // The chips are React Flow nodes positioned in flow coordinates so they pan
  // and zoom with the canvas. The layout engine centers the perspective anchor
  // such that anchor.position.x + NODE_W/2 = 0, so x=0 is the canvas centre —
  // exactly where the chips belong.
  const visibleNodes = useMemo(() => {
    if (laidOutNodes.length === 0) return laidOutNodes
    if (!hasMoreAncestors && !hasMoreDescendants) return laidOutNodes

    let minY =  Infinity
    let maxY = -Infinity
    for (const n of laidOutNodes) {
      if (n.position.y < minY) minY = n.position.y
      if (n.position.y > maxY) maxY = n.position.y
    }

    const chipX  = -LOAD_MORE_NODE_WIDTH / 2
    const CARD_HEIGHT = 160     // approx. PersonNode total height
    const MARGIN      = 32

    const extras: Node[] = []
    if (hasMoreAncestors) {
      extras.push({
        id: '__load_more_ancestors__',
        type: 'loadMoreNode',
        position: { x: chipX, y: minY - LOAD_MORE_NODE_HEIGHT - MARGIN },
        data: { direction: 'ancestors', animDelay: 0.1 },
        draggable: false, selectable: false, focusable: false,
      } as Node)
    }
    if (hasMoreDescendants) {
      extras.push({
        id: '__load_more_descendants__',
        type: 'loadMoreNode',
        position: { x: chipX, y: maxY + CARD_HEIGHT + MARGIN },
        data: { direction: 'descendants', animDelay: 0.1 },
        draggable: false, selectable: false, focusable: false,
      } as Node)
    }
    return [...laidOutNodes, ...extras]
  }, [laidOutNodes, hasMoreAncestors, hasMoreDescendants])

  // ── Remap edges for collapsed units ──────────────────────────────────────
  const collapseMap = useMemo(
    () => buildCollapseMap(ghostedEdges, collapsedSet),
    [ghostedEdges, collapsedSet],
  )

  const remappedEdges = useMemo(
    () => remapEdgesForCollapse(ghostedEdges, collapseMap),
    [ghostedEdges, collapseMap],
  )

  // ── Build display edges ───────────────────────────────────────────────────
  const displayEdges = useMemo(
    () => buildDisplayEdges(visibleNodes, remappedEdges),
    [visibleNodes, remappedEdges],
  )

  // ── Sync to React Flow internal state ────────────────────────────────────
  useEffect(() => { if (visibleNodes.length) setNodes(visibleNodes) }, [visibleNodes, setNodes])
  useEffect(() => { setEdges(remappedEdges) }, [remappedEdges, setEdges])

  // ── Boot ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!getToken()) { router.replace('/login'); return }
    setGraphLoading(true)
    setRawNodes([])
    setRawEdges([])
    collapseInitialised.current = false
    fetchGraph()
  }, [fetchGraph, router])

  // ── Stale-JWT recovery ────────────────────────────────────────────────────
  // After a merge the user's JWT still contains their old familyId, so the
  // graph loads with 0 nodes.  Detect this once and re-issue the token —
  // the backend picks the family containing their active person_id.
  const refreshAttempted = useRef(false)
  useEffect(() => {
    if (graphLoading) return
    // A failed fetch (cold-start timeout, etc.) leaves rawNodes empty but is
    // NOT a stale-JWT situation — let the retry screen handle it instead of
    // firing another cold request.
    if (graphError) return
    if (rawNodes.length > 0) { refreshAttempted.current = false; return }
    if (refreshAttempted.current) return
    refreshAttempted.current = true
    api.auth.refreshToken()
      .then(({ token }) => {
        setToken(token)
        collapseInitialised.current = false
        fetchGraph()
      })
      .catch(() => {})
  }, [graphLoading, graphError, rawNodes.length, fetchGraph])

  // Resets the collapse state so that new family units added by a merge are
  // included in the default-collapse computation on the next fetch.
  const resetAndFetch = useCallback(async () => {
    collapseInitialised.current = false
    await fetchGraph()
  }, [fetchGraph])

  // Optimistic update for a single person's data fields. Updating rawNodes
  // propagates through the useMemo chain (filteredNodes → ghostedNodes →
  // laidOutNodes → visibleNodes) so the canvas re-renders immediately without
  // a full fetchGraph round-trip.
  const updateRawNode = useCallback((id: string, data: Partial<PersonData>) => {
    setRawNodes(prev => prev.map(n =>
      n.id === id ? { ...n, data: { ...n.data, ...data } } : n
    ))
  }, [])

  const onWomanViewChange = useCallback((v: WomanView) => setWomanView(v), [])

  return {
    nodes, edges, rawNodes, rawEdges,
    setNodes, setEdges,
    onNodesChange, onEdgesChange,
    visibleNodes, displayEdges,
    graphLoading, graphError, graphFailCount, fetchGraph, resetAndFetch,
    isMarriedWoman, womanView, onWomanViewChange,
    familyName,
    updateRawNode,
  }
}
