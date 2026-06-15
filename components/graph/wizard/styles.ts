// Shared inline styles for the AddNodeWizard step bodies.
//
// Recomputed each render in the orchestrator and passed down — keeps the per-step
// components free of theme/loading-state plumbing.

import { COLORS, type Theme } from '@/lib/theme'

export interface WizardStyles {
  btnPrimary: React.CSSProperties
  btnSkip:    React.CSSProperties
  inputStyle: React.CSSProperties
}

export function getWizardStyles(isDark: boolean, t: Theme, saving: boolean, saved: boolean): WizardStyles {
  return {
    btnPrimary: {
      width: '100%', height: '44px', borderRadius: '11px', border: 'none',
      background: saving || saved ? (isDark ? '#1A2A1A' : '#DCFCE7') : COLORS.saffron,
      color: saving || saved ? (isDark ? '#4ADE80' : '#15803D') : '#fff',
      cursor: saving || saved ? 'default' : 'pointer',
      fontSize: '13.5px', fontWeight: 700, fontFamily: 'inherit',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
      transition: 'background 0.2s, color 0.2s',
      boxShadow: saving || saved ? 'none' : '0 2px 10px rgb(var(--c-primary-rgb) / 0.30)',
    },
    btnSkip: {
      background: 'none', border: 'none', cursor: 'pointer',
      fontSize: '12px', color: t.textMuted, fontFamily: 'inherit',
      padding: '8px 0', textAlign: 'center', transition: 'color 0.15s',
    },
    inputStyle: {
      width: '100%', height: '46px', padding: '0 14px',
      fontSize: '15px', fontFamily: 'inherit',
      border: `1.5px solid ${isDark ? 'rgb(var(--c-primary-rgb) / 0.35)' : 'rgb(var(--c-primary-rgb) / 0.28)'}`,
      borderRadius: '11px', outline: 'none',
      background: isDark ? 'rgba(255,255,255,0.05)' : '#fff',
      color: t.text, boxSizing: 'border-box', transition: 'border-color 0.15s, box-shadow 0.15s',
    },
  }
}
