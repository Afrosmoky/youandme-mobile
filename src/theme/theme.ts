import { colorSchemes, typography, spacing, radius, glow } from './tokens';

// A theme bundles one color scheme with the shared type/spacing/radius scales.
// Colors are per-scheme; typography/spacing/radius are shared across schemes.
export type ThemeColors = (typeof colorSchemes)['dark'];

export type Theme = {
  scheme: keyof typeof colorSchemes;
  colors: ThemeColors;
  typography: typeof typography;
  spacing: typeof spacing;
  radius: typeof radius;
  // Named glow sets (3C): text shadows, plus the one view shadow under the
  // primary CTA. Screens spread these; they never hold the numbers themselves,
  // so the whole glow layer moves from one place.
  glow: typeof glow;
};

export const darkTheme: Theme = {
  scheme: 'dark',
  colors: colorSchemes.dark,
  typography,
  spacing,
  radius,
  glow,
};

export const themes = { dark: darkTheme } as const;
