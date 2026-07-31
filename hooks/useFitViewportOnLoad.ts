'use client'

// Imperatively fits the React Flow viewport once after the first graph load,
// then exposes a `canvasReady` flag so the page can keep the canvas at
// opacity 0 until layout has settled (otherwise nodes pop into view in the
// wrong place).
//
// Two rAF passes are required: the first lets nodes render, the second lets
// ResizeObserver fire + layout settle. fitDone is reset whenever the active
// perspective changes so the new tree gets its own fit.

import { useEffect, useRef, useState } from 'react'
import { useReactFlow, type Node } from '@xyflow/react'

interface UseFitViewportOnLoadArgs {
  graphLoading:      boolean
  visibleNodesCount: number
  perspectiveId?:    string
}

export function useFitViewportOnLoad({ graphLoading, visibleNodesCount, perspectiveId }: UseFitViewportOnLoadArgs) {
  const { fitView, getNodes, setCenter } = useReactFlow()
  const [canvasReady, setCanvasReady] = useState(false)
  const fitDone = useRef(false)

  // Reset viewport state when switching perspective so the new tree is fitted.
  useEffect(() => {
    fitDone.current = false
    setCanvasReady(false)
  }, [perspectiveId])

  useEffect(() => {
    if (graphLoading || visibleNodesCount === 0 || fitDone.current) return
    fitDone.current = true
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        // On the home tree, land centred on the viewer's own node at zoom 1 —
        // the same view the Home button gives — instead of a broad whole-tree
        // fit. Perspective views (someone else's tree) keep the fit-to-view so
        // the whole tree they navigated to is visible. Falls back to fitView if
        // no self node is present.
        const self = perspectiveId ? undefined : findSelfNode(getNodes())
        if (self) {
          const w = self.measured?.width  ?? (self.width  as number | undefined) ?? 128
          const h = self.measured?.height ?? (self.height as number | undefined) ?? 140
          setCenter(self.position.x + w / 2, self.position.y + h / 2, { zoom: 1, duration: 0 })
        } else {
          fitView({ padding: 0.35, duration: 0 })
        }
        setCanvasReady(true)
      })
    })
  }, [graphLoading, visibleNodesCount, perspectiveId, fitView, getNodes, setCenter])

  return canvasReady
}

// The viewer's own node — a person node flagged isSelf, or a collapsed couple
// node whose either half is the viewer.
function findSelfNode(nodes: Node[]): Node | undefined {
  return nodes.find((n) => {
    const d = n.data as { isSelf?: boolean; person1?: { isSelf?: boolean }; person2?: { isSelf?: boolean } }
    return !!(d?.isSelf || d?.person1?.isSelf || d?.person2?.isSelf)
  })
}
