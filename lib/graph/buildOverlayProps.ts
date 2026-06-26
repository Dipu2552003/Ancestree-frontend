// Pure mapping from page state + data → GraphOverlays prop bundles.
//
// The overlay prop blocks used to live inline on /graph in one ~120-line tail.
// That made it hard to scan the page's actual shape. The mapping is mechanical
// (each overlay's open-state + onClose wires back to the corresponding state
// flag, plus a handful of action callbacks) so it lifts cleanly into a helper.
//
// Returns the props GraphOverlays consumes, minus `isDark` — that comes from
// the theme store and the page passes it separately.

import type { Node, Edge } from '@xyflow/react'
import { api, type MergeConflict } from '@/lib/api'
import { isGhostNodeId, realIdFromGhost, realEdgeId } from '@/lib/graph/ghostNodes'
import { computeMotherOptions, computeFatherName } from '@/lib/graph/wizardOptions'
import { markDupDismissed } from '@/lib/storage'
import {
  deriveActiveSpousesFromEdges,
  deriveChildrenFromEdges,
} from '@/components/graph/SecondSpouseWizard'
import type {
  ContextMenuOverlay, EditPanelOverlay, ViewPanelOverlay, DuplicateOverlay, SameTreeDupOverlay,
  NotifOverlay, HistoryOverlay, ConflictOverlay, ComparisonOverlay, WizardOverlay,
  SecondSpouseOverlay, MergeSearchOverlay,
} from '@/components/graph/GraphOverlays'
import type { PersonData, SavePayload } from '@/types'
import { canEditPersonProfile } from '@/types'
import type { RelAction } from '@/components/graph/Navbar'
import type { WizardExtras } from '@/components/graph/AddNodeWizard'
import type { SearchResult } from '@/lib/api'
import type { useGraphPageState } from '@/hooks/useGraphPageState'

type State = ReturnType<typeof useGraphPageState>

interface RouterLike {
  push:    (href: string) => void
  replace: (href: string) => void
}

export interface OverlayBundles {
  contextMenu:  ContextMenuOverlay  | null
  editPanel:    EditPanelOverlay    | null
  viewPanel:    ViewPanelOverlay    | null
  duplicate:    DuplicateOverlay    | null
  sameTreeDup:  SameTreeDupOverlay  | null
  notif:        NotifOverlay        | null
  history:      HistoryOverlay      | null
  conflict:     ConflictOverlay     | null
  comparison:   ComparisonOverlay   | null
  wizard:       WizardOverlay       | null
  secondSpouse: SecondSpouseOverlay | null
  mergeSearch:  MergeSearchOverlay  | null
}

interface BuildOverlayPropsArgs {
  s:                  State
  selectedNode:       Node | null
  selectedNodeName:   string
  matchHighlightNode: Node | null
  anchorRealId:       string | null
  nodes:              Node[]
  edges:              Edge[]
  rawNodes:           Node[]
  rawEdges:           Edge[]
  router:             RouterLike
  /** Merge requests may only be started from the user's own tree, never while
   *  viewing another person's tree (perspective mode). */
  canMerge:           boolean
  /** True when viewing via ?perspective= — suppresses the "You" treatment in the
   *  profile view and labels relations against the anchor instead. */
  isPerspective:      boolean
  /** Display name of the perspective anchor (empty on the home tree). */
  perspectiveName:    string
  fetchGraph:         () => Promise<void>
  /** Full reset + refetch — used after undo, which can add/remove whole family units. */
  resetAndFetch:      () => Promise<void>
  onUpdateNode:       (id: string, data: Partial<PersonData>) => void
  onSaveNode:         (id: string, data: SavePayload) => Promise<void>
  onDeleteNode:       (id: string) => Promise<void>
  /** Whether the selected node satisfies the delete rule (not self/claimed, not
   *  a tree-bridging node). Same value the navbar trash button uses. */
  canDeleteSelected:  boolean
  /** Why deletion is blocked, for the panel's disabled state. */
  deleteDisabledReason?: string
  /** Other-parent name when a deleted parent's children stay linked through them. */
  deleteChildrenNote: string | null
  handleWizardAdd:        (action: RelAction, fullName: string, extras: WizardExtras) => Promise<void>
  handleWizardAddForMerge?: (action: RelAction, match: SearchResult) => Promise<void>
  onMergeAccepted:        (conflicts: MergeConflict[]) => void
}

