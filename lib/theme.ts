/** Fixed design tokens — independent of dark/light mode */
export const COLORS = {
  /** Primary accent — self node, CTAs, active states, focus rings */
  saffron:     'var(--c-primary)',
  /** Darker variant — claimed nodes, pressed states */
  terracotta:  'var(--c-primary-strong)',
  /** Secondary warm accent — proxy nodes, amber states */
  marigold:    'var(--c-secondary)',
  /** Lightest accent tint — subtle borders and backgrounds */
  goldLight:   'var(--c-tint)',
  /** Page background in light mode */
  cream:       '#f8f8f6',
  /** Destructive / error */
  error:       '#EF4444',
  /** Success / invite / claimed badge */
  success:     '#16A34A',
  /** Deceased node avatar */
  slate:       '#94A3B8',
} as const

export type ColorToken = keyof typeof COLORS

export interface Theme {
  pageBg: string
  cardBg: string
  panelBg: string
  inputBg: string
  sectionBg: string
  photoBg: string
  controlBg: string
  mapBg: string
  border: string
  borderNeutral: string
  text: string
  textMuted: string
  stroke: string
  controlBorder: string
  shadow: string
  toggleBg: string
  toggleColor: string
  toggleBorder: string
  itemHoverBg: string
}

export function getTheme(isDark: boolean): Theme {
  return isDark ? {
    pageBg:        '#0B0A09',
    cardBg:        '#1C1A12',
    panelBg:       '#18160F',
    inputBg:       '#141210',
    sectionBg:     '#3A2A18',
    photoBg:       '#252018',
    controlBg:     '#1C1A18',
    mapBg:         '#141210',
    border:        'rgba(255,255,255,0.08)',
    borderNeutral: 'rgba(255,255,255,0.08)',
    text:          '#EDE8E3',
    textMuted:     '#7A6A52',
    stroke:        '#6B5F54',
    controlBorder: 'rgba(255,255,255,0.08)',
    shadow:        '0 -2px 24px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.4)',
    toggleBg:      '#2A2520',
    toggleColor:   '#EDE8E3',
    toggleBorder:  'rgba(255,255,255,0.10)',
    itemHoverBg:   'rgba(255,255,255,0.05)',
  } : {
    // Light theme — warm-neutral palette, sourced from the tokens in globals.css.
    pageBg:        'var(--c-page)',      // Vanilla
    cardBg:        'var(--c-surface)',   // white card
    panelBg:       'var(--c-surface)',
    inputBg:       '#FBF9F4',            // faintly warm white for inputs
    sectionBg:     'var(--c-tint)',      // Soft Dune
    photoBg:       'var(--c-tint)',
    controlBg:     'var(--c-surface)',
    mapBg:         'var(--c-surface)',
    border:        'var(--c-tint)',      // Soft Dune hairline
    borderNeutral: 'rgba(37,37,37,0.10)',
    text:          'var(--c-text)',      // near-black
    textMuted:     'var(--c-text-muted)',
    stroke:        'var(--c-stroke)',    // Classic Taupe — graph edges
    controlBorder: 'var(--c-tint)',
    shadow:        '0 -2px 24px rgba(37,37,37,0.06), 0 4px 16px rgba(37,37,37,0.10)',
    toggleBg:      'var(--c-primary)',   // Umber dark/light switch
    toggleColor:   'var(--c-page)',
    toggleBorder:  'rgba(37,37,37,0.15)',
    itemHoverBg:   'rgba(37,37,37,0.04)',
  }
}
