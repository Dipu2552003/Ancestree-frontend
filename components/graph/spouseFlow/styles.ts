// Inline style fragments shared by all three phase components and the
// orchestrator. Mirrors the AddNodeWizard styles for visual consistency.

import { getTheme, COLORS } from '@/lib/theme'

export function wizardStyles(isDark: boolean, saving: boolean) {
  const t = getTheme(isDark)
  const inputStyle: React.CSSProperties = {
    width: '100%', height: 46, padding: '0 14px',
    fontSize: 15, fontFamily: 'inherit',
    border: `1.5px solid ${isDark ? 'rgba(234,88,12,0.35)' : 'rgba(234,88,12,0.28)'}`,
    borderRadius: 11, outline: 'none',
    background: isDark ? 'rgba(255,255,255,0.05)' : '#fff',
    color: t.text, boxSizing: 'border-box',
  }
  const btnPrimary: React.CSSProperties = {
    width: '100%', height: 44, borderRadius: 11, border: 'none',
    background: saving ? (isDark ? '#3A2A18' : '#FDE8CC') : COLORS.saffron,
    color: saving ? COLORS.saffron : '#fff',
    cursor: saving ? 'default' : 'pointer',
    fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    boxShadow: saving ? 'none' : '0 2px 10px rgba(234,88,12,0.30)',
    transition: 'background 0.2s, color 0.2s',
  }
  const btnGhost: React.CSSProperties = {
    background: 'none', border: 'none', cursor: 'pointer',
    fontSize: 12, color: t.textMuted, fontFamily: 'inherit',
    padding: '8px 0', textAlign: 'center',
  }
  return { inputStyle, btnPrimary, btnGhost }
}
