'use client'

import { type MouseEvent, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  ReactFlow,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
  type NodeMouseHandler,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { nodeTypes } from './PersonNode'
import { collapsedCoupleNodeType } from './CollapsedCoupleNode'
import { edgeTypes } from './SketchEdge'
import { familyEdgeType } from './FamilyEdge'
import { useTiltEffect } from '@/hooks/useTiltEffect'

const allNodeTypes = { ...nodeTypes, ...collapsedCoupleNodeType }
const allEdgeTypes = { ...edgeTypes, ...familyEdgeType }
import { useGraphStore } from '@/store/graphStore'

interface GraphCanvasProps {
  nodes: Node[]
  edges: Edge[]
  onNodesChange: (changes: NodeChange[]) => void
  onEdgesChange: (changes: EdgeChange[]) => void
  onNodeClick: (nodeId: string) => void
  onNodeContextMenu?: (event: MouseEvent, nodeId: string) => void
  onPaneClick?: () => void
}

export default function GraphCanvas({ nodes, edges, onNodesChange, onEdgesChange, onNodeClick, onNodeContextMenu, onPaneClick }: GraphCanvasProps) {
  const { currentZoom } = useGraphStore()
  const { rotateX, rotateY, handleMouseMove, handleMouseLeave } = useTiltEffect()

  const handleNodeClick: NodeMouseHandler = (_event, node) => onNodeClick(node.id)

  const handleNodeContextMenu: NodeMouseHandler = (event, node) => {
    event.preventDefault()
    onNodeContextMenu?.(event, node.id)
  }

  // Positions are owned exclusively by the layout engine. Discard any
  // `position` NodeChange events React Flow fires internally during
  // initialisation or node measurement — they would override computed positions.
  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    const stable = changes.filter(c => c.type !== 'position')
    if (stable.length > 0) onNodesChange(stable)
  }, [onNodesChange])

  return (
    <motion.div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        width: '100%',
        height: '100%',
        rotateX,
        rotateY,
        transformPerspective: 1400,
        transformOrigin: 'center center',
        willChange: 'transform',
      }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={allNodeTypes}
        edgeTypes={allEdgeTypes}
        onNodeClick={handleNodeClick}
        onNodeContextMenu={handleNodeContextMenu}
        onPaneClick={onPaneClick}
        defaultViewport={{ x: 0, y: 0, zoom: currentZoom }}
        minZoom={0.15}
        maxZoom={3}
        panOnScroll={false}
        zoomOnScroll
        zoomOnPinch
        panOnDrag
        nodesDraggable={false}
        nodesConnectable={false}
        style={{ width: '100%', height: '100%', background: 'transparent' }}
      />
    </motion.div>
  )
}
