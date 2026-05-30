'use client'

import { useState, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ReactFlowProvider, Controls, MiniMap, useReactFlow } from '@xyflow/react'
import { IconSun, IconMoon } from '@tabler/icons-react'
import GraphCanvas from '@/components/graph/GraphCanvas'
import DotField from '@/components/graph/DotField'
import NodePanel from '@/components/graph/NodePanel'
import PersonProfileView from '@/components/graph/PersonProfileView'
import Navbar from '@/components/graph/Navbar'
import { useGraphStore } from '@/store/graphStore'
import { useGraphData } from '@/hooks/useGraphData'
import { useNodeActions } from '@/hooks/useNodeActions'
import { useTiltEffect } from '@/hooks/useTiltEffect'
import { getTheme } from '@/lib/theme'
import type { PersonData } from '@/types'

export default function GraphPage() {
  return (
    <ReactFlowProvider>
      <GraphInner />
    </ReactFlowProvider>
  )
}

function GraphInner() {
  const { getNodes, setCenter, fitView } = useReactFlow()
  const { isDark, setIsDark } = useGraphStore()
  const t = getTheme(isDark)

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [profileNodeId, setProfileNodeId]   = useState<string | null>(null)

  const {
    nodes, edges, setNodes, setEdges,
    onNodesChange, onEdgesChange,
    visibleNodes, displayEdges,
    graphLoading, fetchGraph,
    viewSide, onViewSideChange, familyName,
  } = useGraphData()

  const { onUpdateNode, onSaveNode, onDeleteNode, onAddRelation } = useNodeActions(
    edges, setNodes, setEdges, fetchGraph, selectedNodeId, setSelectedNodeId,
  )

  const { rotateX, rotateY, handleMouseMove, handleMouseLeave } = useTiltEffect()

  const selectedNode     = selectedNodeId ? nodes.find(n => n.id === selectedNodeId) ?? null : null
  const profileNode      = profileNodeId  ? nodes.find(n => n.id === profileNodeId)  ?? null : null
  const selectedNodeName = (selectedNode?.data as unknown as PersonData)?.fullName ?? ''
  const selectedIsSelf   = (selectedNode?.data as unknown as PersonData)?.isSelf ?? false
  const canDeleteSelected = !!selectedNodeId && !selectedIsSelf

  const onHome = useCallback(() => {
    const self = getNodes().find(n => (n.data as unknown as PersonData)?.isSelf)
    if (self) setCenter(self.position.x + 64, self.position.y + 70, { zoom: 1, duration: 600 })
    else fitView({ padding: 0.35, duration: 600 })
  }, [getNodes, setCenter, fitView])

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
      style={{ position: 'relative', height: '100vh', overflow: 'hidden', perspective: '1100px', background: t.pageBg, transition: 'background 0.4s' }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <DotField isDark={isDark} />

      <motion.div style={{ position: 'absolute', inset: 0, zIndex: 1, rotateY, rotateX, transformOrigin: 'center center' }}>
        <GraphCanvas
          nodes={visibleNodes} edges={displayEdges}
          onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
          onNodeClick={id => {
            const clicked = nodes.find(n => n.id === id)
            const canEdit = (clicked?.data as unknown as PersonData)?.canEdit ?? false
            if (canEdit) {
              setSelectedNodeId(prev => prev === id ? null : id)
              setProfileNodeId(null)
            } else {
              setProfileNodeId(prev => prev === id ? null : id)
              setSelectedNodeId(null)
            }
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

      <button
        onClick={() => setIsDark(!isDark)}
        style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 50, width: '38px', height: '38px', borderRadius: '8px', background: t.toggleBg, color: t.toggleColor, border: `1.5px solid ${t.toggleBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: isDark ? '0 2px 12px rgba(0,0,0,0.5)' : '0 2px 8px rgba(0,0,0,0.12)', transition: 'background 0.3s, color 0.3s' }}
        title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {isDark ? <IconSun size={17} /> : <IconMoon size={17} />}
      </button>


      <AnimatePresence>
        {selectedNodeId && selectedNode && (
          <NodePanel
            key={selectedNodeId}
            node={selectedNode}
            onClose={() => setSelectedNodeId(null)}
            onViewProfile={() => { setProfileNodeId(selectedNodeId); setSelectedNodeId(null) }}
            onUpdate={onUpdateNode}
            onSave={onSaveNode}
            onAddParent={id => onAddRelation('father').then(() => setSelectedNodeId(id))}
            onAddChild={id  => onAddRelation('son').then(() => setSelectedNodeId(id))}
            onAddSpouse={id => onAddRelation('spouse').then(() => setSelectedNodeId(id))}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {profileNodeId && profileNode && (
          <PersonProfileView
            key={profileNodeId}
            node={profileNode}
            onBack={() => setProfileNodeId(null)}
            onEdit={() => { setSelectedNodeId(profileNodeId); setProfileNodeId(null) }}
          />
        )}
      </AnimatePresence>

      <Navbar
        familyName={familyName}
        selectedNodeId={selectedNodeId}
        selectedNodeName={selectedNodeName}
        canDeleteSelected={canDeleteSelected}
        viewSide={viewSide}
        onHome={onHome}
        onAddRelation={onAddRelation}
        onDeleteSelected={() => onDeleteNode(selectedNodeId!)}
        onViewSideChange={onViewSideChange}
        isDark={isDark}
      />
    </div>
  )
}
