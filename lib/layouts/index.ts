import type { LayoutOption } from './types'
import { defaultLayout } from './defaultLayout'

export type { LayoutId } from './types'

export const LAYOUTS: LayoutOption[] = [
  { id: 'default',    label: 'Papa Side',   algorithm: defaultLayout },
  { id: 'maaSide',    label: 'Maa Side',    algorithm: defaultLayout },
  { id: 'spouseSide', label: 'Spouse Side', algorithm: defaultLayout },
]

export const LAYOUT_MAP = new Map(LAYOUTS.map(l => [l.id, l]))
