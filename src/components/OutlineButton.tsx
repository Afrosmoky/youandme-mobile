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
  // Shows a spinner and blocks presses (used for in-flight actions).
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

// Secondary action: gold outline, light label. The canonical "Pomiń" button.
export function OutlineButton({
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
      style={[styles.button, blocked && styles.disabled, style]}
      onPress={onPress}
      disabled={blocked}>
      {loading ? (
        <ActivityIndicator color={theme.colors.text.primary} />
      ) : (
        <Text style={styles.text}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const createStyles = (theme: Theme) => {
  const { colors, typography, radius, spacing } = theme;
  return StyleSheet.create({
    button: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: colors.gold.deep,
      borderRadius: radius.md,
      paddingVertical: spacing.lg,
      alignItems: 'center',
    },
    disabled: {
      opacity: 0.6,
    },
    text: {
      fontFamily: typography.family.body,
      fontSize: typography.size.body,
      color: colors.text.primary,
    },
  });
};
