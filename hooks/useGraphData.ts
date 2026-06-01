'use client'

import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  useNodesState, useEdgesState,
  type Node, type Edge, type NodeChange, type EdgeChange,
} from '@xyflow/react'
import type { Dispatch, SetStateAction } from 'react'
import { api, getToken } from '@/lib/api'
import { type LayoutId } from '@/lib/layouts'
import { layoutEngine } from '@/lib/layouts/layoutEngine'
import { filterGraphBySide, type WomanView } from '@/lib/layouts/familySideFilter'
import { computeNodeRoles, computeDefaultCollapsedUnits } from '@/lib/layouts/computeNodeRoles'
import { bfsDelays, buildDisplayEdges, buildCollapseMap, remapEdgesForCollapse } from '@/lib/graph/edgeUtils'
import { useGraphStore } from '@/store/graphStore'

interface GraphDataReturn {
  nodes: Node[]
  edges: Edge[]
  setNodes: Dispatch<SetStateAction<Node[]>>
  setEdges: Dispatch<SetStateAction<Edge[]>>
  onNodesChange: (changes: NodeChange[]) => void
  onEdgesChange: (changes: EdgeChange[]) => void
  visibleNodes: Node[]
  displayEdges: Edge[]
  graphLoading: boolean
  fetchGraph: () => Promise<void>
  layoutId: LayoutId
  onLayoutChange: (id: LayoutId) => void
  isMarriedWoman: boolean
  womanView: WomanView
  onWomanViewChange: (v: WomanView) => void
  familyName: string
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
  const [familyName, setFamilyName] = useState('Family')
  const [womanView, setWomanView] = useState<WomanView>('piyar')
  const layoutId: LayoutId = 'default'

  const { collapsedUnitIds, initCollapseState } = useGraphStore()

  // ── Fetch raw data from backend ───────────────────────────────────────────
  const fetchGraph = useCallback(async () => {
    try {
      const data = await api.graph.fetch(perspectivePersonId)
      const rawE = data.edges.map(e => ({ ...e, type: 'sketchEdge' }))

      // Bake animation delays into rawNodes (once, uses only edge structure)
      const delays = bfsDelays(data.nodes, rawE)
      const rawN = data.nodes.map((n: Node) => ({
        ...n,
        data: { ...(n.data as object), animDelay: delays.get(n.id) ?? 0 },
      }))

      setRawNodes(rawN)
      setRawEdges(rawE)

      // Initialise collapse state from node roles (only on the very first load)
      if (!collapseInitialised.current) {
        collapseInitialised.current = true
        const roles = computeNodeRoles(rawN, rawE)
        const defaultCollapsed = computeDefaultCollapsedUnits(rawE, roles)
        initCollapseState(defaultCollapsed)
      }
    } catch (err) {
      console.error('Failed to fetch graph:', err)
    } finally {
      setGraphLoading(false)
    }
  }, [perspectivePersonId, initCollapseState])

  // ── Derive collapse set from store ────────────────────────────────────────
  const collapsedSet = useMemo(() => new Set(collapsedUnitIds), [collapsedUnitIds])

  // ── Filter by side (mayka / piyar) ───────────────────────────────────────
  const { nodes: filteredNodes, edges: filteredEdges, isMarriedWoman } = useMemo(
    () => rawNodes.length > 0
      ? filterGraphBySide(rawNodes, rawEdges, womanView)
      : { nodes: [], edges: [], isMarriedWoman: false },
    [rawNodes, rawEdges, womanView],
  )

  // ── Layout with collapse ──────────────────────────────────────────────────
  const visibleNodes = useMemo(() => {
    if (filteredNodes.length === 0) return []
    let perspective: 'self' | 'mother' | 'spouse' = 'self'
    if (isMarriedWoman && womanView === 'piyar') perspective = 'spouse'
    return layoutEngine(filteredNodes, filteredEdges, perspective, collapsedSet)
  }, [filteredNodes, filteredEdges, isMarriedWoman, womanView, collapsedSet])

  // ── Remap edges for collapsed units ──────────────────────────────────────
  const collapseMap = useMemo(
    () => buildCollapseMap(filteredEdges, collapsedSet),
    [filteredEdges, collapsedSet],
  )

  const remappedEdges = useMemo(
    () => remapEdgesForCollapse(filteredEdges, collapseMap),
    [filteredEdges, collapseMap],
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
    collapseInitialised.current = false
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

  const onLayoutChange = useCallback((_id: LayoutId) => { /* single layout only */ }, [])
  const onWomanViewChange = useCallback((v: WomanView) => setWomanView(v), [])

  return {
    nodes, edges, setNodes, setEdges,
    onNodesChange, onEdgesChange,
    visibleNodes, displayEdges,
    graphLoading, fetchGraph,
    layoutId, onLayoutChange,
    isMarriedWoman, womanView, onWomanViewChange,
    familyName,
  }
}
