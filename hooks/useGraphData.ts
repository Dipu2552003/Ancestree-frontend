'use client'

import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  useNodesState, useEdgesState,
  type Node, type Edge, type NodeChange, type EdgeChange,
} from '@xyflow/react'
import type { Dispatch, SetStateAction } from 'react'
import { api, getToken } from '@/lib/api'
import { LAYOUT_MAP, type LayoutId } from '@/lib/layouts'
import { filterGraphBySide, type ViewSide } from '@/lib/layouts/familySideFilter'
import { bfsDelays, buildDisplayEdges } from '@/lib/graph/edgeUtils'

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
  viewSide: ViewSide
  onViewSideChange: (side: ViewSide) => void
  familyName: string
}

export function useGraphData(): GraphDataReturn {
  const router = useRouter()
  const initialLoadDone = useRef(false)
  const layoutIdRef = useRef<LayoutId>('default')

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [graphLoading, setGraphLoading] = useState(true)
  const [familyName, setFamilyName] = useState('Family')
  const [layoutId, setLayoutId] = useState<LayoutId>('default')
  const [viewSide, setViewSide] = useState<ViewSide>('papa')

  const fetchGraph = useCallback(async () => {
    try {
      const data = await api.graph.fetch()
      const rawEdges = data.edges.map(e => ({ ...e, type: 'sketchEdge' }))
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

  const { nodes: visibleNodes, edges: filteredEdges } = useMemo(
    () => filterGraphBySide(nodes, edges, viewSide),
    [nodes, edges, viewSide],
  )

  const displayEdges = useMemo(
    () => buildDisplayEdges(visibleNodes, filteredEdges),
    [visibleNodes, filteredEdges],
  )

  const onLayoutChange = useCallback((id: LayoutId) => {
    layoutIdRef.current = id
    setLayoutId(id)
    setNodes(prev => LAYOUT_MAP.get(id)!.algorithm(prev, edges))
  }, [edges, setNodes])

  const onViewSideChange = useCallback((side: ViewSide) => {
    setViewSide(side)
  }, [])

  useEffect(() => {
    if (!getToken()) { router.replace('/login'); return }
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

  console.log(nodes)
  return {
    nodes, edges, setNodes, setEdges,
    onNodesChange, onEdgesChange,
    visibleNodes, displayEdges,
    graphLoading, fetchGraph,
    layoutId, onLayoutChange,
    viewSide, onViewSideChange,
    familyName,
  }
}
