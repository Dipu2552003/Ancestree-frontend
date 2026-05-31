import type { LayoutOption } from './types'
import { layoutEngine } from './layoutEngine'

export type { LayoutId } from './types'

export const LAYOUTS: LayoutOption[] = [
  { id: 'default', label: 'Papa Side', algorithm: (n, e) => layoutEngine(n, e, 'self') },
]

export const LAYOUT_MAP = new Map(LAYOUTS.map(l => [l.id, l]))
