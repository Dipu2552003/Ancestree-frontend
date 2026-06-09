// NodePanel-local helpers.

export const GENDERS = [
  { value: 'male',    label: 'Male' },
  { value: 'female',  label: 'Female' },
  { value: 'other',   label: 'Other' },
  { value: 'unknown', label: 'Unknown' },
]

// Trim helper used by the draft → payload mapping.
export const str = (v: string) => v.trim() || null
