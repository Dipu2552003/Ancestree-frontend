/**
 * Application-wide z-index scale.
 *
 * Rules:
 *  - Each layer is strictly above the previous.
 *  - position:fixed elements form their own stacking contexts, so child
 *    z-indexes are relative to the parent's context — not the root document.
 *    Keep popups (Add menu, Delete confirm) inside Navbar's stacking context
 *    by giving Navbar a value above `panel`.
 *  - fullscreen (PersonProfileView) must beat navbar so the profile page
 *    covers the bottom bar completely.
 */
export const Z = {
  canvas:       1,
  controls:     10,
  banners:      40,
  hud:          50,   // family badge, search, bell, dark-mode toggle
  panel:        100,  // NodePanel, MergeComparisonPanel
  navbar:       110,  // bottom pill + its popups (Add menu, Delete confirm)
  fullscreen:   200,  // PersonProfileView — full-screen takeover
  notification: 250,  // NotificationPanel slide-in
  modal:        300,  // DuplicateFoundModal, MergeSearchModal
  confirmModal: 400,  // MergeConflictModal, MergeConfirmModal
  contextMenu:  9999, // always on top
} as const
