import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { Theme, useTheme } from '../theme';

type Props = {
  variant: 'warning' | 'error';
  title: string;
  // Optional gold call-to-action below the title (e.g. "resend verification").
  action?: string;
  onAction?: () => void;
  actionLoading?: boolean;
  actionTestID?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

// Burgundy notice box for warnings/errors, with an optional gold action link.
export function Banner({
  variant,
  title,
  action,
  onAction,
  actionLoading,
  actionTestID,
  style,
  testID,
}: Props) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme, variant), [theme, variant]);
  return (
    <View testID={testID} style={[styles.box, style]}>
      <Text style={styles.title}>{title}</Text>
      {action && (
        <TouchableOpacity
          testID={actionTestID}
          onPress={onAction}
          disabled={actionLoading}>
          {actionLoading ? (
            <ActivityIndicator color={theme.colors.gold.primary} />
          ) : (
            <Text style={styles.action}>{action}</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

const createStyles = (theme: Theme, variant: 'warning' | 'error') => {
  const { colors, typography, spacing, radius } = theme;
  // Both variants share the burgundy palette today; keeping `variant` here lets
  // a distinct error treatment diverge later without touching callsites.
  const borderColor = {
    warning: colors.burgundy.accent,
    error: colors.burgundy.accent,
  }[variant];
  return StyleSheet.create({
    box: {
      backgroundColor: colors.burgundy.base,
      borderWidth: 1,
      borderColor,
      borderRadius: radius.md,
      padding: spacing.lg,
    },
    title: {
      fontFamily: typography.family.bodyBold,
      fontSize: typography.size.body,
      color: colors.text.primary,
    },
    action: {
      fontFamily: typography.family.body,
      fontSize: typography.size.bodySm,
      color: colors.gold.primary,
      marginTop: spacing.xs,
    },
  });
};
