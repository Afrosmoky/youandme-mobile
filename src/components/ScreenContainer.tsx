import React, { useMemo } from 'react';
import {
  ScrollView,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Theme, useTheme } from '../theme';

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  // Set false for a screen that fills the viewport instead of scrolling as a
  // whole — one where something inside it is the thing that scrolls, and
  // something else has to stay pinned to the bottom. The game screen is the
  // case this exists for (3D): its card takes the height that is left and its
  // own content scrolls, so the actions can sit still while the question moves.
  //
  // A screen cannot have it both ways: a ScrollView gives its children their
  // natural height, so `flex: 1` inside one measures against nothing and the
  // card collapses to its content.
  scrollable?: boolean;
  testID?: string;
};

// Dark screen wrapper: safe-area frame + a scrollable, padded body. The native
// header covers the top inset, so only the bottom edge is claimed here.
export function ScreenContainer({
  children,
  style,
  contentContainerStyle,
  scrollable = true,
  testID,
}: Props) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <SafeAreaView style={[styles.safe, style]} edges={['bottom', 'left', 'right']}>
      {scrollable ? (
        <ScrollView
          testID={testID}
          style={styles.scroll}
          contentContainerStyle={[styles.content, contentContainerStyle]}
          keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        // Same padding, same testID, no scrolling — so a screen can switch
        // between the two without anything else on it moving.
        <View
          testID={testID}
          style={[styles.scroll, styles.content, contentContainerStyle]}>
          {children}
        </View>
      )}
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
