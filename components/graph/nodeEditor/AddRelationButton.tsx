'use client'

// AddRelationButton — bottom CTA that opens the AddNodeWizard via the parent.
// Auto-commits any in-flight draft edits before opening so the user doesn't
// lose unsaved typing when the wizard takes over the screen.

import { IconPlus } from '@tabler/icons-react'

interface AddRelationButtonProps {
  isDark:  boolean
  onClick: () => void
}

export default function AddRelationButton({ isDark, onClick }: AddRelationButtonProps) {
  return (
    <div style={{ padding: '12px 16px 28px' }}>
      <button
        onClick={onClick}
        style={{
          width: '100%', height: '38px', borderRadius: '8px', border: '1px solid rgb(var(--c-primary-rgb) / 0.30)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          cursor: 'pointer', fontSize: '13px', fontWeight: 500, fontFamily: 'inherit',
          background: isDark ? 'rgb(var(--c-primary-rgb) / 0.12)' : 'rgb(var(--c-primary-rgb) / 0.07)',
          color: 'var(--c-primary)',
          transition: 'background 0.15s, border-color 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = isDark ? 'rgb(var(--c-primary-rgb) / 0.20)' : 'rgb(var(--c-primary-rgb) / 0.12)'; e.currentTarget.style.borderColor = 'rgb(var(--c-primary-rgb) / 0.55)' }}
        onMouseLeave={e => { e.currentTarget.style.background = isDark ? 'rgb(var(--c-primary-rgb) / 0.12)' : 'rgb(var(--c-primary-rgb) / 0.07)'; e.currentTarget.style.borderColor = 'rgb(var(--c-primary-rgb) / 0.30)' }}
      >
        <IconPlus size={15} strokeWidth={2.5} />
        Add relation
      </button>
    </div>
  )
}
