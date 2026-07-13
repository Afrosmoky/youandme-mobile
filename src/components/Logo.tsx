import React, { useMemo } from 'react';
import { StyleProp, StyleSheet, Text, TextStyle } from 'react-native';
import { Theme, useTheme } from '../theme';

type Props = {
  // Font size of the wordmark; defaults to the display scale.
  size?: number;
  style?: StyleProp<TextStyle>;
  testID?: string;
};

// Brand wordmark "ja & ty" in Belleza: the ampersand in gold, the words in the
// primary text colour. Fixed brand text, not user-facing copy.
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
  const { colors, typography } = theme;
  return StyleSheet.create({
    base: {
      fontFamily: typography.family.display,
      fontSize: typography.size.display,
    },
    word: {
      fontFamily: typography.family.display,
      color: colors.text.primary,
    },
    amp: {
      fontFamily: typography.family.display,
      color: colors.gold.primary,
    },
  });
};
