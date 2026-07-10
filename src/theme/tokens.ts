// Design tokens — single source of truth mirrored from docs/design-tokens-p11a.md.
// Semantic roles only (colors.gold.primary), never raw hexes in screens.

// Colors are keyed by scheme so a light scheme can be added later without
// touching consumers. Dark is the only scheme for now (P11a is dark-only).
export const colorSchemes = {
  dark: {
    bg: {
      deep: '#0b0b0d',
      base: '#16161a',
      surface: '#1e1e23',
      elevated: '#26262c',
      goldTint: '#241b07',
    },
    text: {
      primary: '#f3f1ec',
      bright: '#d8d8de',
      secondary: '#9a9aa2',
      muted: '#7e7e86',
    },
    gold: {
      primary: '#f0cd68',
      bright: '#f4d67a',
      mid: '#eac259',
      deep: '#b08d2e',
      border: '#3a3020',
      borderStrong: '#6e5a24',
      onGold: '#16161a',
    },
    burgundy: { base: '#7e1e2b', accent: '#c0453b' },
    border: { subtle: '#2a2a30', gold: '#3a3020' },
  },
} as const;

// Font families are the registered face names (PostScript name on iOS, file
// basename on Android), not family+weight pairs: RN Android resolves fontFamily
// by file name, so "Alegreya" + weight 700 would not reliably pick the bold
// face. Explicit face names render consistently on both platforms.
export const typography = {
  family: {
    display: 'Belleza-Regular',
    heading: 'Belleza-Regular',
    body: 'Alegreya-Regular',
    bodyBold: 'Alegreya-Bold',
    bodyItalic: 'Alegreya-Italic',
  },
  size: { display: 44, h1: 30, h2: 24, h3: 19, body: 16, bodySm: 14, label: 12, micro: 11 },
  weight: { regular: '400' as const, bold: '700' as const },
  letterSpacing: { label: 1.5, labelWide: 2 },
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 } as const;
export const radius = { sm: 7, md: 14, lg: 16, pill: 999 } as const;
