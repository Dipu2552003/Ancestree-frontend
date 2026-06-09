'use client'

// SingleNodePreview — used on steps after 'name' where we only need to show
// the new node taking shape (gender, birthdate, photo, marriage). The anchor
// is no longer relevant on these steps so we collapse the hero down to a
// single card.

import WizardNodeCard from './WizardNodeCard'
import { firstName, labelColor } from './helpers'

interface SingleNodePreviewProps {
  fullName:  string
  gender:    string
  photoUrl?: string
  isDark:    boolean
}

export default function SingleNodePreview({ fullName, gender, photoUrl, isDark }: SingleNodePreviewProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <WizardNodeCard fullName={fullName} gender={gender} photoUrl={photoUrl} isDark={isDark} />
      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: labelColor(gender) }}>
        {fullName.trim() ? firstName(fullName) : 'New node'}
      </span>
    </div>
  )
}
