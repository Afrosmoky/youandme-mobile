import React, { useMemo } from 'react';
import { StyleProp, StyleSheet, Text, TextStyle } from 'react-native';
import { Theme, useTheme, withGlowRoom } from '../theme';

// Which gold-caps label this is. `gold` is the default and the one nearly every
// screen wants; `bright` exists because the ritual tile on Home is deliberately
// near-white rather than gold — the gold tile there is the daily card, and two
// gold accents side by side would say they are the same kind of thing.
//
// It arrived as a copy of this component's stylesheet living in HomeScreen, the
// only place in the app where caps lived outside this file. A prop rather than a
// second component, because the difference really is one colour.
export type SectionLabelTone = 'gold' | 'bright';

type Props = {
  children: React.ReactNode;
  tone?: SectionLabelTone;
  // Set false to drop the glow. The prepared escape hatch for labels inside
  // FlatList rows (MemoriesScreen, DeckScreen, LikedQuestionList), where the
  // shadow is paid for on every row and Android renders text shadows more
  // expensively than iOS. Nothing passes it yet — it exists so the answer to
  // "scrolling got heavy" is one prop, not a redesign.
  glow?: boolean;
  style?: StyleProp<TextStyle>;
  testID?: string;
};

// Gold caps label (e.g. "NA POZNANIE"). Uppercasing is done with textTransform
// so the underlying text content stays the original string — screens and tests
// pass normal-case text.
export function SectionLabel({
  children,
  tone = 'gold',
  glow = true,
  style,
  testID,
}: Props) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  // Flattened with the caller's style first, so the glow's room is merged into
  // whatever margins the caller set rather than overridden by them (glowRoom).
  const flat = StyleSheet.flatten([
    styles.label,
    tone === 'bright' && styles.bright,
    glow ? styles.glow : styles.flat,
    style,
  ]);
  return (
    <Text testID={testID} style={glow ? withGlowRoom(flat) : flat}>
      {children}
    </Text>
  );
}

const createStyles = (theme: Theme) => {
  const { colors, typography } = theme;
  return StyleSheet.create({
    label: {
      fontFamily: typography.family.heading,
      fontSize: typography.size.label,
      color: colors.gold.primary,
      letterSpacing: typography.letterSpacing.label,
      textTransform: 'uppercase',
    },
    bright: {
      color: colors.text.bright,
    },
    // The numbers live in the theme, never here — see theme.glow for how the
    // web's two shadow layers collapse into the one RN offers.
    glow: theme.glow.label,
    flat: theme.glow.none,
  });
};
