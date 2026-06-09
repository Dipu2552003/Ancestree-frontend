'use client'

// GraphOverlays — every overlay/modal/panel that the graph page mounts above
// the canvas. Lives outside the page file so the page itself stays focused on
// data + state.
//
// The overlays render order matters — later siblings sit on top of earlier
// ones (in z-index *and* in AnimatePresence enter/exit order). Order here
// mirrors the original page layout.
//
// Each overlay is gated by its prop bundle being non-null. The parent
// constructs those bundles inline at the call site, which keeps the visible
// state machine in the page where it belongs.

import { AnimatePresence } from 'framer-motion'
import type { Node, Edge } from '@xyflow/react'
import NodeContextMenu from './NodeContextMenu'
import NodePanel from './NodePanel'
import PersonProfileView from './PersonProfileView'
import DuplicateFoundModal from './DuplicateFoundModal'
import NotificationPanel from './NotificationPanel'
import MergeConflictModal from './merge/MergeConflictModal'
import MergeComparisonPanel from './merge/MergeComparisonPanel'
import MergeSearchModal from './merge/MergeSearchModal'
import AddNodeWizard from './AddNodeWizard'
import SecondSpouseWizard from './SecondSpouseWizard'
import type { WizardExtras } from './AddNodeWizard'
import type { ExistingSpouse, ExistingChild } from './SecondSpouseWizard'
import type { PersonData, PendingMatchData, MyPersonInfo, SavePayload } from '@/types'
import type { PotentialMatch, MergeConflict } from '@/lib/api'
import type { RelAction } from './Navbar'

// ── Prop bundles ─────────────────────────────────────────────────────────────
// Each is the minimum data the corresponding overlay needs.

export interface ContextMenuOverlay {
  nodeId:        string
  x:             number
  y:             number
  personData:    PersonData
  onViewTree:    () => void
  onEdit:        () => void
  onInvite:      () => Promise<void>
  onMergeNode:   () => void
  onClose:       () => void
}

export interface EditPanelOverlay {
  node:                 Node
  rawEdges?:            Edge[]
  rawNodes?:            Node[]
  onClose:              () => void
  onUpdate:             (id: string, data: Partial<PersonData>) => void
  onSave:               (id: string, data: SavePayload) => Promise<void>
  onViewNode:           (id: string) => void
  onRemoveConnection:   (edgeId: string) => Promise<void>
  onRequestAddRelation: () => void
}

export interface ViewPanelOverlay {
  node:   Node
  onBack: () => void
  onEdit: () => void
}

export interface DuplicateOverlay {
  newPersonId: string
  myInfo:      MyPersonInfo
  matches:     PotentialMatch[]
  onDismiss:   () => void
}

export interface NotifOverlay {
  onClose:         () => void
  onMergeAccepted: (conflicts: MergeConflict[]) => void
}

export interface ConflictOverlay {
  conflicts: MergeConflict[]
  nodes:     Node[]
  onClose:   () => void
}

export interface ComparisonOverlay {
  pendingMatch:  PendingMatchData
  matchNode:     Node
  nodes:         Node[]
  edges:         Edge[]
  onClose:       () => void
  onNotSamePerson: () => void
  onRequestSent: () => void
  onBackToTree:  () => void
  onAccepted:    (conflicts: MergeConflict[]) => void
  onRejected:    () => void
}

export interface WizardOverlay {
  relAction:     RelAction
  anchorName:    string
  motherOptions: { id: string; name: string; gender?: string; photoUrl?: string }[]
  fatherName:    string | undefined
  onAdd:         (action: RelAction, fullName: string, extras: WizardExtras) => Promise<void>
  onClose:       () => void
}

export interface SecondSpouseOverlay {
  anchorId:         string
  anchorName:       string
  existingSpouses:  ExistingSpouse[]
  existingChildren: ExistingChild[]
  onComplete:       () => Promise<void> | void
  onClose:          () => void
}

export interface MergeSearchOverlay {
  sourceNodeId:   string
  sourceNodeName: string
  onClose:        () => void
}

interface GraphOverlaysProps {
  isDark:         boolean
  contextMenu:    ContextMenuOverlay    | null
  editPanel:      EditPanelOverlay      | null
  viewPanel:      ViewPanelOverlay      | null
  duplicate:      DuplicateOverlay      | null
  notif:          NotifOverlay          | null
  conflict:       ConflictOverlay       | null
  comparison:     ComparisonOverlay     | null
  wizard:         WizardOverlay         | null
  secondSpouse:   SecondSpouseOverlay   | null
  mergeSearch:    MergeSearchOverlay    | null
}

