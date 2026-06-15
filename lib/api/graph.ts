import { req, ANCESTOR_DEPTH_DEFAULT, DESCENDANT_DEPTH_DEFAULT } from './client'

export const graph = {
  fetch: (
    perspectiveId?: string,
    ancestorDepth:   number = ANCESTOR_DEPTH_DEFAULT,
    descendantDepth: number = DESCENDANT_DEPTH_DEFAULT,
  ) => {
    const qs = new URLSearchParams()
    if (perspectiveId) qs.set('perspective', perspectiveId)
    qs.set('ancestorDepth',   String(ancestorDepth))
    qs.set('descendantDepth', String(descendantDepth))
    return req<{
      nodes: import('@xyflow/react').Node[]
      edges: import('@xyflow/react').Edge[]
      meta: {
        totalNodes:               number
        perspectivePersonId?:     string
        effectiveAncestorDepth:   number
        effectiveDescendantDepth: number
        hasMoreAncestors:         boolean
        hasMoreDescendants:       boolean
      }
    }>(`/api/graph?${qs.toString()}`)
  },

  // Public, unauthenticated — read-only graph for the landing-page viewer.
  // Only works for persons in a PUBLIC, non-community family (else 404).
  fetchPublic: (perspectiveId: string) =>
    req<{
      nodes: import('@xyflow/react').Node[]
      edges: import('@xyflow/react').Edge[]
      meta: {
        totalNodes:               number
        perspectivePersonId?:     string
        effectiveAncestorDepth:   number
        effectiveDescendantDepth: number
        hasMoreAncestors:         boolean
        hasMoreDescendants:       boolean
      }
    }>(`/api/graph/public?perspective=${encodeURIComponent(perspectiveId)}`),
}
