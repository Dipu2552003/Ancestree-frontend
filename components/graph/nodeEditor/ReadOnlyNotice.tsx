'use client'

// ReadOnlyNotice — shown above the form when the viewer cannot edit this
// person's profile (only the person themselves, or someone with explicit
// canEditProfile permission, can edit). Connections section below it stays
// editable regardless — adding/removing edges only modifies the *viewer's*
// side of the graph.

interface ReadOnlyNoticeProps {
  fullName: string | undefined
  isDark:   boolean
}

export default function ReadOnlyNotice({ fullName, isDark }: ReadOnlyNoticeProps) {
  return (
    <div style={{
      margin: '14px 16px 0', padding: '10px 14px', borderRadius: '10px',
      background: isDark ? 'rgba(255,255,255,0.04)' : 'var(--c-page)',
      border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'var(--c-tint)'}`,
    }}>
      <p style={{ margin: 0, fontSize: '12px', color: isDark ? '#7A6A52' : '#9A6C3C', lineHeight: 1.55 }}>
        Only <strong>{fullName?.split(' ')[0] ?? 'this person'}</strong> can edit their profile.
        You can still connect them to family members below.
      </p>
    </div>
  )
}
