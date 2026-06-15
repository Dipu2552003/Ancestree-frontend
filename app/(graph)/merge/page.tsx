'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AnimatePresence } from 'framer-motion'
import { ReactFlowProvider, Controls, MiniMap, useReactFlow } from '@xyflow/react'
import GraphCanvas from '@/components/graph/GraphCanvas'
import DotField from '@/components/graph/DotField'
import MergeSourceBanner from '@/components/graph/merge/MergeSourceBanner'
import MergeConfirmModal from '@/components/graph/merge/MergeConfirmModal'
import { useGraphData } from '@/hooks/useGraphData'
import { useGraphStore } from '@/store/graphStore'
import { getTheme } from '@/lib/theme'
import { getToken } from '@/lib/api'
import type { PersonData } from '@/types'

function asPersonData(d: unknown): PersonData { return d as PersonData }

export default function MergePage() {
  return (
    <ReactFlowProvider>
      <Suspense fallback={null}>
        <MergeInner />
      </Suspense>
    </ReactFlowProvider>
  )
}

function MergeInner() {
  const router      = useRouter()
  const params      = useSearchParams()
  const perspectiveId = params.get('perspective') ?? undefined
  const sourceId      = params.get('source')      ?? ''
  const sourceName    = params.get('sourceName')   ? decodeURIComponent(params.get('sourceName')!) : 'Unknown'

  useEffect(() => {
    if (!getToken()) router.replace('/login')
    if (!perspectiveId || !sourceId) router.replace('/graph')
  }, [router, perspectiveId, sourceId])

  const { isDark } = useGraphStore()
  const t = getTheme(isDark)
  const { fitView } = useReactFlow()

  const {
    nodes,
    onNodesChange, onEdgesChange,
    visibleNodes, displayEdges,
    graphLoading,
  } = useGraphData(perspectiveId)

  const [canvasReady,    setCanvasReady]    = useState(false)
  const [confirmTarget,  setConfirmTarget]  = useState<{ id: string; name: string } | null>(null)
  const fitDone = useRef(false)

  // Fit viewport once after load
  useEffect(() => {
    if (graphLoading || visibleNodes.length === 0 || fitDone.current) return
    fitDone.current = true
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        fitView({ padding: 0.35, duration: 0 })
        setCanvasReady(true)
      })
    })
  }, [graphLoading, visibleNodes.length, fitView])

  if (graphLoading) {
    return (
      <div style={{ height: '100vh', background: t.pageBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '3px solid var(--c-tint)', borderTopColor: 'var(--c-primary)', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: '#9A6C3C', fontSize: '14px', margin: 0 }}>Loading family tree…</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  return (
    <div style={{ position: 'relative', height: '100vh', overflow: 'hidden', background: t.pageBg }}>
      <DotField isDark={isDark} />

      {/* Canvas */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 1, opacity: canvasReady ? 1 : 0, transition: 'opacity 0.15s ease' }}>
        <GraphCanvas
          nodes={visibleNodes}
          edges={displayEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={id => {
            if (id.startsWith('couple_')) return
            const node = nodes.find(n => n.id === id)
            if (!node) return
            const name = asPersonData(node.data).fullName ?? 'Unknown'
            setConfirmTarget({ id, name })
          }}
        />
      </div>

      {/* Controls */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 10, pointerEvents: 'none' }}>
        <Controls style={{ pointerEvents: 'all', background: t.controlBg, border: `1.5px solid ${t.controlBorder}`, borderRadius: '6px' }} />
        <MiniMap
          style={{ pointerEvents: 'all', background: t.mapBg, border: `1.5px solid ${t.controlBorder}`, borderRadius: '6px' }}
          nodeColor={n => n.data?.isSelf ? 'var(--c-primary)' : n.data?.nodeState === 'claimed' ? '#22C55E' : isDark ? '#4A3F35' : 'var(--c-secondary)'}
        />
      </div>

      {/* Banner — always shown, explains the mode */}
      <MergeSourceBanner
        sourceNodeName={sourceName}
        onCancel={() => router.push('/graph')}
        isDark={isDark}
      />

      {/* Confirm modal — shown when user clicks a node */}
      <AnimatePresence>
        {confirmTarget && (
          <MergeConfirmModal
            key="merge-confirm"
            sourceNodeId={sourceId}
            sourceNodeName={sourceName}
            targetNodeId={confirmTarget.id}
            targetNodeName={confirmTarget.name}
            onClose={() => setConfirmTarget(null)}
            onSent={() => router.push('/graph')}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
