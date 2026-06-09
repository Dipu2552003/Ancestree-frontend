'use client'

// VacantMotherSlot — dashed-outline placeholder shown in TrioHero when the
// user hasn't picked a mother yet. Drops out once a mother is selected and
// the real polaroid takes its place.

interface VacantMotherSlotProps {
  isDark: boolean
  label:  string
}

export default function VacantMotherSlot({ isDark, label }: VacantMotherSlotProps) {
  const W = 112, PH = 102, SH = 36, H = PH + SH
  return (
    <div style={{
      width: W, height: H, flexShrink: 0,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      background: 'transparent',
      border: `2px dashed ${isDark ? 'rgba(234,88,12,0.40)' : 'rgba(234,88,12,0.35)'}`,
      borderRadius: 4,
      color: isDark ? 'rgba(234,88,12,0.62)' : 'rgba(234,88,12,0.55)',
      textAlign: 'center', padding: '0 6px',
    }}>
      <span style={{ fontSize: 26, fontWeight: 300, lineHeight: 1, marginBottom: 6, opacity: 0.65 }}>?</span>
      <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</span>
    </div>
  )
}