export default function GraphOverlays({
  isDark, contextMenu, editPanel, viewPanel, duplicate, notif,
  conflict, comparison, wizard, secondSpouse, mergeSearch,
}: GraphOverlaysProps) {
  return (
    <>
      {/* Context menu — right-click / long-press on a node */}
      {contextMenu && (
        <NodeContextMenu
          nodeId={contextMenu.nodeId}
          x={contextMenu.x}
          y={contextMenu.y}
          personName={contextMenu.personData.fullName}
          gender={contextMenu.personData.gender}
          canEdit={contextMenu.personData.canEdit ?? false}
          canInvite={contextMenu.personData.canInvite ?? false}
          isSelf={contextMenu.personData.isSelf}
          isViewerNode={contextMenu.personData.isViewerNode ?? false}
          onViewTree={contextMenu.onViewTree}
          onEdit={contextMenu.onEdit}
          onInvite={contextMenu.onInvite}
          onMergeNode={contextMenu.onMergeNode}
          onClose={contextMenu.onClose}
        />
      )}

      {/* Slide-in edit panel */}
      <AnimatePresence>
        {editPanel && (
          <NodePanel
            key={editPanel.node.id}
            node={editPanel.node}
            onClose={editPanel.onClose}
            onUpdate={editPanel.onUpdate}
            onSave={editPanel.onSave}
            rawEdges={editPanel.rawEdges}
            rawNodes={editPanel.rawNodes}
            onViewNode={editPanel.onViewNode}
            onRemoveConnection={editPanel.onRemoveConnection}
            onRequestAddRelation={editPanel.onRequestAddRelation}
          />
        )}
      </AnimatePresence>

      {/* Slide-in profile view (read-only) */}
      <AnimatePresence>
        {viewPanel && (
          <PersonProfileView
            key={viewPanel.node.id}
            node={viewPanel.node}
            onBack={viewPanel.onBack}
            onEdit={viewPanel.onEdit}
          />
        )}
      </AnimatePresence>

      {/* Duplicate-found modal — shown once after a node is created with
          matches. Dismissals are persisted, so it never re-pops for the
          same person. */}
      {duplicate && (
        <DuplicateFoundModal
          newPersonId={duplicate.newPersonId}
          myInfo={duplicate.myInfo}
          matches={duplicate.matches}
          isDark={isDark}
          onDismiss={duplicate.onDismiss}
        />
      )}

      {/* Notification panel — slides in from right */}
      <AnimatePresence>
        {notif && (
          <NotificationPanel
            key="notif-panel"
            isDark={isDark}
            onClose={notif.onClose}
            onMergeAccepted={notif.onMergeAccepted}
          />
        )}
      </AnimatePresence>

      {/* Merge conflict modal — blocks until dismissed so user can't miss it */}
      {conflict && (
        <MergeConflictModal
          conflicts={conflict.conflicts}
          nodes={conflict.nodes}
          isDark={isDark}
          onClose={conflict.onClose}
        />
      )}

      {/* Merge comparison panel — opened by clicking the highlighted match
          node in exploration mode */}
      <AnimatePresence>
        {comparison && (
          <MergeComparisonPanel
            key="merge-panel"
            pendingMatch={comparison.pendingMatch}
            matchNode={comparison.matchNode}
            nodes={comparison.nodes}
            edges={comparison.edges}
            isDark={isDark}
            onClose={comparison.onClose}
            onNotSamePerson={comparison.onNotSamePerson}
            onRequestSent={comparison.onRequestSent}
            onBackToTree={comparison.onBackToTree}
            onAccepted={comparison.onAccepted}
            onRejected={comparison.onRejected}
          />
        )}
      </AnimatePresence>

      {/* Add node wizard */}
      <AnimatePresence>
        {wizard && (
          <AddNodeWizard
            key="add-node-wizard"
            relAction={wizard.relAction}
            anchorName={wizard.anchorName}
            isDark={isDark}
            motherOptions={wizard.motherOptions}
            fatherName={wizard.fatherName}
            onAdd={wizard.onAdd}
            onClose={wizard.onClose}
          />
        )}
      </AnimatePresence>

      {/* Second-spouse wizard — opened when "Add spouse" hits a node that
          already has an active SPOUSE_OF. Three phases: resolve current
          marriage, add new spouse, re-mother existing children. */}
      <AnimatePresence>
        {secondSpouse && (
          <SecondSpouseWizard
            key="second-spouse-wizard"
            anchorId={secondSpouse.anchorId}
            anchorName={secondSpouse.anchorName}
            existingSpouses={secondSpouse.existingSpouses}
            existingChildren={secondSpouse.existingChildren}
            isDark={isDark}
            onComplete={secondSpouse.onComplete}
            onClose={secondSpouse.onClose}
          />
        )}
      </AnimatePresence>

      {/* Merge search modal — opened from context menu "Merge node" */}
      <AnimatePresence>
        {mergeSearch && (
          <MergeSearchModal
            key="merge-search"
            sourceNodeId={mergeSearch.sourceNodeId}
            sourceNodeName={mergeSearch.sourceNodeName}
            onClose={mergeSearch.onClose}
          />
        )}
      </AnimatePresence>
    </>
  )
}
