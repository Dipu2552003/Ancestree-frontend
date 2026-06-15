// Shared types for the SecondSpouseWizard sub-folder.

export type Phase      = 'resolve' | 'add' | 'reparent'
export type ExitStatus = 'widowed' | 'divorced' | 'separated' | 'unknown'
/** Which marriage(s) are currently active:
 *  'existing' → only the first stays active (new spouse is the ex)
 *  'new'      → only the new one is active (first becomes the ex)
 *  'both'     → both remain active (more than one current spouse) */
export type ActiveChoice = 'existing' | 'new' | 'both'

export interface ExistingSpouse {
  relationshipId: string
  personId:       string
  fullName:       string
  isAlive:        boolean
  subType:        string | null
}

export interface ExistingChild {
  personId:           string
  fullName:           string
  photoUrl?:          string | null
  currentMotherId:    string | null
  currentMotherName:  string | null
}

export interface ExitOption {
  value:   ExitStatus
  label:   (name: string) => string
  /** Year-input prompt label, or null if no year applies. */
  askYear: string | null
}

// Options shown on Phase 1 for "what happened with the inactive spouse?".
// Ordering is deliberate — "widowed" first because it's the most common
// reason a Khandelwal would have a second marriage.
export const EXIT_OPTIONS: ExitOption[] = [
  { value: 'widowed',   label: name => `${name} has passed away`,            askYear: 'Year of passing' },
  { value: 'divorced',  label: ()   => 'They were divorced',                 askYear: 'Year of divorce' },
  { value: 'separated', label: ()   => 'They are separated',                 askYear: null },
  { value: 'unknown',   label: ()   => "I don't know — record this and ask later", askYear: null },
]
