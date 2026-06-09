'use client'

// TrioHero — three-card family preview shown on the 'mother' step:
//
//   [Mother (or vacant slot)] ── ♥ ── [Father]
//                       │
//                       ▼
//                     [Child]
//
// The mother card animates in once selected. Used both for adding a child
// (where the father IS the anchor) and for adding a sibling (where the
// father is the anchor's multi-spouse parent — passed in explicitly).

import { AnimatePresence, motion } from 'framer-motion'
import AnchorNodeCard from './AnchorNodeCard'
import WizardNodeCard from './WizardNodeCard'
import VacantMotherSlot from './VacantMotherSlot'
import SmallCoupleLink from './SmallCoupleLink'
import SmallChildLink from './SmallChildLink'
import { firstName, labelColor } from './helpers'

interface TrioHeroProps {
  fatherName:     string
  motherName:     string | null      // null = vacant slot
  motherGender?:  string
  motherPhotoUrl?: string
  newName:        string
  newGender:      string
  newPhotoUrl?:   string
  vacantLabel:    string
  isDark:         boolean
}

export default function TrioHero({
  fatherName, motherName, motherGender, motherPhotoUrl,
  newName, newGender, newPhotoUrl, vacantLabel, isDark,
}: TrioHeroProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* Couple row */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <AnimatePresence mode="wait">
            {motherName ? (
              <motion.div key={`mom-${motherName}`}
                initial={{ opacity: 0, scale: 0.86, y: 4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.86, y: -4 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}>
                <WizardNodeCard fullName={motherName} gender={motherGender ?? 'female'} photoUrl={motherPhotoUrl} isDark={isDark} compact />
              </motion.div>
            ) : (
              <motion.div key="mom-vacant"
                initial={{ opacity: 0, scale: 0.86 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.86 }}
                transition={{ duration: 0.18 }}>
                <VacantMotherSlot isDark={isDark} label={vacantLabel} />
              </motion.div>
            )}
          </AnimatePresence>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
            color: motherName ? labelColor(motherGender ?? 'female') : (isDark ? 'rgba(234,88,12,0.55)' : 'rgba(234,88,12,0.50)') }}>
            {motherName ? firstName(motherName) : vacantLabel}
          </span>
        </div>

        <SmallCoupleLink isDark={isDark} />

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <AnchorNodeCard fullName={fatherName} isDark={isDark} compact />
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#EA580C' }}>
            {firstName(fatherName) || 'Father'}
          </span>
        </div>
      </div>

      <SmallChildLink isDark={isDark} />

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <WizardNodeCard fullName={newName} gender={newGender} photoUrl={newPhotoUrl} isDark={isDark} compact />
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: labelColor(newGender) }}>
          {newName.trim() ? firstName(newName) : 'New node'}
        </span>
      </div>
    </div>
  )
}
