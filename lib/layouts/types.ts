import type { Node, Edge } from '@xyflow/react'

export type LayoutAlgorithm = (nodes: Node[], edges: Edge[]) => Node[]

export type LayoutId = 'default' | 'maaSide' | 'spouseSide'

export interface LayoutOption {
  id: LayoutId
  label: string
  algorithm: LayoutAlgorithm
}
