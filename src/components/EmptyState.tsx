import React, { useMemo } from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Theme, useTheme } from '../theme';

type Props = {
  // The one sentence that says what is not here yet.
  title: string;
  // Optional second line. Nothing in the current copy needs it; it exists so a
  // screen with something to explain does not have to grow its own layout.
  description?: string;
  // Optional text glyph above the title. A glyph, not an icon library — the P4
  // no-icon-lib decision still stands (see LikeHeart/GameCard). Off by default:
  // Alegreya and Belleza are text faces, and a character they do not cover
  // renders as a tofu box, which is worse than no glyph at all.
  glyph?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

// "There is nothing here yet" — a normal, calm state, not a failure.
//
// Deliberately does NOT claim the screen: it centers its own text and stops
// there, so the caller decides whether it fills a FlatList's empty slot, a
// ScrollView, or a single section. That is what lets the same component sit in
// `ListEmptyComponent` and inside a form.
//
// Dumb by construction, same shape as GameCard/PasswordInput: props in, nothing
// else. It knows no query, no screen and no copy of its own.
export function EmptyState({
  title,
  description,
  glyph,
  style,
  testID,
}: Props) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View testID={testID} style={[styles.container, style]}>
      {glyph && <Text style={styles.glyph}>{glyph}</Text>}
      <Text style={styles.title}>{title}</Text>
      {description && <Text style={styles.description}>{description}</Text>}
    </View>
  );
}

const createStyles = (theme: Theme) => {
  const { colors, typography, spacing } = theme;
  return StyleSheet.create({
    container: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xl,
    },
    glyph: {
      fontFamily: typography.family.body,
      fontSize: typography.size.h1,
      color: colors.gold.deep,
      marginBottom: spacing.md,
    },
    title: {
      fontFamily: typography.family.body,
      fontSize: typography.size.body,
      color: colors.text.muted,
      textAlign: 'center',
    },
    description: {
      fontFamily: typography.family.body,
      fontSize: typography.size.bodySm,
      color: colors.text.muted,
      textAlign: 'center',
      marginTop: spacing.sm,
    },
  });
};
