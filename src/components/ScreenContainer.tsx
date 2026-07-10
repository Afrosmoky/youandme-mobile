import React, { useMemo } from 'react';
import {
  ScrollView,
  StyleProp,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Theme, useTheme } from '../theme';

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  testID?: string;
};

// Dark screen wrapper: safe-area frame + a scrollable, padded body. The native
// header covers the top inset, so only the bottom edge is claimed here.
export function ScreenContainer({
  children,
  style,
  contentContainerStyle,
  testID,
}: Props) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <SafeAreaView style={[styles.safe, style]} edges={['bottom', 'left', 'right']}>
      <ScrollView
        testID={testID}
        style={styles.scroll}
        contentContainerStyle={[styles.content, contentContainerStyle]}
        keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme) => {
  const { colors, spacing } = theme;
  return StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: colors.bg.base,
    },
    scroll: {
      flex: 1,
    },
    content: {
      padding: spacing.xxl,
    },
  });
};
