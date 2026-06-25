'use client'

// Public, read-only family-tree viewer (no auth). Reached from the landing-page
// search: a guest clicks a public person and lands here to view that person's
// profile and explore their family tree. Everything is read-only — no edit,
// merge, invite, or add affordances. Backend (`/api/graph/public`) only serves
// PUBLIC, non-community trees and strips sensitive fields.
//
// The layout pipeline mirrors hooks/useGraphData but without auth, the Zustand
// collapse state, or "Load more" paging (the backend returns the whole tree).

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { ReactFlowProvider, useReactFlow, type Node, type Edge } from '@xyflow/react'
import { AnimatePresence, motion } from 'framer-motion'
import { IconBinaryTree2, IconArrowRight, IconEye, IconLoader2 } from '@tabler/icons-react'
import DotField from '@/components/graph/DotField'
import GraphCanvasArea from '@/components/graph/GraphCanvasArea'
import PersonProfileView from '@/components/graph/PersonProfileView'
import { useGraphStore } from '@/store/graphStore'
import { useIsMobile } from '@/hooks/useIsMobile'
import { getTheme } from '@/lib/theme'
import { api } from '@/lib/api'
import { bfsDelays, buildDisplayEdges } from '@/lib/graph/edgeUtils'
import { filterGraphBySide } from '@/lib/layouts/familySideFilter'
import { injectGhostsForIntraFamilyMarriages, isGhostNodeId, realIdFromGhost } from '@/lib/graph/ghostNodes'
import { layoutEngine } from '@/lib/layouts/layoutEngine'
import type { PersonData } from '@/types'

const SAFFRON = 'var(--c-primary)'
const TERRACOTTA = 'var(--c-primary-strong)'

function asPersonData(data: unknown): PersonData {
  return data as PersonData
}

export default function PublicTreePage() {
  return (
    <ReactFlowProvider>
      <PublicTreeInner />
    </ReactFlowProvider>
  )
}

