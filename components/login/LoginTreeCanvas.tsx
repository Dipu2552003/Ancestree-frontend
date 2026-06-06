'use client'

import { useMemo, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  ReactFlow,
  ReactFlowProvider,
  Controls,
  type Node,
  type Edge,
  type NodeMouseHandler,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { nodeTypes } from '@/components/graph/PersonNode'
import { edgeTypes } from '@/components/graph/SketchEdge'
import { familyEdgeType } from '@/components/graph/FamilyEdge'
import { useTiltEffect } from '@/hooks/useTiltEffect'
import { useGraphStore } from '@/store/graphStore'
import { layoutEngine } from '@/lib/layouts/layoutEngine'
import { bfsDelays, buildDisplayEdges } from '@/lib/graph/edgeUtils'
import type { PersonData, EdgeData } from '@/types'

// ── Combined type registries (same as the main product canvas) ────────────────
const ALL_NODE_TYPES = { ...nodeTypes }
const ALL_EDGE_TYPES = { ...edgeTypes, ...familyEdgeType }

// ── Static data helpers ───────────────────────────────────────────────────────

function mkNode(id: string, d: Partial<PersonData>): Node {
  const data = {
    isAlive:            !d.isDeceased,
    isDeceased:         false,
    nodeState:          'proxy',
    isSelf:             false,
    relationshipToSelf: '',
    ...d,
  } as PersonData
  return {
    id,
    type:     'personNode',
    position: { x: 0, y: 0 },
    data:     data as unknown as Record<string, unknown>,
  }
}

function mkEdge(
  id:      string,
  source:  string,
  target:  string,
  relType: EdgeData['relType'],
): Edge {
  return {
    id, source, target,
    type: 'sketchEdge',
    data: { relType } as unknown as Record<string, unknown>,
  }
}

// ── 10-person static tree ─────────────────────────────────────────────────────
// fullName = familiar relationship term shown on the card.
// relationshipToSelf = English subtitle shown in italics below the card.

const RAW_NODES: Node[] = [
  mkNode('jagdish', { fullName: 'Pardada', gender: 'male',   birthYear: 1908, deathYear: 1982, isDeceased: true,  isAlive: false, relationshipToSelf: 'Great-grandfather' }),
  mkNode('savitri', { fullName: 'Pardadi', gender: 'female', birthYear: 1912, deathYear: 1988, isDeceased: true,  isAlive: false, relationshipToSelf: 'Great-grandmother' }),
  mkNode('ramesh',  { fullName: 'Dada',    gender: 'male',   birthYear: 1938, deathYear: 2001, isDeceased: true,  isAlive: false, relationshipToSelf: 'Grandfather' }),
  mkNode('sunita',  { fullName: 'Dadi',    gender: 'female', birthYear: 1942, deathYear: 2015, isDeceased: true,  isAlive: false, relationshipToSelf: 'Grandmother' }),
  mkNode('suresh',  { fullName: 'Chacha',  gender: 'male',   birthYear: 1962,                  isDeceased: false, isAlive: true,  relationshipToSelf: 'Uncle' }),
  mkNode('vijay',   { fullName: 'Papa',    gender: 'male',   birthYear: 1965,                  isDeceased: false, isAlive: true,  relationshipToSelf: 'Father' }),
  mkNode('meena',   { fullName: 'Mummy',   gender: 'female', birthYear: 1968,                  isDeceased: false, isAlive: true,  relationshipToSelf: 'Mother' }),
  mkNode('rahul',   { fullName: 'Me',      gender: 'male',   birthYear: 1992,                  isDeceased: false, isAlive: true,  isSelf: true, nodeState: 'claimed', relationshipToSelf: '' }),
  mkNode('priya',   { fullName: 'Chhoti',  gender: 'female', birthYear: 1995,                  isDeceased: false, isAlive: true,  relationshipToSelf: 'Sister' }),
  mkNode('aryan',   { fullName: 'Beta',    gender: 'male',   birthYear: 2018,                  isDeceased: false, isAlive: true,  relationshipToSelf: 'Son' }),
]

// Both parents listed for each child so FamilyEdge draws the bracket correctly.
const RAW_EDGES: Edge[] = [
  mkEdge('spo-jag-sav', 'jagdish', 'savitri', 'SPOUSE_OF'),
  mkEdge('par-jag-ram', 'jagdish', 'ramesh',  'PARENT_OF'),
  mkEdge('par-sav-ram', 'savitri', 'ramesh',  'PARENT_OF'),

  mkEdge('spo-ram-sun', 'ramesh',  'sunita',  'SPOUSE_OF'),
  mkEdge('par-ram-vij', 'ramesh',  'vijay',   'PARENT_OF'),
  mkEdge('par-sun-vij', 'sunita',  'vijay',   'PARENT_OF'),
  mkEdge('par-ram-sur', 'ramesh',  'suresh',  'PARENT_OF'),
  mkEdge('par-sun-sur', 'sunita',  'suresh',  'PARENT_OF'),

  mkEdge('spo-vij-mee', 'vijay',   'meena',   'SPOUSE_OF'),
  mkEdge('par-vij-rah', 'vijay',   'rahul',   'PARENT_OF'),
  mkEdge('par-mee-rah', 'meena',   'rahul',   'PARENT_OF'),
  mkEdge('par-vij-pri', 'vijay',   'priya',   'PARENT_OF'),
  mkEdge('par-mee-pri', 'meena',   'priya',   'PARENT_OF'),

  mkEdge('par-rah-ary', 'rahul',   'aryan',   'PARENT_OF'),
]

// ── Inner (must live inside ReactFlowProvider context) ────────────────────────

function LoginTreeInner() {
  const { setActiveNodeId, isDark } = useGraphStore()
  const { rotateX, rotateY, handleMouseMove, handleMouseLeave } = useTiltEffect()

  // Layout + BFS delays + display edges — computed once, never change
  const { nodes, edges } = useMemo(() => {
    const laidOut    = layoutEngine(RAW_NODES, RAW_EDGES)
    const delays     = bfsDelays(laidOut, RAW_EDGES)
    const withDelays = laidOut.map(n => ({
      ...n,
      data: { ...(n.data as object), animDelay: delays.get(n.id) ?? 0 },
    }))
    const displayEdges = buildDisplayEdges(withDelays, RAW_EDGES)
    return { nodes: withDelays, edges: displayEdges }
  }, [])

  const handleNodeClick: NodeMouseHandler = useCallback((_ev, node) => {
    setActiveNodeId(node.id)
  }, [setActiveNodeId])

  return (
    <motion.div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        width:           '100%',
        height:          '100%',
        rotateX,
        rotateY,
        transformPerspective: 1400,
        transformOrigin: 'center center',
        willChange:      'transform',
      }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={ALL_NODE_TYPES}
        edgeTypes={ALL_EDGE_TYPES}
        onNodeClick={handleNodeClick}
        onPaneClick={() => setActiveNodeId(null)}
        fitView
        fitViewOptions={{ padding: 0.18 }}
        minZoom={0.12}
        maxZoom={3}
        panOnScroll={false}
        zoomOnScroll
        zoomOnPinch
        panOnDrag
        nodesDraggable={false}
        nodesConnectable={false}
        style={{ background: 'transparent' }}
        proOptions={{ hideAttribution: true }}
      >
        <Controls
          style={{
            background:   isDark ? '#1C1A18'    : 'white',
            border:       `1.5px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#FDE8CC'}`,
            borderRadius: '6px',
            boxShadow:    isDark ? '0 2px 12px rgba(0,0,0,0.40)' : '0 2px 8px rgba(0,0,0,0.06)',
          }}
        />
      </ReactFlow>
    </motion.div>
  )
}

// ── Public export ─────────────────────────────────────────────────────────────

export default function LoginTreeCanvas() {
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 2 }}>
      <ReactFlowProvider>
        <LoginTreeInner />
      </ReactFlowProvider>
    </div>
  )
}
