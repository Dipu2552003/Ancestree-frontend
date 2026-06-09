'use client'

// Side-effects for the /graph page — every effect that previously lived inline
// on the page, except for the viewport-fit pair (handled by useFitViewportOnLoad).
//
//   • auth redirect             — kick unauthenticated visitors to /login
//   • pendingMatch ingestion    — read sessionStorage on perspective change
//   • notification fetch        — populate the bell badge on load
//   • activeNode sync           — mirror selected/context-menu id into the store
//   • long-press → context menu — mobile companion to onNodeContextMenu
//   • comparison auto-open      — open MergeComparisonPanel once the exploration tree has loaded
//
// All effects preserved verbatim — only their location changed.

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { Node } from '@xyflow/react'
import { api, getToken } from '@/lib/api'
import { useGraphStore } from '@/store/graphStore'
import type { PersonData, PendingMatchData } from '@/types'
import type { useGraphPageState } from './useGraphPageState'

type State = ReturnType<typeof useGraphPageState>

function asPersonData(data: unknown): PersonData {
  return data as PersonData
}

interface UseGraphPageEffectsArgs {
  s:                  State
  perspectiveId:      string | undefined
  nodes:              Node[]
  graphLoading:       boolean
  isExploration:      boolean
  matchHighlightNode: Node | null
}

export function useGraphPageEffects({
  s, perspectiveId, nodes, graphLoading, isExploration, matchHighlightNode,
}: UseGraphPageEffectsArgs) {
  const router = useRouter()
  const { setNotifications, setActiveNodeId } = useGraphStore()

  // Redirect unauthenticated visitors away from the graph.
  useEffect(() => {
    if (!getToken()) router.replace('/login')
  }, [router])

  // Read exploration / review context stored by DuplicateFoundModal or
  // NotificationPanel. Must depend on perspectiveId: when already on /graph
  // and "View tree" is clicked, router.push doesn't remount the component —
  // the effect must re-run on URL change.
  useEffect(() => {
    const raw = sessionStorage.getItem('pendingMatch')
    if (raw) {
      try { s.setPendingMatch(JSON.parse(raw) as PendingMatchData) } catch {}
      sessionStorage.removeItem('pendingMatch')
    }
  }, [perspectiveId])  // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch notification unread count on load
  useEffect(() => {
    api.notifications.list()
      .then(({ notifications, unread_count }) => setNotifications(notifications, unread_count))
      .catch(() => {})
  }, [setNotifications])

  // Sync active node to the store so PersonNode can subscribe without touching
  // explorationNodes (which would cause all edges to recompute on every click).
  useEffect(() => {
    setActiveNodeId(s.selectedNodeId ?? s.contextMenu?.nodeId ?? null)
  }, [s.selectedNodeId, s.contextMenu?.nodeId, setActiveNodeId])

  // Long-press on mobile → open context menu (mirrors onNodeContextMenu for right-click)
  const nodesRef = useRef(nodes)
  useEffect(() => { nodesRef.current = nodes }, [nodes])
  useEffect(() => {
    const handler = (e: Event) => {
      const { nodeId, clientX, clientY } = (e as CustomEvent<{ nodeId: string; clientX: number; clientY: number }>).detail
      const node = nodesRef.current.find(n => n.id === nodeId)
      if (!node) return
      s.setSelectedNodeId(null)
      s.setPanelMode('none')
      s.setContextMenu({ nodeId, x: clientX, y: clientY, personData: asPersonData(node.data) })
    }
    window.addEventListener('node-longpress', handler)
    return () => window.removeEventListener('node-longpress', handler)
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-open the merge comparison panel once the exploration tree has loaded.
  useEffect(() => {
    if (isExploration && matchHighlightNode && !graphLoading) {
      s.setMatchPanelOpen(true)
    }
  }, [isExploration, matchHighlightNode?.id, graphLoading])  // eslint-disable-line react-hooks/exhaustive-deps
}
