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
    // Warmed towards amber in S_polish: the first pass read as yellow rather
    // than gold. Only the four surface tones moved; border, borderStrong,
    // goldTint and onGold are unchanged.
    //
    // The two invariants this palette has to keep, both checked rather than
    // eyeballed: the lightness order bright > primary > mid > deep (relative
    // luminance 0.579 / 0.482 / 0.408 / 0.235), and onGold on primary, which
    // stays AAA at 9.15:1 (it was 11.72:1 on the yellower gold).
    gold: {
      primary: '#e0b24e',
      bright: '#ecc36a',
      mid: '#d3a441',
      deep: '#a67f31',
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

// Gold text glow (3C), ported from the web app's `.text-primary-shimmer`.
//
// WEB SOURCE (kod_firebase/src/app/globals.css). The static declaration there is
// never actually seen — `animation: shimmer-text 3s infinite alternate` overrides
// text-shadow from the first frame — so the honest basis is what the animation
// oscillates between: 12px/0.9 + 30px/0.5 and 16px/0.9 + 40px/0.5, i.e. a mean of
// 14px at 0.9 plus 35px at 0.5.
//
// TWO LAYERS INTO ONE. RN gives a single text shadow, so the pair has to collapse.
// Three honest readings of that mean:
//   A  keep the lit edge   -> r 14, a 0.90  (the inner layer exactly, no bloom)
//   B  keep the halo       -> r 35, a 0.50  (the outer layer exactly, no lit edge)
//   C  opacity-weighted    -> r 22, a 0.70
// None of them is right for every size, because the 35px bloom is invisible under
// a 12px cap and is the whole signature on a 44px wordmark. So the choice is made
// per role rather than once: A for small caps, C for headings, between C and B for
// the wordmark. Composited alpha right at the glyph on the web is 0.95, which is
// why the tight reading keeps 0.9 rather than splitting the difference downwards.
//
// NOT ANIMATED, and that is a deliberate departure from the web. `textShadowRadius`
// is not supported by Animated's native driver (only transforms and opacity are),
// so a 3s loop would run on the JS driver — a bridge tick every frame, on every
// mounted screen, forever, including underneath a scrolling list. Constant cost for
// an effect nobody consciously registers.
//
// The colour is the APP's gold, not the web's. The web `--primary` is
// hsl(45 85% 65%) = #F2CC5A, and gold.primary above is #E0B24E: S_polish warmed it
// deliberately after "the first pass read as yellow rather than gold". Glowing in
// the web's yellow would undo that decision and put two golds on one screen — flat
// text in one, halo in the other.
const GOLD_RGB = '224, 178, 78';

export const glow = {
  // Small gold caps (SectionLabel, 11-13px). Reading A.
  label: {
    textShadowColor: `rgba(${GOLD_RGB}, 0.9)`,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 14,
  },
  // Screen titles and section headings (h1/h2). Reading C.
  heading: {
    textShadowColor: `rgba(${GOLD_RGB}, 0.7)`,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 22,
  },
  // The wordmark (display, 44px), where the bloom is the point.
  logo: {
    textShadowColor: `rgba(${GOLD_RGB}, 0.6)`,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 28,
  },
  // The prepared escape hatch. Spread this instead of `label` at the three
  // SectionLabel call sites inside FlatList rows (MemoriesScreen, DeckScreen,
  // LikedQuestionList) if text shadows turn out to cost too much while scrolling
  // on Android. Explicit zeros rather than an empty object so it overrides a glow
  // already spread above it.
  none: {
    textShadowColor: 'transparent',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 0,
  },
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 } as const;
export const radius = { sm: 7, md: 14, lg: 16, pill: 999 } as const;
