import type { Config } from 'tailwindcss'

const config: Config = {
  theme: {
    extend: {
      colors: {
        // All map to the CSS tokens in app/globals.css (single source of truth).
        // Semantic names are preferred for new code; the original hue names are
        // kept as aliases so existing Tailwind classes keep working.
        primary:   'var(--c-primary)',
        secondary: 'var(--c-secondary)',
        tint:      'var(--c-tint)',
        page:      'var(--c-page)',
        // legacy aliases
        saffron:    'var(--c-primary)',
        marigold:   'var(--c-secondary)',
        terracotta: 'var(--c-primary-strong)',
        cream:      'var(--c-page)',
        goldLight:  'var(--c-tint)',
      },
    },
  },
}

export default config
