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
    pageBg:        '#FFF7ED',
    cardBg:        '#FFFBF4',
    panelBg:       '#FFFFFF',
    inputBg:       '#FFFBF4',
    sectionBg:     '#F5E8D8',
    photoBg:       '#F0E6D8',
    controlBg:     'white',
    mapBg:         '#FFFBF4',
    border:        '#FDE8CC',
    borderNeutral: 'rgba(0,0,0,0.08)',
    text:          '#1A0A00',
    textMuted:     '#9A6C3C',
    stroke:        '#B5956A',
    controlBorder: '#FDE8CC',
    shadow:        '0 -2px 24px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.10)',
    toggleBg:      '#1A0A00',
    toggleColor:   '#FFF7ED',
    toggleBorder:  'rgba(0,0,0,0.15)',
    itemHoverBg:   'rgba(0,0,0,0.03)',
  }
}
