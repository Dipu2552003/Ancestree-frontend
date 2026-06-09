'use client'

// Hero preview area beneath the AddNodeWizard header — swaps between three
// layouts depending on the active step:
//
//   • 'name'    → NodeHero          (anchor + new node side-by-side)
//   • 'mother'  → TrioHero          (father + mother + new child)
//   • anything  → SingleNodePreview (one polaroid of just the new person)

import { motion, AnimatePresence } from 'framer-motion'
import { NodeHero, SingleNodePreview, TrioHero } from './'
import type { StepId } from './types'
import type { RelAction } from '../Navbar'

interface MotherOption {
  id: string
  name: string
  gender?: string
  photoUrl?: string
}

interface WizardHeroProps {
  isDark:        boolean
  currentStep:   StepId
  relAction:     RelAction
  direction:     'above' | 'below' | 'beside'
  anchorName:    string
  fullName:      string
  gender:        string
  photoUrl?:     string
  motherChoice:  string | 'unknown' | null
  motherOptions?: MotherOption[]
  fatherName?:   string
}

export default function WizardHero({
  isDark, currentStep, relAction, direction,
  anchorName, fullName, gender, photoUrl,
  motherChoice, motherOptions, fatherName,
}: WizardHeroProps) {
  const selectedMother = motherChoice && motherChoice !== 'unknown'
    ? motherOptions?.find(o => o.id === motherChoice) ?? null
    : null
  const triadFatherName = fatherName ?? anchorName
  const triadHeroHeight =
    currentStep === 'name'   ? undefined :
    currentStep === 'mother' ? 260 :
                               100

  return (
    <div style={{
      padding: currentStep === 'name' ? '24px 28px 20px' : '18px 28px 14px',
      borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(234,88,12,0.09)'}`,
      background: isDark ? 'rgba(255,255,255,0.015)' : 'rgba(234,88,12,0.025)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: triadHeroHeight,
    }}>
      <AnimatePresence mode="wait">
        {currentStep === 'name' ? (
          <motion.div key="two-node"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}>
            <NodeHero
              anchorName={anchorName} newName={fullName} gender={gender}
              direction={direction} relAction={relAction} isDark={isDark}
            />
          </motion.div>
        ) : currentStep === 'mother' ? (
          <motion.div key="trio-node"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}>
            <TrioHero
              fatherName={triadFatherName}
              motherName={selectedMother?.name ?? null}
              motherGender={selectedMother?.gender}
              motherPhotoUrl={selectedMother?.photoUrl}
              newName={fullName}
              newGender={gender}
              newPhotoUrl={photoUrl}
              vacantLabel="Mother"
              isDark={isDark}
            />
          </motion.div>
        ) : (
          <motion.div key="one-node"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}>
            <SingleNodePreview
              fullName={fullName} gender={gender}
              photoUrl={currentStep === 'photo' ? photoUrl : undefined}
              isDark={isDark}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
