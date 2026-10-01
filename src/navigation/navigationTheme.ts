import { DarkTheme, type Theme as NavigationTheme } from '@react-navigation/native';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import type { Theme } from '../theme';

// Every screen styles its own header (navigation.setOptions in the screen), and
// until now that was the ONLY place the dark header came from: the container had
// no theme and the navigator no defaults. A screen that forgot the call — the
// game summary did — came up with React Navigation's light defaults, a white bar
// with black text in an app that is dark everywhere else.
//
// These two are the floor under that. A screen's own setOptions still wins; one
// that has none now inherits the app's look instead of the library's.

/** The container's theme: what a screen sits on, and what shows between two. */
export function navigationTheme(theme: Theme): NavigationTheme {
  const { colors } = theme;
  return {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      primary: colors.gold.primary,
      background: colors.bg.base,
      card: colors.bg.base,
      text: colors.text.primary,
      border: colors.border.subtle,
    },
  };
}

/** The header every screen gets unless it says otherwise. */
export function defaultScreenOptions(
  theme: Theme,
): NativeStackNavigationOptions {
  const { colors } = theme;
  return {
    headerStyle: { backgroundColor: colors.bg.base },
    headerTintColor: colors.gold.primary,
    headerShadowVisible: false,
    headerTitleAlign: 'center',
    contentStyle: { backgroundColor: colors.bg.base },
  };
}
