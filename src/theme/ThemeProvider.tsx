import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { Theme, themes, darkTheme } from './theme';

const ThemeContext = createContext<Theme | undefined>(undefined);

// Provides the active theme. It reads useColorScheme so a light scheme can be
// switched in later, but P11a is dark-only: we always resolve to the dark theme
// for now. When `themes.light` exists, map systemScheme → themes[systemScheme].
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme() ?? 'dark';
  const theme = useMemo<Theme>(() => {
    // Dark-only for P11a: only `themes.dark` exists, so any system value falls
    // back to it. When a light scheme lands, index `themes` by systemScheme.
    return themes[systemScheme as keyof typeof themes] ?? darkTheme;
  }, [systemScheme]);

  return (
    <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): Theme {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}
