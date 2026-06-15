'use client'

// NodeHero — pairs the anchor card and the new-node card with a connector
// between them, oriented per relation direction (above / below / beside).
// Used on the 'name' step so the user sees the relationship taking shape
// as they type the name in.

import type { RelAction } from '../Navbar'
import AnchorNodeCard from './AnchorNodeCard'
import WizardNodeCard from './WizardNodeCard'
import NodeConnector from './NodeConnector'
import { firstName, labelColor } from './helpers'
import type { Direction } from './types'

interface NodeHeroProps {
  anchorName: string
  newName:    string
  gender:     string
  direction:  Direction
  relAction:  RelAction
  isDark:     boolean
}

export default function NodeHero({
  anchorName, newName, gender, direction, relAction, isDark,
}: NodeHeroProps) {
  const compact = direction !== 'beside'

  const anchorCard = (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <AnchorNodeCard fullName={anchorName} isDark={isDark} compact={compact} />
      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--c-primary)' }}>
        {firstName(anchorName) || 'You'}
      </span>
    </div>
  )

  const newCard = (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <WizardNodeCard fullName={newName} gender={gender} isDark={isDark} compact={compact} />
      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: labelColor(gender) }}>
        {newName.trim() ? firstName(newName) : 'New node'}
      </span>
    </div>
  )

  const connector = <NodeConnector direction={direction} relAction={relAction} isDark={isDark} />

  if (direction === 'above') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {newCard}{connector}{anchorCard}
      </div>
    )
  }
  if (direction === 'below') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {anchorCard}{connector}{newCard}
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      {anchorCard}{connector}{newCard}
    </div>
  )
}
