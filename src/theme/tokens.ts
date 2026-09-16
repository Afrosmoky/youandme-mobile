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

// How much of the shimmer's alpha the view halo keeps (see `glow.button`). One
// number for both of its layers, so turning the halo up or down cannot quietly
// change the relationship between the lit edge and the bloom. Rounded to three
// places so the value reads as a number rather than as float noise.
const HALO_SCALE = 0.75;
const halo = (shimmerAlpha: number): string =>
  `rgba(${GOLD_RGB}, ${Math.round(shimmerAlpha * HALO_SCALE * 1000) / 1000})`;

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
  // The one entry here that is NOT a text shadow: the halo under the primary
  // CTA (GoldButton). It lives in this group because it is the same effect from
  // the same source — gold light bleeding off a gold shape — and the app should
  // have one place where the glow layer is turned up or down, not two.
  //
  // WHAT IT IS MADE OF. The geometry is the shimmer above, unchanged: two
  // layers, no offset, the mean of the animation's two keyframes (14 and 35).
  // The difference is that a view CAN have both layers — `boxShadow` takes an
  // array, so nothing has to be collapsed into one radius the way readings
  // A/B/C had to be for text. And these radii need no reinterpretation either:
  // `blurRadius` is the CSS number (iOS halves it into `shadowRadius`, Android
  // into a blur sigma), unlike `textShadowRadius`, which is not the CSS blur.
  //
  // The alphas are NOT the shimmer's. 0.9 around a glyph is a lit stroke; the
  // same 0.9 around a 170x52 filled rectangle is a second button. So the pair
  // is scaled down as a pair, keeping the shimmer's ratio between the two.
  //
  // The scale started at 0.4, which landed the outer layer on 0.2 — the alpha
  // the web itself uses the one time it puts gold around a box rather than
  // around letters (`shadow-lg shadow-primary/20` on the premium card,
  // page.tsx:409). On a device that came out invisible, because the borrowed
  // number arrived without the geometry it belongs to: Tailwind's shadow-lg is
  // a 15px blur pushed 10px downwards, so its 0.2 piles up in a band under one
  // edge. Ours is 35px and centred, spreading the same alpha around all four
  // sides of a much smaller shape, over more than twice the distance. Alpha
  // does not travel between two shadows of different size, and being faithful
  // to the number stopped being the same as being faithful to the effect.
  //
  // So HALO_SCALE above is set by looking at it on a device instead, at 0.75.
  // Geometry is untouched — same halo, same ratio between its two layers, just
  // legible on #16161a.
  //
  // ANDROID, deliberately: `boxShadow` and not `elevation`. Elevation draws
  // Android's own shadow, which was grey regardless of `shadowColor` until
  // API 28 and is a grey plate under a gold button — worse than no glow.
  // `boxShadow` under Fabric paints a real blurred gold shadow of its own
  // (OutsetBoxShadowDrawable) from API 28, and simply draws nothing below it.
  // Nothing is the right fallback here; grey is not.
  button: {
    boxShadow: [
      { offsetX: 0, offsetY: 0, blurRadius: 14, color: halo(0.9) },
      { offsetX: 0, offsetY: 0, blurRadius: 35, color: halo(0.5) },
    ],
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
