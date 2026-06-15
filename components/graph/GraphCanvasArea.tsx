'use client'

// Wraps the React Flow canvas in its fade-in container and overlays the
// Controls + MiniMap chrome on top. Keeps the page free of the canvas's
// layered absolute-positioned siblings.

import type { MouseEvent } from 'react'
import { motion } from 'framer-motion'
import { Controls, MiniMap, type Node, type Edge, type NodeChange, type EdgeChange } from '@xyflow/react'
import GraphCanvas from './GraphCanvas'
import { getTheme } from '@/lib/theme'

interface GraphCanvasAreaProps {
  isDark:            boolean
  isMobile:          boolean
  canvasReady:       boolean
  nodes:             Node[]
  edges:             Edge[]
  onNodesChange:     (changes: NodeChange[]) => void
  onEdgesChange:     (changes: EdgeChange[]) => void
  onPaneClick:       () => void
  onNodeClick:       (nodeId: string) => void
  onNodeContextMenu: (event: MouseEvent, nodeId: string) => void
}

export default function GraphCanvasArea({
  isDark, isMobile, canvasReady,
  nodes, edges,
  onNodesChange, onEdgesChange,
  onPaneClick, onNodeClick, onNodeContextMenu,
}: GraphCanvasAreaProps) {
  const t = getTheme(isDark)

  return (
    <>
      <motion.div style={{
        position: 'absolute', inset: 0, zIndex: 1,
        opacity: canvasReady ? 1 : 0, transition: 'opacity 0.15s ease',
      }}>
        <GraphCanvas
          nodes={nodes} edges={edges}
          onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
          onPaneClick={onPaneClick}
          onNodeClick={onNodeClick}
          onNodeContextMenu={onNodeContextMenu}
        />
      </motion.div>

      <div style={{ position: 'absolute', inset: 0, zIndex: 10, pointerEvents: 'none' }}>
        <Controls style={{
          pointerEvents: 'all', background: t.controlBg,
          border: `1.5px solid ${t.controlBorder}`, borderRadius: '6px',
          boxShadow: isDark ? '0 2px 12px rgba(0,0,0,0.4)' : '0 2px 8px rgba(0,0,0,0.06)',
        }} />
        {!isMobile && (
          <MiniMap
            style={{ pointerEvents: 'all', background: t.mapBg, border: `1.5px solid ${t.controlBorder}`, borderRadius: '6px' }}
            nodeColor={n => n.data?.isSelf ? 'var(--c-primary)' : n.data?.nodeState === 'claimed' ? '#22C55E' : isDark ? '#4A3F35' : 'var(--c-secondary)'}
          />
        )}
      </div>
    </>
  )
}
