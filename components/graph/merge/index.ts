// Merge feature module.
//
// All UI surfaces for the merge flow live here:
//   • MergeSearchModal     — pick a target from canonical search results
//   • MergeConfirmModal    — confirm before firing the create request
//   • MergeSourceBanner    — sticky banner shown on /merge while picking
//   • MergeAcceptPreviewModal — recipient previews the simulated merged tree
//                               before accepting an incoming request
//   • MergeConflictModal   — post-accept conflict resolution (overlapping
//                               relations, status mismatches, etc.)
//   • MergeComparisonPanel — side-by-side compare in exploration mode
//
// Sub-components are *not* re-exported here — only the top-level surfaces
// each consumer imports. Internal imports use relative paths within ./merge.

export { default as MergeSearchModal }       from './MergeSearchModal'
export { default as MergeConfirmModal }      from './MergeConfirmModal'
export { default as MergeSourceBanner }      from './MergeSourceBanner'
export { default as MergeAcceptPreviewModal } from './MergeAcceptPreviewModal'
export { default as MergeConflictModal }     from './MergeConflictModal'
export { default as MergeComparisonPanel }   from './MergeComparisonPanel'
