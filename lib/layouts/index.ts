import type { LayoutOption } from './types'
import { defaultLayout }  from './defaultLayout'
import { timelineLayout } from './timelineLayout'
import { fullViewLayout } from './fullViewLayout'

export type { LayoutId } from './types'

export const LAYOUTS: LayoutOption[] = [
  { id: 'default',  label: 'Default',   algorithm: defaultLayout  },
  { id: 'timeline', label: 'Timeline',  algorithm: timelineLayout },
  { id: 'fullView', label: 'Full View', algorithm: fullViewLayout },
]

export const LAYOUT_MAP = new Map(LAYOUTS.map(l => [l.id, l]))
