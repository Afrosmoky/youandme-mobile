import { colorSchemes, typography, spacing, radius } from './tokens';

// A theme bundles one color scheme with the shared type/spacing/radius scales.
// Colors are per-scheme; typography/spacing/radius are shared across schemes.
export type ThemeColors = (typeof colorSchemes)['dark'];

export type Theme = {
  scheme: keyof typeof colorSchemes;
  colors: ThemeColors;
  typography: typeof typography;
  spacing: typeof spacing;
  radius: typeof radius;
};

export const darkTheme: Theme = {
  scheme: 'dark',
  colors: colorSchemes.dark,
  typography,
  spacing,
  radius,
};

export const themes = { dark: darkTheme } as const;
