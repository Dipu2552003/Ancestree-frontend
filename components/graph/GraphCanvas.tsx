'use client'

import { type MouseEvent } from 'react'
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
import { edgeTypes } from './SketchEdge'
import { familyEdgeType } from './FamilyEdge'

const allEdgeTypes = { ...edgeTypes, ...familyEdgeType }
import { useGraphStore } from '@/store/graphStore'

interface GraphCanvasProps {
  nodes: Node[]
  edges: Edge[]
  onNodesChange: (changes: NodeChange[]) => void
  onEdgesChange: (changes: EdgeChange[]) => void
  onNodeClick: (nodeId: string) => void
  onNodeContextMenu?: (event: MouseEvent, nodeId: string) => void
}

export default function GraphCanvas({ nodes, edges, onNodesChange, onEdgesChange, onNodeClick, onNodeContextMenu }: GraphCanvasProps) {
  const { currentZoom } = useGraphStore()

  const handleNodeClick: NodeMouseHandler = (_event, node) => onNodeClick(node.id)

  const handleNodeContextMenu: NodeMouseHandler = (event, node) => {
    event.preventDefault()
    onNodeContextMenu?.(event, node.id)
  }

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes}
      edgeTypes={allEdgeTypes}
      onNodeClick={handleNodeClick}
      onNodeContextMenu={handleNodeContextMenu}
      fitView
      fitViewOptions={{ padding: 0.35 }}
      defaultViewport={{ x: 0, y: 0, zoom: currentZoom }}
      minZoom={0.15}
      maxZoom={3}
      panOnScroll={false}
      zoomOnScroll
      nodesDraggable={false}
      nodesConnectable={false}
      style={{ width: '100%', height: '100%', background: 'transparent' }}
    />
  )
}
