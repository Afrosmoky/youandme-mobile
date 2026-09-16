import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { Theme, useTheme } from '../theme';

type Props = {
  title: string;
  onPress: () => void;
  // Shows a spinner and blocks presses (used for in-flight submits).
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

// Primary CTA: filled gold, dark label. The canonical "Zapisz" button.
export function GoldButton({
  title,
  onPress,
  loading,
  disabled,
  style,
  testID,
}: Props) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const blocked = disabled || loading;
  return (
    <TouchableOpacity
      testID={testID}
      style={[styles.button, blocked && styles.blocked, style]}
      onPress={onPress}
      disabled={blocked}>
      {loading ? (
        <ActivityIndicator color={theme.colors.gold.onGold} />
      ) : (
        <Text style={styles.text}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const createStyles = (theme: Theme) => {
  const { colors, typography, radius, spacing, glow } = theme;
  return StyleSheet.create({
    button: {
      backgroundColor: colors.gold.primary,
      borderRadius: radius.md,
      paddingVertical: spacing.lg,
      alignItems: 'center',
      // The named halo, not numbers: see `glow.button` in tokens for what it is
      // made of and why it is a box shadow rather than an elevation. Only the
      // filled button gets it — OutlineButton is a line, and a glow around a
      // line is the line again, blurred.
      ...glow.button,
    },
    blocked: {
      opacity: 0.6,
    },
    text: {
      fontFamily: typography.family.bodyBold,
      fontSize: typography.size.body,
      color: colors.gold.onGold,
    },
  });
};