function PublicTreeInner() {
  const params = useParams()
  const personId = (Array.isArray(params?.id) ? params.id[0] : params?.id) ?? ''

  const isDark = useGraphStore(s => s.isDark)
  const setActiveNodeId = useGraphStore(s => s.setActiveNodeId)
  const isMobile = useIsMobile()
  const t = getTheme(isDark)
  const { fitView } = useReactFlow()

  const [rawNodes, setRawNodes] = useState<Node[]>([])
  const [rawEdges, setRawEdges] = useState<Edge[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [errorMsg, setErrorMsg] = useState('')
  // Land on the searched person's profile first; "Back to tree" reveals the canvas.
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(personId || null)
  const [canvasReady, setCanvasReady] = useState(false)

  // ── Fetch the public graph ────────────────────────────────────────────────
  useEffect(() => {
    if (!personId) { setStatus('error'); setErrorMsg('No person specified'); return }
    let cancelled = false
    setStatus('loading')
    api.graph.fetchPublic(personId)
      .then(data => {
        if (cancelled) return
        const rawE = data.edges.map(e => ({ ...e, type: 'sketchEdge' }))
        const delays = bfsDelays(data.nodes, rawE)
        const rawN = data.nodes.map(n => ({
          ...n,
          data: { ...(n.data as object), animDelay: delays.get(n.id) ?? 0 },
        }))
        setRawNodes(rawN)
        setRawEdges(rawE)
        setSelectedNodeId(personId)
        setStatus('ready')
      })
      .catch((err: Error) => {
        if (cancelled) return
        setErrorMsg(err.message || 'This tree is not available')
        setStatus('error')
      })
    return () => { cancelled = true }
  }, [personId])

  // ── Layout pipeline (pure) ────────────────────────────────────────────────
  const { laidOutNodes, displayEdges } = useMemo(() => {
    if (rawNodes.length === 0) return { laidOutNodes: [] as Node[], displayEdges: [] as Edge[] }
    const { nodes: fNodes, edges: fEdges, isMarriedWoman } = filterGraphBySide(rawNodes, rawEdges, 'sasural')
    const { nodes: gNodes, edges: gEdges } = injectGhostsForIntraFamilyMarriages(fNodes, fEdges)
    // Mirror useGraphData's default: a married woman's sasural view anchors on her spouse.
    const perspective = isMarriedWoman ? 'spouse' : 'self'
    const laid = layoutEngine(gNodes, gEdges, perspective, new Set())
    return { laidOutNodes: laid, displayEdges: buildDisplayEdges(laid, gEdges) }
  }, [rawNodes, rawEdges])

  // ── Fit the viewport once the tree is laid out ────────────────────────────
  useEffect(() => {
    if (laidOutNodes.length === 0) return
    const id = setTimeout(() => {
      fitView({ padding: 0.3, duration: 0, maxZoom: 1 })
      setCanvasReady(true)
    }, 60)
    return () => clearTimeout(id)
  }, [laidOutNodes, fitView])

  // ── Selected person → profile node (ghost-stripped, isSelf cleared) ───────
  const profileNode = useMemo(() => {
    if (!selectedNodeId) return null
    const realId = isGhostNodeId(selectedNodeId) ? realIdFromGhost(selectedNodeId) : selectedNodeId
    const found = rawNodes.find(n => n.id === realId)
    if (!found) return null
    // The focal node carries isSelf=true (needed for layout). Clear it for the
    // profile so a guest never sees "You" / "This is you".
    return { ...found, data: { ...found.data, isSelf: false } }
  }, [selectedNodeId, rawNodes])

  const focalName = useMemo(() => {
    const n = rawNodes.find(p => p.id === personId)
    return n ? asPersonData(n.data).fullName : ''
  }, [rawNodes, personId])

  const selectNode = (id: string) => {
    if (id.startsWith('couple_') || id.startsWith('__load_more')) return
    setSelectedNodeId(id)
    setActiveNodeId(id)
  }
  const clearSelection = () => {
    setSelectedNodeId(null)
    setActiveNodeId(null)
  }

  // ── Loading / error states ────────────────────────────────────────────────
  if (status === 'loading') {
    return (
      <div style={{ minHeight: '100dvh', background: t.pageBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}>
          <IconLoader2 size={28} color={SAFFRON} />
        </motion.div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div style={{ minHeight: '100dvh', background: t.pageBg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 24, gap: 16 }}>
        <div style={{ fontSize: 40 }}>🌳</div>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', color: t.text }}>
            This tree isn’t public
          </h1>
          <p style={{ margin: '8px 0 0', fontSize: 15, color: t.textMuted, maxWidth: 360 }}>
            {errorMsg}. It may be private, part of a community, or no longer exist.
          </p>
        </div>
        <a
          href="/"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none',
            padding: '12px 22px', borderRadius: 12, fontSize: 15, fontWeight: 700, color: '#fff',
            background: 'linear-gradient(135deg, var(--c-primary) 0%, var(--c-primary-strong) 100%)',
            boxShadow: '0 4px 16px rgb(var(--c-primary-rgb) / 0.32)',
          }}
        >
          Back to search <IconArrowRight size={16} strokeWidth={2.5} />
        </a>
      </div>
    )
  }

  // ── Tree view ─────────────────────────────────────────────────────────────
  return (
    <div className="app-viewport" style={{ position: 'relative', overflow: 'hidden', background: t.pageBg, transition: 'background 0.4s' }}>
      <DotField isDark={isDark} />

      <GraphCanvasArea
        isDark={isDark} isMobile={isMobile} canvasReady={canvasReady}
        nodes={laidOutNodes} edges={displayEdges}
        onNodesChange={() => {}}
        onEdgesChange={() => {}}
        onPaneClick={clearSelection}
        onNodeClick={selectNode}
        onNodeContextMenu={() => {}}
      />

      {/* Top bar — brand + read-only badge + sign-up CTA. Sits above the canvas;
          hidden visually while the full-screen profile overlay is open. */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 12, padding: isMobile ? '12px 14px' : '16px 22px', pointerEvents: 'none',
      }}>
        <a href="/" style={{
          pointerEvents: 'auto', display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none',
          background: t.controlBg, border: `1.5px solid ${t.controlBorder}`,
          padding: '8px 14px', borderRadius: 12, boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
        }}>
          <div style={{
            width: 24, height: 24, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg, var(--c-primary) 0%, var(--c-primary-strong) 100%)',
          }}>
            <IconBinaryTree2 size={15} color="#fff" strokeWidth={2.2} />
          </div>
          <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.02em', color: t.text }}>Ancestree</span>
        </a>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            pointerEvents: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 12.5, fontWeight: 700, color: TERRACOTTA,
            background: isDark ? 'rgb(var(--c-primary-rgb) / 0.16)' : 'rgb(var(--c-primary-rgb) / 0.10)',
            border: `1px solid ${isDark ? 'rgb(var(--c-primary-rgb) / 0.3)' : 'rgb(var(--c-primary-rgb) / 0.2)'}`,
            padding: '7px 12px', borderRadius: 20,
          }}>
            <IconEye size={14} strokeWidth={2.2} /> {isMobile ? 'Read-only' : 'Public tree · read-only'}
          </span>
          <a href="/signup" style={{
            pointerEvents: 'auto', display: 'inline-flex', alignItems: 'center', gap: 7, textDecoration: 'none',
            fontSize: 13.5, fontWeight: 700, color: '#fff',
            background: 'linear-gradient(135deg, var(--c-primary) 0%, var(--c-primary-strong) 100%)',
            padding: '8px 16px', borderRadius: 12, boxShadow: '0 3px 12px rgb(var(--c-primary-rgb) / 0.32)',
          }}>
            Build your tree <IconArrowRight size={15} strokeWidth={2.5} />
          </a>
        </div>
      </div>

      {/* Bottom hint — only on the bare tree (no profile open) */}
      {!profileNode && focalName && (
        <div style={{
          position: 'absolute', bottom: isMobile ? 16 : 22, left: 0, right: 0, zIndex: 20,
          display: 'flex', justifyContent: 'center', pointerEvents: 'none', padding: '0 16px',
        }}>
          <div style={{
            fontSize: 13, fontWeight: 600, color: t.textMuted,
            background: t.controlBg, border: `1.5px solid ${t.controlBorder}`,
            padding: '8px 16px', borderRadius: 20, boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
            textAlign: 'center',
          }}>
            Viewing <strong style={{ color: t.text }}>{focalName}</strong>’s family — tap any photo to see their profile
          </div>
        </div>
      )}

      {/* Full-screen read-only profile (no onEdit → no edit button) */}
      <AnimatePresence>
        {profileNode && (
          <PersonProfileView
            key={selectedNodeId}
            node={profileNode}
            onBack={clearSelection}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