export function buildOverlayProps({
  s, selectedNode, selectedNodeName, matchHighlightNode, anchorRealId,
  nodes, edges, rawNodes, rawEdges,
  router, canMerge, isPerspective, perspectiveName, fetchGraph, resetAndFetch, onUpdateNode, onSaveNode,
  onDeleteNode, canDeleteSelected, deleteDisabledReason, deleteChildrenNote,
  handleWizardAdd, handleWizardAddForMerge, onMergeAccepted,
}: BuildOverlayPropsArgs): OverlayBundles {
  return {
    contextMenu: s.contextMenu && {
      ...s.contextMenu,
      canMerge,
      // Adding relations is a family-membership right (any member, any node —
      // including owned/claimed ones), not a profile-edit right. `canEdit` is
      // true for nodes in the viewer's own family, so this also works while
      // viewing a member's tree in perspective; it's false (hidden) only on a
      // different family's public tree, where you genuinely can't add.
      canAddRelation: s.contextMenu.personData.canEdit ?? false,
      onViewProfile: () => { s.setSelectedNodeId(s.contextMenu!.nodeId); s.setPanelMode('view') },
      onViewTree: () => router.push(`/graph?perspective=${s.contextMenu!.nodeId}`),
      onAddRelation: () => {
        // Select the node and open the navbar Add-relation menu for it.
        s.setSelectedNodeId(s.contextMenu!.nodeId)
        s.setPanelMode('none')
        s.setNavbarAddTrigger(c => c + 1)
      },
      onEdit:     () => { s.setSelectedNodeId(s.contextMenu!.nodeId); s.setPanelMode('edit') },
      onMergeNode: () => {
        if (!canMerge) return  // never start a merge while viewing another tree
        const { nodeId, personData } = s.contextMenu!
        const realNodeId = isGhostNodeId(nodeId) ? realIdFromGhost(nodeId) : nodeId
        s.setMergeSearchNode({ id: realNodeId, name: personData.fullName })
      },
      onClose: () => s.setContextMenu(null),
    },

    editPanel: s.panelMode === 'edit' && selectedNode ? {
      node: selectedNode,
      rawEdges,
      rawNodes,
      onClose:              () => s.setPanelMode('none'),
      onUpdate:             onUpdateNode,
      onSave:               onSaveNode,
      onViewNode:           (id) => { s.setSelectedNodeId(id); s.setPanelMode('view') },
      onRemoveConnection:   async (edgeId) => {
        await api.relationships.delete(realEdgeId(edgeId))
        await fetchGraph()
      },
      onRequestAddRelation: () => {
        // Close the edit panel before opening the navbar Add menu. On mobile the
        // panel (z 111) sits above the navbar popup (z 110), so leaving it open
        // would hide the Add-relation options behind it. selectedNodeId stays
        // set, so the navbar Add button remains enabled.
        s.setPanelMode('none')
        s.setNavbarAddTrigger(c => c + 1)
      },
      // Delete from the panel — gated by the same rule the navbar trash uses.
      canDelete:          canDeleteSelected,
      deleteDisabledReason,
      deleteChildrenNote,
      onDelete:           () => onDeleteNode(selectedNode.id),
    } : null,

    viewPanel: s.panelMode === 'view' && selectedNode ? {
      node:   selectedNode,
      isPerspective,
      perspectiveName,
      onBack: () => s.setPanelMode('none'),
      // Owned (claimed-by-someone-else) nodes are read-only — omit onEdit so the
      // profile view hides its Edit button entirely.
      onEdit: canEditPersonProfile(selectedNode.data as unknown as PersonData)
        ? () => s.setPanelMode('edit')
        : undefined,
      // Add relation is a family-membership right (any member, any node) — keep
      // it available from the read-only profile too, including while viewing a
      // member's tree in perspective (gated by `canEdit`, so still hidden on
      // another family's tree). The node is already selected, so just close the
      // full-screen view and open the navbar Add menu for it.
      onAddRelation: ((selectedNode.data as unknown as PersonData).canEdit ?? false)
        ? () => { s.setPanelMode('none'); s.setNavbarAddTrigger(c => c + 1) }
        : undefined,
    } : null,

    duplicate: s.duplicateInfo ? {
      ...s.duplicateInfo,
      onDismiss: () => {
        markDupDismissed(s.duplicateInfo!.newPersonId)
        s.setDuplicateInfo(null)
      },
    } : null,

    sameTreeDup: s.sameTreeDup ? {
      // The just-added node — look it up for its photo/state so the left card
      // mirrors the canvas. Falls back to the name if not yet in rawNodes.
      newPerson: (() => {
        const d = rawNodes.find(n => n.id === s.sameTreeDup!.newPersonId)?.data as unknown as PersonData | undefined
        return {
          fullName:  s.sameTreeDup!.newPersonName,
          photoUrl:  (d?.photoUrl ?? d?.photoThumbnailUrl) ?? null,
          nodeState: d?.nodeState ?? 'proxy',
        }
      })(),
      matches:       s.sameTreeDup.matches,
      // View the existing node in the current tree.
      onViewNode: (personId: string) => {
        s.setSelectedNodeId(personId)
        s.setPanelMode('view')
        s.setSameTreeDup(null)
      },
      // The existing node is canonical; the just-added node merges into it.
      onSendMerge: async (canonicalPersonId: string) => {
        await api.merges.create({
          new_person_id:       s.sameTreeDup!.newPersonId,
          canonical_person_id: canonicalPersonId,
        })
      },
      onDismiss: () => s.setSameTreeDup(null),
    } : null,

    notif: s.notifPanelOpen ? {
      onClose: () => s.setNotifPanelOpen(false),
      onMergeAccepted,
    } : null,

    history: s.historyPanelOpen ? {
      onClose:  () => s.setHistoryPanelOpen(false),
      onUndone: resetAndFetch,
    } : null,

    conflict: s.mergeConflicts.length > 0 ? {
      conflicts: s.mergeConflicts,
      nodes,
      onClose: () => s.setMergeConflicts([]),
    } : null,

    comparison: s.matchPanelOpen && s.pendingMatch && matchHighlightNode ? {
      pendingMatch:    s.pendingMatch,
      matchNode:       matchHighlightNode,
      nodes,
      edges,
      onClose:         () => s.setMatchPanelOpen(false),
      onNotSamePerson: () => s.setMatchPanelOpen(false),
      onRequestSent:   () => router.push('/graph'),
      onBackToTree:    () => router.push('/graph'),
      onAccepted:      onMergeAccepted,
      onRejected:      () => router.push('/graph'),
    } : null,

    wizard: s.wizardAction ? {
      relAction:      s.wizardAction,
      anchorName:     selectedNodeName,
      anchorGender:   (selectedNode?.data as PersonData | undefined)?.gender,
      motherOptions:  computeMotherOptions(s.wizardAction, anchorRealId, rawEdges, rawNodes),
      fatherName:     computeFatherName(s.wizardAction, anchorRealId, rawEdges, rawNodes),
      onAdd:          handleWizardAdd,
      onAddForMerge:  handleWizardAddForMerge,
      onClose:        () => s.setWizardAction(null),
    } : null,

    secondSpouse: s.secondSpouseAnchor ? {
      anchorId:         s.secondSpouseAnchor.id,
      anchorName:       s.secondSpouseAnchor.name,
      anchorGender:     (rawNodes.find(n => n.id === s.secondSpouseAnchor!.id)?.data as PersonData | undefined)?.gender,
      existingSpouses:  deriveActiveSpousesFromEdges(
        s.secondSpouseAnchor.id,
        rawEdges,
        rawNodes.map(n => ({ id: n.id, data: n.data as { fullName?: string; isAlive?: boolean } })),
      ),
      existingChildren: deriveChildrenFromEdges(
        s.secondSpouseAnchor.id,
        rawEdges,
        rawNodes.map(n => ({ id: n.id, data: n.data as { fullName?: string; photoUrl?: string | null } })),
      ),
      onComplete: async () => { s.setSecondSpouseAnchor(null); await fetchGraph() },
      onClose:    () => s.setSecondSpouseAnchor(null),
    } : null,

    mergeSearch: s.mergeSearchNode ? {
      sourceNodeId:   s.mergeSearchNode.id,
      sourceNodeName: s.mergeSearchNode.name,
      onClose:        () => s.setMergeSearchNode(null),
    } : null,
  }
}
