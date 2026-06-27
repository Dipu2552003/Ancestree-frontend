// Shared types used across the AddNodeWizard sub-components.
//
// These are kept narrow on purpose — the wizard's public surface (what the
// graph page consumes) is re-exported from ../AddNodeWizard.tsx so callers
// don't need to know about this folder.

import type { RelAction } from '../Navbar'
import type { SearchResult } from '@/lib/api'

export type Direction = 'above' | 'below' | 'beside'

export type StepId =
  | 'name' | 'gender' | 'birthdate' | 'photo'
  | 'marriage'    // spouse-only
  | 'relationship' | 'mother' | 'bio-parents' // child / sibling add
  | 'review'      // final step — summary + opt-in duplicate search

export type MarriageStatus =
  | 'married' | 'partner' | 'divorced' | 'widowed' | 'separated' | 'annulled' | 'unknown'

export type AdoptionStatus = 'biological' | 'adopted'

/** Identifies the chosen mother for a new child. Strings are person IDs;
 *  'unknown' means user picked "I don't know"; null means there's only one
 *  spouse so we should auto-fill at the caller. */
export type MotherChoice = string | 'unknown' | null

export interface RelConfig {
  label:         string
  impliedGender: 'male' | 'female' | null
  direction:     Direction
  steps:         StepId[]
}

export interface WizardExtras {
  gender?:          string
  birthYear?:       number
  birthMonth?:      number
  birthDay?:        number
  photoUrl?:        string
  // Spouse-only — collected on the 'marriage' step.
  marriageStatus?:  MarriageStatus
  unionYear?:       number
  separationYear?:  number
  // Son/daughter-only — adoption + mother choice + optional bio parents.
  adoptionStatus?:  AdoptionStatus
  motherChoice?:    MotherChoice
  bioMotherName?:   string
  bioFatherName?:   string
  /** Set by the wizard once the user has passed the review step — suppresses
   *  the auto post-create duplicate modals (recommendations are now handled
   *  inline, opt-in, on the review step). */
  skipDuplicateCheck?: boolean
}

export interface AddNodeWizardProps {
  relAction:  RelAction
  anchorName: string
  /** Anchor's gender — used to infer a new spouse's (opposite) gender and skip
   *  the wizard's 'gender' step. Only 'male'/'female' trigger the inference. */
  anchorGender?: string
  isDark:     boolean
  /**
   * Candidate mothers presented on the 'mother' step.
   *   - For son/daughter: anchor's spouses.
   *   - For brother/sister: anchor's multi-spouse parent's spouses,
   *                         anchor's own mother first.
   * The step shows only when this list has 2+ entries.
   * gender/photoUrl are optional — used by the TrioHero preview.
   */
  motherOptions?: { id: string; name: string; gender?: string; photoUrl?: string }[]
  /** Father name for the TrioHero preview. Defaults to anchorName (correct for
   *  child-add, where the anchor IS the father). Pass explicitly for sibling-add
   *  where the father is the anchor's multi-spouse parent, not the anchor itself. */
  fatherName?: string
  /** Gotra the new person will inherit — shown (read-only) on the review step.
   *  Computed by computeInheritedGotra; empty when the relation doesn't inherit. */
  gotra?: string
  onAdd:           (action: RelAction, fullName: string, extras: WizardExtras) => Promise<void>
  onAddForMerge?:  (action: RelAction, match: SearchResult) => Promise<void>
  /** Open an already-existing person (chosen from the review-step search) in
   *  the current tree instead of creating a duplicate. */
  onViewExisting?: (personId: string) => void
  onClose:         () => void
}
