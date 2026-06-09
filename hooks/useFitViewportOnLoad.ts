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
import { useReactFlow } from '@xyflow/react'

interface UseFitViewportOnLoadArgs {
  graphLoading:      boolean
  visibleNodesCount: number
  perspectiveId?:    string
}

export function useFitViewportOnLoad({ graphLoading, visibleNodesCount, perspectiveId }: UseFitViewportOnLoadArgs) {
  const { fitView } = useReactFlow()
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
        fitView({ padding: 0.35, duration: 0 })
        setCanvasReady(true)
      })
    })
  }, [graphLoading, visibleNodesCount, fitView])

  return canvasReady
}
