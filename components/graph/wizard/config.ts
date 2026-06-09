// Static configuration tables for AddNodeWizard.
//
// REL_CONFIG drives both the step list and the implied gender/direction for
// each relationship action. Changing values here changes wizard behaviour —
// it's intentionally the single source of truth.

import type { RelAction } from '../Navbar'
import type { RelConfig } from './types'

export const REL_CONFIG: Record<RelAction, RelConfig> = {
  father:   { label: 'Father',   impliedGender: 'male',   direction: 'above',  steps: ['name', 'birthdate', 'photo'] },
  mother:   { label: 'Mother',   impliedGender: 'female', direction: 'above',  steps: ['name', 'birthdate', 'photo'] },
  son:      { label: 'Son',      impliedGender: 'male',   direction: 'below',  steps: ['name', 'birthdate', 'photo'] },
  daughter: { label: 'Daughter', impliedGender: 'female', direction: 'below',  steps: ['name', 'birthdate', 'photo'] },
  brother:  { label: 'Brother',  impliedGender: 'male',   direction: 'beside', steps: ['name', 'birthdate', 'photo'] },
  sister:   { label: 'Sister',   impliedGender: 'female', direction: 'beside', steps: ['name', 'birthdate', 'photo'] },
  spouse:   { label: 'Spouse',   impliedGender: null,     direction: 'beside', steps: ['name', 'gender', 'birthdate', 'photo', 'marriage'] },
}

// Re-exported from ../AddNodeWizard.tsx so any external consumer that imports
// from there keeps working unchanged.
export const RELATION_LABELS: Record<RelAction, string> = {
  father: 'Father', mother: 'Mother', son: 'Son', daughter: 'Daughter',
  brother: 'Brother', sister: 'Sister', spouse: 'Spouse',
}

export const GENDER_OPTIONS = [
  { value: 'male',   label: 'Male',          symbol: '♂', color: '#4F86C6' },
  { value: 'female', label: 'Female',        symbol: '♀', color: '#C06FAE' },
  { value: 'other',  label: 'Other/Unknown', symbol: '○', color: '#9CA3AF' },
]

export const CURRENT_YEAR = new Date().getFullYear()

export const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]
