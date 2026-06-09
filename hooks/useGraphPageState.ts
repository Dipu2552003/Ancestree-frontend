'use client'

// Page-level overlay state for /graph. Bundles the dozen-plus useState calls
// that drive panels, modals, wizards, and the merge-comparison flow into a
// single hook so the page itself stays focused on data fetching + render.
//
// Every entry maps 1:1 to a previous inline useState — no behaviour change.

import { useState } from 'react'
import type { PotentialMatch, MergeConflict } from '@/lib/api'
import type { PersonData, MyPersonInfo, PendingMatchData } from '@/types'
import type { RelAction } from '@/components/graph/Navbar'

export type PanelMode = 'none' | 'edit' | 'view'

export interface ContextMenuState {
  nodeId:     string
  x:          number
  y:          number
  personData: PersonData
}

export interface DuplicateInfoState {
  newPersonId: string
  matches:     PotentialMatch[]
  myInfo:      MyPersonInfo
}

export interface NamedAnchor {
  id:   string
  name: string
}

export function useGraphPageState() {
  // Person panel — which node is selected, and whether to show its edit or view variant.
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [panelMode,      setPanelMode]      = useState<PanelMode>('none')

  // Navbar uses this counter to know when to auto-open the add-relation menu
  // (incrementing it is the trigger).
  const [navbarAddTrigger, setNavbarAddTrigger] = useState(0)

  // AddNodeWizard — which relation we're adding, if any.
  const [wizardAction, setWizardAction] = useState<RelAction | null>(null)

  // Right-click / long-press context menu on a node.
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)

  // Duplicate-found modal shown after creating a person that matches existing ones.
  const [duplicateInfo, setDuplicateInfo] = useState<DuplicateInfoState | null>(null)

  // Notification panel + the conflict modal that opens after merge acceptance.
  const [notifPanelOpen, setNotifPanelOpen] = useState(false)
  const [mergeConflicts, setMergeConflicts] = useState<MergeConflict[]>([])

  // Exploration / merge review — the pending match payload + whether the
  // comparison panel is open.
  const [pendingMatch,   setPendingMatch]   = useState<PendingMatchData | null>(null)
  const [matchPanelOpen, setMatchPanelOpen] = useState(false)

  // Merge-search modal (opened from the context menu's "Merge with…").
  const [mergeSearchNode, setMergeSearchNode] = useState<NamedAnchor | null>(null)

  // Second-spouse wizard anchor (replaces the regular spouse wizard when the
  // anchor already has an active spouse).
  const [secondSpouseAnchor, setSecondSpouseAnchor] = useState<NamedAnchor | null>(null)

  return {
    selectedNodeId,    setSelectedNodeId,
    panelMode,         setPanelMode,
    navbarAddTrigger,  setNavbarAddTrigger,
    wizardAction,      setWizardAction,
    contextMenu,       setContextMenu,
    duplicateInfo,     setDuplicateInfo,
    notifPanelOpen,    setNotifPanelOpen,
    mergeConflicts,    setMergeConflicts,
    pendingMatch,      setPendingMatch,
    matchPanelOpen,    setMatchPanelOpen,
    mergeSearchNode,   setMergeSearchNode,
    secondSpouseAnchor, setSecondSpouseAnchor,
  }
}
