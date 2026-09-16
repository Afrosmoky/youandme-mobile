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
  // Set for a scrolling screen whose main business is typing, and whose actions
  // sit at the bottom where the keyboard would cover them.
  //
  // It maps to the ScrollView's `automaticallyAdjustKeyboardInsets`, which is
  // iOS-only and off by default in RN. iOS does not resize the window for the
  // keyboard the way Android's `adjustResize` does (see AndroidManifest), so
  // without something the bottom of a full-height screen is simply behind the
  // keyboard, unreachable, because a screen whose content exactly fills the
  // viewport has no scroll range to drag.
  //
  // Deliberately this and NOT a KeyboardAvoidingView. KAV measures its own box
  // with `onLayout`, which reports coordinates relative to the PARENT, and
  // compares them against the keyboard's absolute frame; under a navigation
  // header the two disagree by exactly the header's height, so a nested KAV
  // lifts too little unless it is handed a `keyboardVerticalOffset` nobody can
  // state without `useHeaderHeight` (a package this project does not depend on)
  // or a hard-coded constant that is wrong on the next device. The three auth
  // screens live with that error today; it is invisible there only because a
  // short centred form does not need the missing part.
  //
  // This prop has none of that arithmetic: RN computes the inset natively from
  // absolute coordinates (`convertPoint:toView:nil`), insets the content by the
  // real overlap — which is what gives the screen something to scroll — and
  // brings the focused field into view. On Android it is ignored, which is
  // correct, because `adjustResize` has already done the job.
  //
  // Only the scrolling branch can honour it; a non-scrolling screen has no
  // content inset to give.
  avoidsKeyboard?: boolean;
  testID?: string;
};

// Dark screen wrapper: safe-area frame + a scrollable, padded body. The native
// header covers the top inset, so only the bottom edge is claimed here.
export function ScreenContainer({
  children,
  style,
  contentContainerStyle,
  scrollable = true,
  avoidsKeyboard = false,
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
          automaticallyAdjustKeyboardInsets={avoidsKeyboard}
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
