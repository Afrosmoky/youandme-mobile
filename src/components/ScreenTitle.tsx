import React, { useMemo } from 'react';
import { StyleProp, StyleSheet, Text, TextStyle } from 'react-native';
import { Theme, useTheme, withGlowRoom } from '../theme';

type Props = {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
  testID?: string;
};

/**
 * The title in the native navigation header.
 *
 * Every screen that sets one was rendering the same `<Text>` against its own
 * private copy of the same four properties — fourteen identical stylesheets, and
 * the glow from 3C had to be pasted into all fourteen. That spread is what made
 * this worth extracting: a token nobody can forget is better than a token
 * everybody has to remember.
 *
 * Scope is deliberately the HEADER title only. The titles that live in a screen's
 * body genuinely differ — h1 or h2, gold or off-white, centred or not, with or
 * without a margin — and a component taking props for all of that would be a
 * stylesheet with extra steps. Those keep their own styles and their own glow.
 *
 * Used inside `navigation.setOptions({ headerTitle: () => <ScreenTitle>…` — a
 * render prop, not a remounted subtree, which is why the callers carry an
 * eslint-disable for react/no-unstable-nested-components.
 */
export function ScreenTitle({ children, style, testID }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <Text
      testID={testID}
      style={withGlowRoom(StyleSheet.flatten([styles.screenTitle, style]))}>
      {children}
    </Text>
  );
}

const createStyles = (theme: Theme) => {
  const { colors, typography, glow } = theme;
  return StyleSheet.create({
    screenTitle: {
      fontFamily: typography.family.heading,
      fontSize: typography.size.h2,
      color: colors.text.primary,
      ...glow.heading,
    },
  });
};
