'use client'

// Graph page — orchestrates data fetching, overlay state, and composition.
//
// Visual pieces:
//   • DotField           — background dot pattern (always mounted)
//   • GraphCanvasArea    — React Flow canvas + Controls + MiniMap
//   • GraphHUD           — top strip (family badge, search, profile, bell, theme)
//   • ExplorationBanner  — banner shown only in exploration mode
//   • Navbar             — bottom action bar
//   • GraphOverlays      — every modal/panel/wizard, composed centrally
//
// Where things live:
//   • Overlay state cluster → hooks/useGraphPageState
//   • Side-effects          → hooks/useGraphPageEffects
//   • Viewport fit          → hooks/useFitViewportOnLoad
//   • Overlay prop builder  → lib/graph/buildOverlayProps

import { useCallback, useEffect, useMemo, useRef, useState, Suspense } from 'react'
import { ReactFlowProvider, useReactFlow } from '@xyflow/react'
import { AnimatePresence } from 'framer-motion'
import { useRouter, useSearchParams } from 'next/navigation'
import DotField from '@/components/graph/DotField'
import Navbar from '@/components/graph/Navbar'
import TreeTimeline from '@/components/graph/TreeTimeline'
import ExplorationBanner from '@/components/graph/ExplorationBanner'
import GraphHUD from '@/components/graph/GraphHUD'
import GraphOverlays from '@/components/graph/GraphOverlays'
import GraphLoading from '@/components/graph/GraphLoading'
import GraphError from '@/components/graph/GraphError'
import GraphCanvasArea from '@/components/graph/GraphCanvasArea'
import { useGraphStore } from '@/store/graphStore'
import { useGraphData } from '@/hooks/useGraphData'
import { useNodeActions } from '@/hooks/useNodeActions'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useGraphPageState } from '@/hooks/useGraphPageState'
import { useGraphPageEffects } from '@/hooks/useGraphPageEffects'
import { useFitViewportOnLoad } from '@/hooks/useFitViewportOnLoad'
import { getTheme } from '@/lib/theme'
import { api, type MergeConflict } from '@/lib/api'
import { getToken } from '@/lib/api/client'
import { isGhostNodeId, realIdFromGhost } from '@/lib/graph/ghostNodes'
import { checkDeletable } from '@/lib/graph/deleteRules'
import { isDupDismissed, getCommunityId, getCommunitySlug } from '@/lib/storage'
import type { FieldConfig } from '@/lib/community/fieldConfig'
import OnboardingTour, { ONBOARDING_DONE_KEY } from '@/components/graph/onboarding/OnboardingTour'
import BulkEditPanel, { type BulkChanges } from '@/components/graph/BulkEditPanel'
import CreateHomePanel from '@/components/graph/CreateHomePanel'
import SelectionActionChooser from '@/components/graph/SelectionActionChooser'
import { computeBloodline } from '@/lib/graph/bloodline'
import { buildOverlayProps } from '@/lib/graph/buildOverlayProps'
import type { PersonData } from '@/types'
import { canEditPersonProfile } from '@/types'
import type { RelAction } from '@/components/graph/Navbar'
import type { WizardExtras } from '@/components/graph/AddNodeWizard'
import type { SearchResult } from '@/lib/api'

function asPersonData(data: unknown): PersonData {
  return data as PersonData
}

// Anchor the node context-menu to the SELECTED node's box (so it sticks beside
// the node instead of floating at the pointer). Opens to the node's right, or
// flips to its left when there's no room. Falls back to the pointer position if
// the node element isn't found. NodeContextMenu still clamps vertically + as a
// final safety. MENU_W must match NodeContextMenu's own width.
const CTX_MENU_W = 220
function menuAnchorForNode(nodeId: string, fallback: { x: number; y: number }): { x: number; y: number } {
  if (typeof document === 'undefined') return fallback
  const el = document.querySelector(`.react-flow__node[data-id="${CSS.escape(nodeId)}"]`)
  const r = el?.getBoundingClientRect()
  if (!r) return fallback
  const GAP = 6, M = 8
  const x = r.right + GAP + CTX_MENU_W <= window.innerWidth - M
    ? r.right + GAP
    : Math.max(M, r.left - GAP - CTX_MENU_W)
  return { x, y: r.top }
}

// Family-badge count views, cycled by clicking the number.
type CountMode = 'side' | 'family' | 'community'

export default function GraphPage() {
  return (
    <ReactFlowProvider>
      <Suspense fallback={null}>
        <GraphInner />
      </Suspense>
    </ReactFlowProvider>
  )
}

function GraphInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const perspectiveId = searchParams.get('perspective') ?? undefined
  // The merge-review sidebar belongs ONLY to a review/explore entry — i.e. a
  // perspective opened from a notification ("View their tree", carries
  // ?viewMerge=) or a possible-match suggestion (?match=). A plain
  // ?perspective= from the search bar must NOT show it. This URL marker is the
  // de-facto "merge-review endpoint"; without it we're just browsing a tree.
  const isReviewEntry = !!(searchParams.get('viewMerge') || searchParams.get('match'))

  const { getNodes, setCenter, fitView, getViewport } = useReactFlow()
  const { isDark, setIsDark, unreadCount, setNotifications, fullView, toggleFullView } = useGraphStore()
  const isMobile = useIsMobile()
  const t = getTheme(isDark)

  const s = useGraphPageState()

  // Community mode — set after mount (JWT lives in localStorage). When set,
  // the family badge becomes clickable and opens the admin list panel.
  const [communityId, setCommunityId] = useState<string | null>(null)
  useEffect(() => { setCommunityId(getCommunityId()) }, [])

  // Community owner/admin — reveals the top-left Admin entry that opens the
  // full admin dashboard (/admin). Resolved once the community is known.
  const [isAdmin, setIsAdmin] = useState(false)
  useEffect(() => {
    if (!communityId) return
    const slug = getCommunitySlug()
    if (!slug) return
    let active = true
    api.community.me(slug)
      .then(({ role }) => { if (active) setIsAdmin(role === 'owner' || role === 'admin') })
      .catch(() => { /* not an admin — keep the entry hidden */ })
    return () => { active = false }
  }, [communityId])

  // Community field config — drives the node editor (which fields show, dropdown
  // values, auto-filled constants). Null for non-community trees → editor uses
  // its built-in defaults.
  const [fieldConfig, setFieldConfig] = useState<FieldConfig | null>(null)
  useEffect(() => {
    if (!communityId) return
    const slug = getCommunitySlug()
    if (!slug) return
    let active = true
    api.community.fieldConfig(slug)
      .then(cfg => { if (active) setFieldConfig(cfg) })
      .catch(() => { /* fall back to the editor's built-in fields */ })
    return () => { active = false }
  }, [communityId])

  // Community users can jump back to their community's website via a second
  // Home press (see onHome). Resolve the target once: the community's custom
  // site_url, or the on-origin community landing when none is configured.
  const [communitySiteUrl, setCommunitySiteUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!communityId) return
    const slug = getCommunitySlug()
    if (!slug) return
    let active = true
    api.community.getInfo(slug)
      .then(info => { if (active) setCommunitySiteUrl(info.site_url ?? `/community/${slug}`) })
      .catch(() => { /* leave the jump-out disabled if it can't resolve */ })
    return () => { active = false }
  }, [communityId])

  const {
    nodes, edges, rawNodes, rawEdges,
    setNodes, setEdges,
    onNodesChange, onEdgesChange,
    visibleNodes, displayEdges,
    graphLoading, graphError, graphFailCount, fetchGraph, resetAndFetch,
    isMarriedWoman, womanView, onWomanViewChange,
    familyName,
    sideMemberCount,
    updateRawNode,
  } = useGraphData(perspectiveId)

  // Total real people in the current family. rawNodes is the backend person set
  // before couple/ghost/load-more pseudo-nodes are injected.
  const memberCount = useMemo(
    () => rawNodes.filter(
      n => !n.id.startsWith('couple_')
        && !n.id.startsWith('__load_more')
        && !isGhostNodeId(n.id),
    ).length,
    [rawNodes],
  )

  // Family-badge count has three views the user cycles by clicking the number:
  //   'side'      — people on the side currently shown (bloodline/view rule)
  //   'family'    — everyone in this family record (both sides + married-in)
  //   'community' — total people across all trees in the community
  // 'community' is only offered inside a community.
  const [communityCount, setCommunityCount] = useState<number | null>(null)
  useEffect(() => {
    if (!communityId) return
    const slug = getCommunitySlug()
    if (!slug) return
    let active = true
    api.community.stats(slug)
      .then(({ total_persons }) => { if (active) setCommunityCount(total_persons) })
      .catch(() => { /* leave community view unavailable */ })
    return () => { active = false }
  }, [communityId, rawNodes.length])

  const countModes = useMemo<CountMode[]>(
    () => (communityId && communityCount != null ? ['side', 'family', 'community'] : ['side', 'family']),
    [communityId, communityCount],
  )
  const [countMode, setCountMode] = useState<CountMode>('side')
  const cycleCount = useCallback(() => {
    setCountMode(prev => {
      const i = countModes.indexOf(prev)
      return countModes[(i + 1) % countModes.length]
    })
  }, [countModes])

  const badgeCount =
    countMode === 'community' ? (communityCount ?? memberCount)
    : countMode === 'family'  ? memberCount
    :                           sideMemberCount

  const { onUpdateNode, onSaveNode, onDeleteNode, onAddRelation } = useNodeActions(
    rawNodes, rawEdges, setNodes, setEdges, fetchGraph, s.selectedNodeId, s.setSelectedNodeId,
    (newPersonId, matches, myInfo) => {
      if (isDupDismissed(newPersonId)) return
      s.setDuplicateInfo({ newPersonId, matches, myInfo })
    },
    (newPersonId, newPersonName, matches) => {
      s.setSameTreeDup({ newPersonId, newPersonName, matches })
    },
    updateRawNode,
  )

  // Exploration mode — true when we're viewing another tree to evaluate a merge.
  // When the exploration banner occupies the top strip, push the whole HUD row
  // down so nothing overlaps it.
  const isExploration    = !!perspectiveId && isReviewEntry && !!s.pendingMatch
  const EXPLORE_BANNER_H = 46
  const hudOffset        = isExploration ? EXPLORE_BANNER_H : 0
  const matchHighlightNode = useMemo(
    () => isExploration ? (nodes.find(n => asPersonData(n.data).isSelf) ?? null) : null,
    [nodes, isExploration],
  )

  // Inject isMatchHighlight into the isSelf node when in exploration mode
  const explorationNodes = useMemo(() => {
    if (!isExploration) return visibleNodes
    return visibleNodes.map(n => {
      if (asPersonData(n.data).isSelf)
        return { ...n, data: { ...n.data, isMatchHighlight: true } }
      return n
    })
  }, [visibleNodes, isExploration])

  useGraphPageEffects({ s, perspectiveId, isReviewEntry, nodes, graphLoading, isExploration, matchHighlightNode })

  const perspectivePerson = perspectiveId
    ? nodes.find(n => asPersonData(n.data)?.isSelf) ?? null
    : null
  const perspectiveName   = asPersonData(perspectivePerson?.data)?.fullName ?? ''
  const selectedNode      = s.selectedNodeId ? nodes.find(n => n.id === s.selectedNodeId) ?? null : null
  const selectedNodeName  = asPersonData(selectedNode?.data)?.fullName ?? ''
  const selectedIsSelf    = asPersonData(selectedNode?.data)?.isSelf ?? false
  const selectedIsClaimed = asPersonData(selectedNode?.data)?.nodeState === 'claimed'
  // Owned (claimed-by-someone-else) nodes are read-only — gate every edit
  // affordance (navbar pencil, context menu, profile view) on this.
  const canEditSelected   = !!selectedNode && canEditPersonProfile(asPersonData(selectedNode.data))
  // Deletable = not you, not a claimed account, and an edge node — removing
  // them must not split the tree (see lib/graph/deleteRules.ts).
  const deleteCheck = useMemo(
    () => s.selectedNodeId ? checkDeletable(s.selectedNodeId, rawNodes, rawEdges) : null,
    [s.selectedNodeId, rawNodes, rawEdges],
  )
  const canDeleteSelected = !!s.selectedNodeId && !selectedIsSelf && !selectedIsClaimed
    && (deleteCheck?.deletable ?? false)
  const deleteDisabledReason = !s.selectedNodeId ? undefined
    : selectedIsSelf            ? 'You cannot remove your own node'
    : selectedIsClaimed         ? 'Claimed profiles cannot be removed'
    : deleteCheck?.deletable === false
      ? 'Connects other family members — remove the people beyond them first'
      : undefined

  const canvasReady = useFitViewportOnLoad({
    graphLoading,
    visibleNodesCount: visibleNodes.length,
    perspectiveId,
  })

  // ── First-time onboarding tour ─────────────────────────────────────────────
  // New members arriving from an invite claim carry ?onboarding=1. Run the
  // guided walkthrough once, then persist completion and strip the flag.
  // Derived once from the URL flag + prior completion — no effect needed (and
  // finishTour flips it off + strips the flag, so we don't want to re-trigger).
  const [tourActive, setTourActive] = useState(() => {
    if (typeof window === 'undefined') return false
    if (searchParams.get('onboarding') !== '1') return false
    return !localStorage.getItem(ONBOARDING_DONE_KEY)
  })

  // Select the viewer's own node (centered, panel closed) so the Add/Edit/Home
  // steps point at live, enabled controls.
  const selectSelf = useCallback(() => {
    const selfNode = getNodes().find(n => {
      const d = n.data as Record<string, unknown>
      if (asPersonData(d)?.isSelf) return true
      if (n.type === 'collapsedCouple')
        return !!(asPersonData(d.person1)?.isSelf || asPersonData(d.person2)?.isSelf)
      return false
    })
    if (!selfNode) return
    const w = selfNode.measured?.width  ?? (selfNode.width  as number | undefined) ?? 128
    const h = selfNode.measured?.height ?? (selfNode.height as number | undefined) ?? 140
    setCenter(selfNode.position.x + w / 2, selfNode.position.y + h / 2, { zoom: 1, duration: 600 })
    // Only a real person node can be the navbar's selection target (couples aren't).
    if (!selfNode.id.startsWith('couple_')) {
      s.setSelectedNodeId(selfNode.id)
      s.setPanelMode('none')
    }
  }, [getNodes, setCenter, s])

  const finishTour = useCallback(() => {
    try { localStorage.setItem(ONBOARDING_DONE_KEY, '1') } catch { /* storage unavailable */ }
    setTourActive(false)
    router.replace('/graph')
  }, [router])

  // Replay the tour on demand (Help button in the HUD) — works even after the
  // one-time completion flag is set.
  const replayTour = useCallback(() => setTourActive(true), [])

  // ── Admin bulk selection (bloodline auto-select + manual multi-select) ───────
  const [bulkScope,   setBulkScope]   = useState<'bloodline' | 'selection' | null>(null)
  const [bulkIds,     setBulkIds]     = useState<Set<string>>(new Set())
  const [bulkPanelOpen, setBulkPanelOpen] = useState(false)
  const [bulkApplying, setBulkApplying] = useState(false)
  const [bulkError,   setBulkError]   = useState('')
  // After Done, a community selection first shows an icon chooser (Edit details /
  // Make a home), then the chosen panel. Non-community goes straight to 'edit'.
  const [bulkChoice, setBulkChoice] = useState<'chooser' | 'home' | 'edit'>('chooser')
  // A non-admin making their own home: their own node is auto-included and cannot
  // be deselected (null for admins, who select freely).
  const [lockedSelfId, setLockedSelfId] = useState<string | null>(null)
  // Manual multi-select is active when scope is 'selection' and the panel isn't
  // open yet — clicks then toggle membership instead of opening the node panel.
  const selectionMode = bulkScope === 'selection' && !bulkPanelOpen

  const realIdOf = useCallback((id: string) => (isGhostNodeId(id) ? realIdFromGhost(id) : id), [])

  const exitBulk = useCallback(() => {
    setBulkScope(null); setBulkIds(new Set()); setBulkPanelOpen(false); setBulkError(''); setBulkChoice('chooser'); setLockedSelfId(null)
  }, [])

  // "Select bloodline family" — resolve the paternal line from the anchor and go
  // straight to the edit panel.
  const onSelectBloodline = useCallback((nodeId: string) => {
    const ids = computeBloodline(nodeId, rawNodes, rawEdges)
    if (ids.size === 0) return
    setBulkScope('bloodline'); setBulkIds(ids); setBulkPanelOpen(true); setBulkError('')
  }, [rawNodes, rawEdges])

  // The viewer's own claimed node (null when viewing someone else's tree).
  const selfRawId = useMemo(
    () => rawNodes.find(n => asPersonData(n.data)?.isSelf)?.id ?? null,
    [rawNodes],
  )
  // A normal (non-admin) community member may create ONE home — their own — and
  // is always part of it. Admins select freely for anyone.
  const canMakeOwnHome = !isAdmin && !!communityId && !!selfRawId

  // "Select multiple people" — enter manual selection mode. Admins start empty
  // (pick anyone); a normal user starts with their own node pre-selected + locked
  // (their home always includes them; head defaults to them).
  const onSelectMultiple = useCallback(() => {
    const seedSelf = canMakeOwnHome && selfRawId ? realIdOf(selfRawId) : null
    setBulkScope('selection')
    setBulkIds(new Set(seedSelf ? [seedSelf] : []))
    setLockedSelfId(seedSelf)
    setBulkPanelOpen(false); setBulkError('')
  }, [canMakeOwnHome, selfRawId, realIdOf])

  const toggleBulkId = useCallback((nodeId: string) => {
    const id = realIdOf(nodeId)
    if (id === lockedSelfId) return // a normal user can't remove themselves from their own home
    setBulkIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }, [realIdOf, lockedSelfId])

  const applyBulk = useCallback(async (changes: BulkChanges) => {
    if (!bulkScope) return
    setBulkApplying(true); setBulkError('')
    try {
      await api.persons.bulkUpdate({ person_ids: [...bulkIds], scope: bulkScope, ...changes })
      exitBulk()
      await resetAndFetch()
    } catch (err) {
      setBulkError(err instanceof Error ? err.message : 'Failed to apply changes')
    } finally {
      setBulkApplying(false)
    }
  }, [bulkScope, bulkIds, exitBulk, resetAndFetch])

  // Create a home from the current selection + a city (community admin only).
  const createHome = useCallback(async (input: { headPersonId: string; city: string }) => {
    const slug = getCommunitySlug()
    if (!slug) return
    setBulkApplying(true); setBulkError('')
    try {
      // No free-text name — the home is named after its head (display derives
      // "{HeadFirstName}'s home"). Send the chosen head so the backend honors it
      // instead of auto-picking by birth_year.
      await api.community.createHome(slug, {
        head_person_id: input.headPersonId,
        city: input.city,
        person_ids: [...bulkIds],
      })
      // Stay on the graph after creating — don't redirect to the admin dashboard.
      exitBulk()
    } catch (err) {
      setBulkError(err instanceof Error ? err.message : 'Failed to create home')
    } finally {
      setBulkApplying(false)
    }
  }, [bulkIds, exitBulk, router])

  // Names for the panel chips, resolved from the raw person set.
  const bulkPeople = useMemo(() => {
    if (bulkIds.size === 0) return [] as { id: string; name: string }[]
    return [...bulkIds].map(id => {
      const n = rawNodes.find(rn => realIdOf(rn.id) === id)
      return { id, name: asPersonData(n?.data)?.fullName ?? 'Unknown' }
    })
  }, [bulkIds, rawNodes, realIdOf])

  // Default home head = the ELDEST selected member, by GENERATION hierarchy —
  // not birthdate. Generation = PARENT_OF depth in the graph (topmost ancestor =
  // fewest parents above = eldest). Only among the same top generation do we fall
  // back to male → oldest birth_year → person_code as a tie-break. The user can
  // override this default in the Create-home panel.
  const eldestHeadId = useMemo(() => {
    const ids = [...bulkIds]
    if (ids.length === 0) return ''

    // child → parents, from the raw PARENT_OF edges (real ids).
    const parentsOf = new Map<string, string[]>()
    for (const e of rawEdges) {
      if ((e.data as { relType?: string } | undefined)?.relType !== 'PARENT_OF') continue
      const arr = parentsOf.get(e.target) ?? []
      arr.push(e.source)
      parentsOf.set(e.target, arr)
    }
    // Generation depth = longest PARENT_OF chain above a node (0 = a root/eldest).
    const depthCache = new Map<string, number>()
    const depth = (id: string): number => {
      const cached = depthCache.get(id)
      if (cached !== undefined) return cached
      depthCache.set(id, 0) // cycle guard (graph is acyclic, but be safe)
      const ps = parentsOf.get(id) ?? []
      const d = ps.length === 0 ? 0 : 1 + Math.max(...ps.map(depth))
      depthCache.set(id, d)
      return d
    }

    const dataOf = (id: string) => asPersonData(rawNodes.find(rn => realIdOf(rn.id) === id)?.data)
    const ranked = ids.filter(id => dataOf(id)).sort((a, b) => {
      const da = depth(a), db = depth(b)
      if (da !== db) return da - db                              // fewer parents above = eldest generation
      const pa = dataOf(a)!, pb = dataOf(b)!
      const am = pa.gender === 'male' ? 0 : 1, bm = pb.gender === 'male' ? 0 : 1
      if (am !== bm) return am - bm
      const ay = pa.birthYear ?? 99999, by = pb.birthYear ?? 99999
      if (ay !== by) return ay - by
      return (pa.personCode ?? '').localeCompare(pb.personCode ?? '')
    })
    return ranked[0] ?? ''
  }, [bulkIds, rawNodes, rawEdges, realIdOf])

  // The person currently in view (self / perspective anchor) — seeds the navbar
  // "Multi" selection and "All" (whole-bloodline) select.
  const viewAnchorRawId = useMemo(
    () => rawNodes.find(n => asPersonData(n.data)?.isSelf)?.id ?? rawNodes[0]?.id,
    [rawNodes],
  )

  // Node just created via the add-relation wizard — flagged briefly so it plays
  // the "just added" pop + pulse instead of us popping open the edit panel.
  const [justAddedId, setJustAddedId] = useState<string | null>(null)

  // Paint the emerald bulk-selection ring onto whichever visible nodes are in the
  // set (built on top of the exploration-highlight layer), plus the transient
  // "just added" highlight on a freshly-created node.
  const canvasNodes = useMemo(() => {
    let ns = explorationNodes
    if (justAddedId)
      ns = ns.map(n => realIdOf(n.id) === justAddedId
        ? { ...n, data: { ...n.data, isJustAdded: true } } : n)
    if (bulkIds.size > 0)
      ns = ns.map(n => bulkIds.has(realIdOf(n.id))
        ? { ...n, data: { ...n.data, isBulkSelected: true } } : n)
    return ns
  }, [explorationNodes, bulkIds, realIdOf, justAddedId])

  // Open the 3D family-graph view (familygraph app, a separate Vite app on its
  // own origin). localStorage can't be shared across origins, so we hand the
  // session over in the URL hash — familygraph persists it and skips its login.
  const onOpen3D = useCallback(() => {
    const base = process.env.NEXT_PUBLIC_FAMILYGRAPH_URL ?? 'http://localhost:5173'
    const token = getToken()
    const url = token ? `${base}/#token=${encodeURIComponent(token)}` : base
    window.open(url, '_blank', 'noopener,noreferrer')
  }, [])

  const onHome = useCallback(() => {
    // Self may be a standalone node OR collapsed inside a couple card, where
    // isSelf lives on data.person1/person2 rather than the node itself — the
    // reason centering used to silently miss for married users in paired view.
    const selfNode = getNodes().find(n => {
      const d = n.data as Record<string, unknown>
      if (asPersonData(d)?.isSelf) return true
      if (n.type === 'collapsedCouple')
        return !!(asPersonData(d.person1)?.isSelf || asPersonData(d.person2)?.isSelf)
      return false
    })

    if (!selfNode) { fitView({ padding: 0.35, duration: 600 }); return }

    const w  = selfNode.measured?.width  ?? (selfNode.width  as number | undefined) ?? 128
    const h  = selfNode.measured?.height ?? (selfNode.height as number | undefined) ?? 140
    const cx = selfNode.position.x + w / 2
    const cy = selfNode.position.y + h / 2

    // Already centered on your own node? A second Home press takes community
    // users out to their community's website. Detect "home" by checking that
    // the self node currently sits at the pane centre at ~1× zoom.
    if (communitySiteUrl) {
      const pane = typeof document !== 'undefined'
        ? (document.querySelector('.react-flow') as HTMLElement | null) : null
      const rect = pane?.getBoundingClientRect()
      const vp   = getViewport()
      const homed = !!rect
        && Math.abs(cx * vp.zoom + vp.x - rect.width  / 2) < 40
        && Math.abs(cy * vp.zoom + vp.y - rect.height / 2) < 40
        && Math.abs(vp.zoom - 1) < 0.06
      if (homed) {
        if (/^https?:\/\//i.test(communitySiteUrl)) window.location.href = communitySiteUrl
        else router.push(communitySiteUrl)
        return
      }
    }

    setCenter(cx, cy, { zoom: 1, duration: 600 })
  }, [getNodes, setCenter, fitView, getViewport, communitySiteUrl, router])

  const handleSearchSelect = useCallback((personId: string): boolean => {
    const canvasNodes = getNodes()
    const node = canvasNodes.find(n => n.id === personId)
    if (!node) return false
    setCenter(node.position.x + 64, node.position.y + 79, { zoom: 1.2, duration: 500 })
    s.setSelectedNodeId(personId)
    s.setPanelMode('view')
    return true
  }, [getNodes, setCenter, s])

  const handleWizardAdd = useCallback(async (action: RelAction, fullName: string, extras: WizardExtras) => {
    // Remember the node we're adding FROM — onAddRelation moves the selection to
    // the new node, but we want to stay on the anchor so the user can keep adding
    // relatives in one flow (and, on mobile, not get an edit slider thrown at them).
    const anchorId = s.selectedNodeId
    const newId = await onAddRelation(action, fullName, extras)
    s.setWizardAction(null)
    // No edit panel — the wizard already collected the essentials. Restore the
    // anchor selection and celebrate the new node with a brief pop animation.
    s.setPanelMode('none')
    if (anchorId) s.setSelectedNodeId(anchorId)
    if (newId) {
      setJustAddedId(newId)
      setTimeout(() => setJustAddedId(cur => (cur === newId ? null : cur)), 2200)
    }
  }, [onAddRelation, s])

  // Node created on a previous Send attempt whose merge request failed —
  // reused on retry so we don't create a duplicate proxy.
  const wizardMergeRetry = useRef<{ matchId: string; personId: string } | null>(null)

  const handleWizardAddForMerge = useCallback(async (action: RelAction, match: SearchResult) => {
    // Runs from MergeConfirmModal's Send button (wizard search mode). Throws
    // on failure so the modal surfaces the error; on success the modal's
    // animation finishes and its onSent closes the wizard.
    let personId = wizardMergeRetry.current?.matchId === match.id
      ? wizardMergeRetry.current.personId
      : null
    if (!personId) {
      // Suppress the auto duplicate modal — this IS an explicit merge request.
      personId = await onAddRelation(action, match.full_name, { skipDuplicateCheck: true })
      if (!personId) throw new Error('Could not create the node — please try again')
      wizardMergeRetry.current = { matchId: match.id, personId }
    }
    await api.merges.create({ new_person_id: personId, canonical_person_id: match.id })
    wizardMergeRetry.current = null
  }, [onAddRelation])

  const onMergeAccepted = useCallback((conflicts: MergeConflict[]) => {
    // Use resetAndFetch so collapse state is recomputed to include the newly-added family unit.
    resetAndFetch()
    // Refresh notification list so all family members' unread counts update
    api.notifications.list()
      .then(({ notifications, unread_count }) => setNotifications(notifications, unread_count))
      .catch(() => {})
    s.setNotifPanelOpen(false)
    s.setMatchPanelOpen(false)
    if (isExploration) router.push('/graph')
    if (conflicts.length > 0) s.setMergeConflicts(conflicts)
  }, [resetAndFetch, isExploration, router, setNotifications, s])

  // Full-screen loader only when there's nothing to show yet (first load, or a
  // perspective switch — which clears rawNodes). Refetches after add/edit keep
  // the canvas mounted, so the viewport stays where the user was working
  // instead of resetting to the self node.
  if (graphLoading && rawNodes.length === 0) return <GraphLoading isDark={isDark} />
  if (graphError)   return <GraphError isDark={isDark} attempts={graphFailCount} onRetry={fetchGraph} />

  // Resolve the anchor's "real" id (ghost-stripped) once — used by both wizards.
  const anchorRealId = s.selectedNodeId && isGhostNodeId(s.selectedNodeId)
    ? realIdFromGhost(s.selectedNodeId)
    : s.selectedNodeId

  const overlays = buildOverlayProps({
    s, selectedNode, selectedNodeName, matchHighlightNode, anchorRealId,
    nodes, edges, rawNodes, rawEdges,
    router,
    isPerspective: !!perspectiveId,
    perspectiveName,
    fetchGraph, resetAndFetch, onUpdateNode, onSaveNode,
    onDeleteNode, canDeleteSelected, deleteDisabledReason,
    deleteChildrenNote: deleteCheck?.childrenStayWith ?? null,
    handleWizardAdd, handleWizardAddForMerge, onMergeAccepted,
    fieldConfig,
    isAdmin,
    onSelectBloodline: isAdmin ? onSelectBloodline : undefined,
    onSelectMultiple:  isAdmin ? onSelectMultiple  : undefined,
  })

  return (
    <div className="app-viewport" style={{ position: 'relative', overflow: 'hidden', background: t.pageBg, transition: 'background 0.4s' }}>
      <DotField isDark={isDark} />

      <GraphCanvasArea
        isDark={isDark} isMobile={isMobile} canvasReady={canvasReady}
        nodes={canvasNodes} edges={displayEdges}
        onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
        onPaneClick={() => {
          s.setContextMenu(null)
          // Don't clear an in-progress multi-selection on a background click.
          if (selectionMode) return
          s.setSelectedNodeId(null)
          s.setPanelMode('none')
        }}
        onNodeClick={(id, coords) => {
          s.setContextMenu(null)
          if (id.startsWith('couple_')) return
          // In manual multi-select mode a tap toggles membership instead of
          // opening the node panel.
          if (selectionMode) { toggleBulkId(id); return }
          // Synthetic UI chips (load-more) handle their own click — don't open the panel.
          if (id.startsWith('__load_more_')) return
          // UI-only "Unknown" parent placeholder — not a real person, inert.
          if (id.startsWith('__unknown_parent__')) return
          // In exploration mode, clicking the highlighted node opens the merge comparison panel.
          if (isExploration && matchHighlightNode && id === matchHighlightNode.id) {
            s.setMatchPanelOpen(true)
            return
          }
          // On touch devices a tap opens the same action menu that right-click
          // opens on desktop — long-press is unreliable on iOS (the system
          // callout/selection gesture cancels it before it can fire).
          if (isMobile) {
            const node = nodes.find(n => n.id === id)
            if (!node) return
            // Select the tapped node (without opening a panel) so the bottom
            // navbar's actions activate for it, then show the action menu.
            s.setSelectedNodeId(id)
            s.setPanelMode('none')
            {
              const a = menuAnchorForNode(id, { x: coords.x, y: coords.y })
              s.setContextMenu({ nodeId: id, x: a.x, y: a.y, personData: asPersonData(node.data) })
            }
            return
          }
          s.setSelectedNodeId(prev => {
            if (prev === id) { s.setPanelMode('none'); return null }
            s.setPanelMode('view')
            return id
          })
        }}
        onNodeContextMenu={(event, nodeId) => {
          if (nodeId.startsWith('__unknown_parent__')) return
          const node = nodes.find(n => n.id === nodeId)
          if (!node) return
          s.setSelectedNodeId(null)
          s.setPanelMode('none')
          {
            const a = menuAnchorForNode(nodeId, { x: event.clientX, y: event.clientY })
            s.setContextMenu({ nodeId, x: a.x, y: a.y, personData: asPersonData(node.data) })
          }
        }}
        // Panning/zooming the canvas dismisses the node menu (it's screen-anchored,
        // so it would otherwise float detached over the moved graph).
        onMoveStart={() => s.setContextMenu(null)}
      />

      <GraphHUD
        familyName={familyName}
        memberCount={badgeCount}
        countMode={countMode}
        onCycleCount={cycleCount}
        unreadCount={unreadCount}
        isDark={isDark}
        isMobile={isMobile}
        hudOffset={hudOffset}
        onToggleTheme={() => setIsDark(!isDark)}
        fullView={fullView}
        onToggleFullView={toggleFullView}
        onToggleNotif={() => { s.setHistoryPanelOpen(false); s.setNotifPanelOpen(v => !v) }}
        onToggleHistory={() => { s.setNotifPanelOpen(false); s.setPanelMode('none'); s.setHistoryPanelOpen(v => !v) }}
        onOpen3D={onOpen3D}
        onReplayTour={replayTour}
        onSelectPerson={handleSearchSelect}
        isCommunity={!!communityId}
        isAdmin={isAdmin}
        onOpenAdmin={() => router.push('/admin')}
      />

      {perspectiveId && isExploration && s.pendingMatch && (
        <ExplorationBanner
          mode={s.pendingMatch.mode}
          canonicalPersonName={s.pendingMatch.canonicalPersonName}
          personName={s.pendingMatch.myPersonName}
          isDark={isDark}
          onExit={() => router.push('/graph')}
        />
      )}

      <Navbar
        familyName={familyName}
        timeline={!isExploration
          ? <TreeTimeline perspectiveId={perspectiveId} perspectiveName={perspectiveName} isDark={isDark} />
          : null}
        selectedNodeId={s.selectedNodeId}
        selectedNodeName={selectedNodeName}
        selectedGender={asPersonData(selectedNode?.data)?.gender}
        canDeleteSelected={canDeleteSelected}
        deleteDisabledReason={deleteDisabledReason}
        deleteChildrenNote={deleteCheck?.childrenStayWith ?? null}
        panelMode={s.panelMode}
        canEditSelected={canEditSelected}
        onHome={onHome}
        onStartWizard={action => {
          // A married-in spouse's own parents/siblings (their mayka/sasural) are
          // NOT part of this tree — adding them here would spawn a floating,
          // unviewable node. Send the user into that person's own perspective,
          // where their side renders and father/mother/sibling adds land
          // correctly. Downward (son/daughter) + spouse stay here: shared
          // children belong to this tree.
          const isMarriedIn = asPersonData(selectedNode?.data)?.nodeRole === 'spouse'
          const goesToTheirSide = action === 'father' || action === 'mother'
            || action === 'brother' || action === 'sister'
          if (isMarriedIn && goesToTheirSide && anchorRealId) {
            router.push(`/graph?perspective=${anchorRealId}`)
            return
          }
          // For "Add spouse", if the anchor already has an active spouse, route
          // to the 3-phase SecondSpouseWizard instead.
          if (action === 'spouse' && s.selectedNodeId) {
            const hasActiveSpouse = rawEdges.some(e => {
              const d = e.data as unknown as { relType?: string; isActive?: boolean } | undefined
              return d?.relType === 'SPOUSE_OF'
                && (e.source === s.selectedNodeId || e.target === s.selectedNodeId)
                && d?.isActive !== false
            })
            if (hasActiveSpouse) {
              if (anchorRealId) s.setSecondSpouseAnchor({ id: anchorRealId, name: selectedNodeName })
              return
            }
          }
          s.setWizardAction(action)
        }}
        onDeleteSelected={() => onDeleteNode(s.selectedNodeId!)}
        onEdit={() => s.setPanelMode(m => m === 'edit' ? 'none' : 'edit')}
        onView={() => s.setPanelMode(m => m === 'view' ? 'none' : 'view')}
        isMarriedWoman={isMarriedWoman}
        womanView={womanView}
        onWomanViewChange={onWomanViewChange}
        isDark={isDark}
        forceAddOpen={s.navbarAddTrigger}
        isAdmin={isAdmin}
        onMultiSelect={(isAdmin || canMakeOwnHome) && viewAnchorRawId ? () => onSelectMultiple() : undefined}
        onSelectAll={isAdmin && viewAnchorRawId ? () => onSelectBloodline(viewAnchorRawId) : undefined}
      />

      <GraphOverlays isDark={isDark} {...overlays} />

      {tourActive && canvasReady && (
        <OnboardingTour
          active
          isDark={isDark}
          onStart={selectSelf}
          onFinish={finishTour}
        />
      )}

      {/* Manual multi-select action bar. Sits above the bottom navbar on mobile
          (centered card, not a cramped pill) and top-centre on desktop. Full-width
          within a max on phones so the count + actions never overflow. */}
      {selectionMode && (
        <div style={{
          // Desktop: sit clearly BELOW the centered search bar (top ~16 + hudOffset,
          // ~44px tall) so the two don't overlap/inline. Mobile: above the navbar.
          position: 'fixed', top: isMobile ? 'auto' : `calc(env(safe-area-inset-top) + ${76 + hudOffset}px)`,
          bottom: isMobile ? 'calc(84px + env(safe-area-inset-bottom))' : 'auto',
          left: isMobile ? 12 : '50%', right: isMobile ? 12 : 'auto',
          transform: isMobile ? 'none' : 'translateX(-50%)', zIndex: 1200,
          display: 'flex', alignItems: 'center', gap: 8,
          background: isDark ? '#141210' : '#fff',
          border: `1px solid ${t.borderNeutral}`,
          borderRadius: isMobile ? 16 : 999,
          boxShadow: isDark ? '0 10px 34px rgba(0,0,0,0.6)' : '0 10px 28px rgba(0,0,0,0.18)',
          padding: isMobile ? '10px 10px 10px 14px' : '7px 8px 7px 14px',
          maxWidth: isMobile ? 'none' : 'calc(100vw - 20px)',
        }}>
          <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <span style={{ color: 'var(--c-primary)', fontWeight: 800 }}>{bulkIds.size}</span>{' '}
            {isMobile ? 'selected' : 'selected · tap to add or remove'}
          </span>
          <button
            onClick={exitBulk}
            style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', color: t.textMuted, fontFamily: 'inherit', fontSize: 13, fontWeight: 600, padding: '8px 10px' }}
          >
            Cancel
          </button>
          <button
            onClick={() => { if (bulkIds.size > 0) { setBulkChoice(!isAdmin ? 'home' : (communityId ? 'chooser' : 'edit')); setBulkPanelOpen(true) } }}
            disabled={bulkIds.size === 0}
            style={{
              flexShrink: 0, height: 40, padding: '0 22px', borderRadius: isMobile ? 12 : 999, border: 'none',
              cursor: bulkIds.size === 0 ? 'default' : 'pointer', opacity: bulkIds.size === 0 ? 0.5 : 1,
              background: 'var(--c-primary)', color: '#fff', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 700, whiteSpace: 'nowrap',
            }}
          >
            Done
          </button>
        </div>
      )}

      {/* Selection Done: community → icon chooser (Edit details / Make a home),
          then the chosen panel; non-community → the bulk editor directly. */}
      {bulkScope === 'selection' && bulkPanelOpen && communityId && bulkChoice === 'chooser' ? (
        <SelectionActionChooser
          count={bulkIds.size}
          isDark={isDark}
          onEdit={() => setBulkChoice('edit')}
          onHome={() => setBulkChoice('home')}
          onClose={() => setBulkPanelOpen(false)}
        />
      ) : bulkScope === 'selection' && bulkPanelOpen && communityId && bulkChoice === 'home' ? (
        <CreateHomePanel
          people={bulkPeople}
          defaultHeadId={isAdmin ? eldestHeadId : (selfRawId ? realIdOf(selfRawId) : eldestHeadId)}
          fieldConfig={fieldConfig}
          isDark={isDark}
          applying={bulkApplying}
          error={bulkError}
          onCreate={createHome}
          onEditInstead={isAdmin ? () => { setBulkError(''); setBulkChoice('edit') } : undefined}
          onClose={() => setBulkPanelOpen(false)}
        />
      ) : bulkScope && bulkPanelOpen ? (
        <BulkEditPanel
          scope={bulkScope}
          people={bulkPeople}
          isDark={isDark}
          applying={bulkApplying}
          error={bulkError}
          fieldConfig={fieldConfig}
          onApply={applyBulk}
          onClose={() => (bulkScope === 'bloodline' ? exitBulk() : setBulkPanelOpen(false))}
        />
      ) : null}
    </div>
  )
}
