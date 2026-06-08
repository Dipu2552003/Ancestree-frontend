'use client'

import { useMemo, useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ReactFlow,
  ReactFlowProvider,
  Controls,
  useReactFlow,
  type Node,
  type Edge,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { IconArrowUp, IconArrowDown, IconHeart, IconUsers } from '@tabler/icons-react'
import { nodeTypes } from '@/components/graph/PersonNode'
import { edgeTypes } from '@/components/graph/SketchEdge'
import { familyEdgeType } from '@/components/graph/FamilyEdge'
import { layoutEngine } from '@/lib/layouts/layoutEngine'
import { bfsDelays, buildDisplayEdges } from '@/lib/graph/edgeUtils'
import { useGraphStore } from '@/store/graphStore'
import { getTheme } from '@/lib/theme'
import type { PersonData, EdgeData } from '@/types'

const ALL_NODE_TYPES = { ...nodeTypes }
const ALL_EDGE_TYPES = { ...edgeTypes, ...familyEdgeType }

// ── Node / edge helpers ───────────────────────────────────────────────────────

function mkNode(id: string, d: Partial<PersonData>): Node {
  const data = {
    isAlive:            true,
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
    draggable: false,
    selectable: false,
  }
}

function mkEdge(id: string, source: string, target: string, relType: EdgeData['relType']): Edge {
  return {
    id, source, target,
    type: 'sketchEdge',
    data: { relType } as unknown as Record<string, unknown>,
  }
}

// ── Relations the right-click menu offers ─────────────────────────────────────

type Rel = 'father' | 'mother' | 'spouse' | 'son' | 'daughter' | 'brother' | 'sister'

const RELATIONS: { rel: Rel; label: string; gender?: 'male' | 'female'; color: string; icon: React.ReactNode }[] = [
  { rel: 'father',   label: 'Father',   gender: 'male',   color: '#4F86C6', icon: <IconArrowUp size={15} /> },
  { rel: 'mother',   label: 'Mother',   gender: 'female', color: '#C06FAE', icon: <IconArrowUp size={15} /> },
  { rel: 'spouse',   label: 'Spouse',                     color: '#EA580C', icon: <IconHeart size={15} /> },
  { rel: 'son',      label: 'Son',      gender: 'male',   color: '#2EAA7C', icon: <IconArrowDown size={15} /> },
  { rel: 'daughter', label: 'Daughter', gender: 'female', color: '#9C6FD6', icon: <IconArrowDown size={15} /> },
  { rel: 'brother',  label: 'Brother',  gender: 'male',   color: '#0E9F78', icon: <IconUsers size={15} /> },
  { rel: 'sister',   label: 'Sister',   gender: 'female', color: '#A855F7', icon: <IconUsers size={15} /> },
]

const SELF_NODE = mkNode('you', {
  fullName: 'You', gender: 'male', birthYear: 1992,
  isSelf: true, isViewerNode: true, nodeState: 'claimed', relationshipToSelf: '',
})

interface Graph { nodes: Node[]; edges: Edge[] }

// ── Demo timeline (runs once, then hands over) ────────────────────────────────
//  0 idle → 1 cursor in → 2 right-click → 3 menu → 4 add spouse + hold → live
const DEMO_DUR = [550, 1000, 550, 1150, 1350]

function LoginTreeInner() {
  const { isDark } = useGraphStore()
  const t = getTheme(isDark)
  const { fitView } = useReactFlow()

  const [graph, setGraph]     = useState<Graph>({ nodes: [SELF_NODE], edges: [] })
  const idRef                 = useRef(1)
  const [stage, setStage]     = useState<'demo' | 'live'>('demo')
  const [demoPhase, setPhase] = useState(0)
  const [menu, setMenu]       = useState<{ x: number; y: number; w: number; h: number; nodeId: string; name: string } | null>(null)
  const addedRef     = useRef(false)
  const fitRef       = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // ── Layout (recomputed whenever the graph changes) ──────────────────────────
  const { nodes, edges } = useMemo(() => {
    const laid       = layoutEngine(graph.nodes, graph.edges)
    const delays     = bfsDelays(laid, graph.edges)
    const withDelays = laid.map(n => ({ ...n, data: { ...(n.data as object), animDelay: delays.get(n.id) ?? 0 } }))
    return { nodes: withDelays, edges: buildDisplayEdges(withDelays, graph.edges) }
  }, [graph])

  // Re-frame the tree whenever a node is added (instant on first paint).
  useEffect(() => {
    const duration = fitRef.current ? 600 : 0
    fitRef.current = true
    const raf = requestAnimationFrame(() => fitView({ padding: 0.4, duration, maxZoom: 1.15 }))
    return () => cancelAnimationFrame(raf)
  }, [graph.nodes.length, fitView])

  // ── Add a relative — mirrors the product's relationship rules ───────────────
  const addRelation = useCallback((anchorId: string, rel: Rel) => {
    setGraph(g => {
      const anchor = g.nodes.find(n => n.id === anchorId)
      if (!anchor) return g
      const cfg = RELATIONS.find(r => r.rel === rel)!
      const anchorGender = (anchor.data as unknown as PersonData).gender
      const gender = cfg.gender ?? (anchorGender === 'male' ? 'female' : 'male')
      const id = `n${idRef.current++}`

      const node = mkNode(id, {
        fullName: cfg.label, gender,
        nodeState: 'proxy', relationshipToSelf: cfg.label,
      })

      const relTypeOf = (e: Edge) => (e.data as unknown as EdgeData)?.relType
      const parentsOf = (pid: string) => g.edges.filter(e => relTypeOf(e) === 'PARENT_OF' && e.target === pid).map(e => e.source)
      const spousesOf = (pid: string) => g.edges
        .filter(e => relTypeOf(e) === 'SPOUSE_OF' && (e.source === pid || e.target === pid))
        .map(e => e.source === pid ? e.target : e.source)

      const newEdges: Edge[] = []
      let k = 0
      const eid = () => `e${id}-${k++}`

      if (rel === 'father' || rel === 'mother') {
        newEdges.push(mkEdge(eid(), id, anchorId, 'PARENT_OF'))
        // Link to the already-known parent as a spouse so the bracket renders.
        for (const p of parentsOf(anchorId)) newEdges.push(mkEdge(eid(), id, p, 'SPOUSE_OF'))
      } else if (rel === 'spouse') {
        newEdges.push(mkEdge(eid(), anchorId, id, 'SPOUSE_OF'))
      } else if (rel === 'son' || rel === 'daughter') {
        newEdges.push(mkEdge(eid(), anchorId, id, 'PARENT_OF'))
        for (const sp of spousesOf(anchorId)) newEdges.push(mkEdge(eid(), sp, id, 'PARENT_OF'))
      } else { // brother | sister
        const parents = parentsOf(anchorId)
        if (parents.length) for (const p of parents) newEdges.push(mkEdge(eid(), p, id, 'PARENT_OF'))
        else newEdges.push(mkEdge(eid(), anchorId, id, 'SIBLING_OF'))
      }

      return { nodes: [...g.nodes, node], edges: [...g.edges, ...newEdges] }
    })
  }, [])

  // ── Guided demo: play once, then hand control to the user ───────────────────
  useEffect(() => {
    if (stage !== 'demo') return
    if (demoPhase >= DEMO_DUR.length) { setStage('live'); return }
    const id = setTimeout(() => setPhase(p => p + 1), DEMO_DUR[demoPhase])
    return () => clearTimeout(id)
  }, [demoPhase, stage])

  // At the reveal phase, actually add the spouse (once) so she persists.
  useEffect(() => {
    if (stage === 'demo' && demoPhase === 4 && !addedRef.current) {
      addedRef.current = true
      addRelation('you', 'spouse')
    }
  }, [stage, demoPhase, addRelation])

  const showCursor = stage === 'demo' && demoPhase >= 1 && demoPhase <= 3
  const clicking   = stage === 'demo' && demoPhase === 2
  const fauxMenu   = stage === 'demo' && demoPhase === 3

  const cursorPose = !showCursor
    ? { x: 96, y: 150, opacity: 0 }
    : demoPhase >= 1 && demoPhase <= 3 ? { x: 2, y: 8, opacity: 1 }
    : { x: 96, y: 150, opacity: 0 }

  // ── Right-click → relation menu ─────────────────────────────────────────────
  // Coordinates are made relative to the canvas container (not the viewport),
  // because a framer-motion ancestor applies transform/filter — which would make
  // a position:fixed menu resolve against it and get clipped by overflow:hidden.
  function openMenu(e: React.MouseEvent, node: Node) {
    e.preventDefault()
    if (stage === 'demo') { setStage('live'); setPhase(DEMO_DUR.length) } // let the user interrupt
    const rect = containerRef.current?.getBoundingClientRect()
    const name = (node.data as unknown as PersonData).fullName
    setMenu({
      x: e.clientX - (rect?.left ?? 0),
      y: e.clientY - (rect?.top ?? 0),
      w: rect?.width  ?? 0,
      h: rect?.height ?? 0,
      nodeId: node.id, name,
    })
  }

  function pick(rel: Rel) {
    if (!menu) return
    addRelation(menu.nodeId, rel)
    setMenu(null)
  }

  return (
    <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} onContextMenu={e => e.preventDefault()}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={ALL_NODE_TYPES}
        edgeTypes={ALL_EDGE_TYPES}
        minZoom={0.2}
        maxZoom={2}
        panOnScroll={false}
        zoomOnScroll
        zoomOnPinch
        zoomOnDoubleClick={false}
        panOnDrag
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        onNodeContextMenu={openMenu}
        onPaneContextMenu={e => e.preventDefault()}
        onPaneClick={() => setMenu(null)}
        onNodeClick={(e, node) => openMenu(e, node)}
        proOptions={{ hideAttribution: true }}
        style={{ background: 'transparent' }}
      >
        <Controls
          showInteractive={false}
          style={{
            background:   isDark ? '#1C1A18' : 'white',
            border:       `1.5px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#FDE8CC'}`,
            borderRadius: 6,
            boxShadow:    isDark ? '0 2px 12px rgba(0,0,0,0.40)' : '0 2px 8px rgba(0,0,0,0.06)',
          }}
        />
      </ReactFlow>

      {/* ── Demo overlay (cursor + faux menu, screen-centred, non-interactive) ─ */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 6 }}>
        <div style={{ position: 'absolute', left: '50%', top: '50%', width: 0, height: 0 }}>

          <AnimatePresence>
            {clicking && (
              <motion.div
                key="ripple"
                initial={{ opacity: 0.55, scale: 0.2 }}
                animate={{ opacity: 0, scale: 1 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                style={{ position: 'absolute', left: -28, top: -20, width: 56, height: 56, borderRadius: '50%', border: '2px solid #EA580C' }}
              />
            )}
          </AnimatePresence>

          <AnimatePresence>
            {fauxMenu && (
              <motion.div
                key="faux-menu"
                initial={{ opacity: 0, y: 6, scale: 0.92 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.92 }}
                transition={{ type: 'spring', stiffness: 380, damping: 26 }}
                style={{
                  position: 'absolute', left: 26, top: 30, width: 172,
                  background: isDark ? '#1A1410' : '#FFFAF5',
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.10)'}`,
                  borderRadius: 12, overflow: 'hidden',
                  boxShadow: isDark ? '0 12px 36px rgba(0,0,0,0.6)' : '0 12px 32px rgba(0,0,0,0.16)',
                }}
              >
                <div style={{ padding: '8px 12px 6px', fontSize: 11, fontWeight: 600, color: t.text, borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}` }}>
                  You
                </div>
                <div style={{ padding: 4 }}>
                  <MenuRow icon={<IconArrowUp size={15} />}  color="#4F86C6" label="Add parent" isDark={isDark} />
                  <MenuRow icon={<IconHeart size={15} />}    color="#EA580C" label="Add spouse" isDark={isDark} highlight />
                  <MenuRow icon={<IconArrowDown size={15} />} color="#2EAA7C" label="Add child" isDark={isDark} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div
            initial={false}
            animate={cursorPose}
            transition={{ x: { type: 'spring', stiffness: 120, damping: 18 }, y: { type: 'spring', stiffness: 120, damping: 18 }, opacity: { duration: 0.3 } }}
            style={{ position: 'absolute', left: 0, top: 0 }}
          >
            <motion.div animate={clicking ? { scale: 0.82 } : { scale: 1 }} transition={{ duration: 0.18 }} style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.35))' }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                <path
                  d="M5 2.5 L5 19.5 L9.2 15.3 L12.1 21.4 L14.7 20.2 L11.8 14.2 L17.6 14.2 Z"
                  fill={isDark ? '#F5EDE6' : '#1A0A00'}
                  stroke={isDark ? '#1A0A00' : '#FFFFFF'}
                  strokeWidth="1.4" strokeLinejoin="round"
                />
              </svg>
              <AnimatePresence>
                {(demoPhase === 2 || demoPhase === 3) && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                    style={{ position: 'absolute', left: -2, top: -16, background: '#EA580C', color: '#fff', fontSize: 8, fontWeight: 700, letterSpacing: '0.06em', padding: '2px 6px', borderRadius: 999, whiteSpace: 'nowrap', boxShadow: '0 2px 8px rgba(234,88,12,0.45)' }}
                  >
                    RIGHT-CLICK
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* ── Live relation menu (real, interactive) ─────────────────────────── */}
      <AnimatePresence>
        {menu && (
          <RelationMenu
            x={menu.x} y={menu.y} w={menu.w} h={menu.h} name={menu.name}
            isDark={isDark} onPick={pick} onClose={() => setMenu(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Live right-click menu ──────────────────────────────────────────────────────

function RelationMenu({ x, y, w, h, name, isDark, onPick, onClose }: {
  x: number; y: number; w: number; h: number; name: string; isDark: boolean
  onPick: (rel: Rel) => void; onClose: () => void
}) {
  const t = getTheme(isDark)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as globalThis.Node)) onClose() }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDown)
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onDown) }
  }, [onClose])

  // Clamp within the canvas container so the menu never spills off-panel.
  const MENU_W = 184, MENU_H = 320
  const left = Math.max(8, x + MENU_W > w ? x - MENU_W : x)
  const top  = Math.max(8, y + MENU_H > h ? y - MENU_H : y)

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 6, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 6, scale: 0.94 }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      style={{
        position: 'absolute', left, top, width: MENU_W, zIndex: 60,
        background: isDark ? '#1A1410' : '#FFFAF5',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.10)'}`,
        borderRadius: 12, overflow: 'hidden',
        boxShadow: isDark ? '0 12px 36px rgba(0,0,0,0.6)' : '0 12px 32px rgba(0,0,0,0.16)',
      }}
    >
      <div style={{ padding: '9px 13px 7px', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}` }}>
        <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: t.textMuted }}>Add relative to</div>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
      </div>
      <div style={{ padding: 4 }}>
        {RELATIONS.map(r => (
          <button
            key={r.rel}
            onClick={() => onPick(r.rel)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 10px', borderRadius: 7, border: 'none', cursor: 'pointer',
              background: 'transparent', color: t.text, fontFamily: 'inherit',
              fontSize: 12.5, fontWeight: 500, textAlign: 'left', transition: 'background 0.12s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <span style={{ color: r.color, display: 'flex' }}>{r.icon}</span>
            {r.label}
          </button>
        ))}
      </div>
    </motion.div>
  )
}

function MenuRow({ icon, label, color, isDark, highlight = false }: {
  icon: React.ReactNode; label: string; color: string; isDark: boolean; highlight?: boolean
}) {
  const t = getTheme(isDark)
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', borderRadius: 7,
      fontSize: 12, fontWeight: highlight ? 700 : 500,
      color: highlight ? '#EA580C' : t.text,
      background: highlight ? (isDark ? 'rgba(234,88,12,0.16)' : 'rgba(234,88,12,0.10)') : 'transparent',
    }}>
      <span style={{ color: highlight ? '#EA580C' : color, display: 'flex' }}>{icon}</span>
      {label}
    </div>
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
