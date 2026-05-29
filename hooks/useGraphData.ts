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
import { classifyFamilySides } from '@/lib/layouts/classifyNodes'
import { bfsDelays, buildDisplayEdges } from '@/lib/graph/edgeUtils'
import type { EdgeData } from '@/types'

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

  const idsToHide = useMemo(() => {
    if (layoutId !== 'default') return new Set<string>()
    const cls = classifyFamilySides(nodes, edges)
    if (!cls) return new Set<string>()
    const { maternalSet } = cls

    const keepVisible = new Set<string>()
    for (const e of edges) {
      const rel = (e.data as unknown as EdgeData)?.relType
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

  const displayEdges = useMemo(
    () => buildDisplayEdges(visibleNodes, visibleEdges),
    [visibleNodes, visibleEdges],
  )

  const onLayoutChange = useCallback((id: LayoutId) => {
    layoutIdRef.current = id
    setLayoutId(id)
    setNodes(prev => LAYOUT_MAP.get(id)!.algorithm(prev, edges))
  }, [edges, setNodes])

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
    familyName,
  }
}
