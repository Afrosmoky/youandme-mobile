import React, { useMemo } from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Theme, useTheme } from '../theme';

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

// Small gold pill (e.g. "SESJA", "KARTA DNIA"). Like SectionLabel, caps is
// visual (textTransform) so the text content stays the original label.
export function Badge({ children, style, testID }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={[styles.pill, style]}>
      <Text testID={testID} style={styles.text}>
        {children}
      </Text>
    </View>
  );
}

const createStyles = (theme: Theme) => {
  const { colors, typography, radius, spacing } = theme;
  return StyleSheet.create({
    pill: {
      backgroundColor: colors.bg.goldTint,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      alignSelf: 'flex-start',
    },
    text: {
      fontFamily: typography.family.body,
      fontSize: typography.size.micro,
      color: colors.gold.primary,
      letterSpacing: typography.letterSpacing.label,
      textTransform: 'uppercase',
    },
  });
};
