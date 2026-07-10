import React, { useMemo } from 'react';
import { StyleProp, StyleSheet, Text, TextStyle } from 'react-native';
import { Theme, useTheme } from '../theme';

type Props = {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
  testID?: string;
};

// Gold caps label (e.g. "NA POZNANIE"). Uppercasing is done with textTransform
// so the underlying text content stays the original string — screens and tests
// pass normal-case text.
export function SectionLabel({ children, style, testID }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <Text testID={testID} style={[styles.label, style]}>
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
  });
};
