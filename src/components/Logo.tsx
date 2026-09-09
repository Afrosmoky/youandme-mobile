import React, { useMemo } from 'react';
import { StyleProp, StyleSheet, Text, TextStyle } from 'react-native';
import { Theme, useTheme } from '../theme';

type Props = {
  // Font size of the wordmark; defaults to the display scale.
  size?: number;
  style?: StyleProp<TextStyle>;
  testID?: string;
};

// Brand wordmark "ja & ty" in Belleza, gold throughout. Fixed brand text, not
// user-facing copy.
export function Logo({ size, style, testID }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <Text testID={testID} style={[styles.base, size ? { fontSize: size } : null, style]}>
      <Text style={styles.word}>ja </Text>
      <Text style={styles.amp}>&</Text>
      <Text style={styles.word}> ty</Text>
    </Text>
  );
}

const createStyles = (theme: Theme) => {
  const { colors, typography, glow } = theme;
  return StyleSheet.create({
    base: {
      fontFamily: typography.family.display,
      fontSize: typography.size.display,
    },
    // Words and ampersand share the gold; they stay separate spans because the
    // wordmark is one place the two may yet part ways.
    // The glow goes on the spans rather than on `base`, because a text shadow set
    // on a parent Text is not inherited by nested ones — the wordmark would come
    // out flat. Widest of the three sets: at 44px the bloom is the signature,
    // which is the whole reason the sizes get different radii.
    word: {
      fontFamily: typography.family.display,
      color: colors.gold.primary,
      ...glow.logo,
    },
    amp: {
      fontFamily: typography.family.display,
      color: colors.gold.primary,
      ...glow.logo,
    },
  });
};
