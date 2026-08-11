import React, { useMemo } from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { OutlineButton } from './OutlineButton';
import { Theme, useTheme } from '../theme';
import { pl } from '../i18n/pl';

type Props = {
  // Ready-to-show message. Screens produce it with parseApiError, so this
  // component never learns what an HTTP status is.
  message: string;
  // Omit and there is no button — for a failure with nothing to retry.
  onRetry?: () => void;
  // Spinner on the button while the retry is in flight.
  retrying?: boolean;
  // See EmptyState: opt-in text glyph, off by default.
  glyph?: string;
  style?: StyleProp<ViewStyle>;
  // The retry button takes `${testID}-retry`.
  testID?: string;
};

// "This did not load" — with a way out.
//
// Replaces the Alert-in-useEffect that four screens used to fire: an alert says
// its piece and disappears, leaving the couple on an empty screen that looks
// like an empty state, with no way to try again short of leaving and coming
// back. Empty, error and loading are three different things and this is the one
// that admits something broke.
//
// Like EmptyState it centers its own content without claiming the screen, so it
// works as a FlatList's empty slot, as a whole screen body, or as one section
// of a screen that otherwise works (ProfileScreen's verification block).
export function ErrorState({
  message,
  onRetry,
  retrying,
  glyph,
  style,
  testID,
}: Props) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View testID={testID} style={[styles.container, style]}>
      {glyph && <Text style={styles.glyph}>{glyph}</Text>}
      <Text style={styles.message}>{message}</Text>
      {onRetry && (
        <OutlineButton
          testID={testID ? `${testID}-retry` : undefined}
          title={pl.common.retry}
          onPress={onRetry}
          loading={retrying}
          disabled={retrying}
          style={styles.button}
        />
      )}
    </View>
  );
}

const createStyles = (theme: Theme) => {
  const { colors, typography, spacing } = theme;
  return StyleSheet.create({
    container: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xl,
    },
    glyph: {
      fontFamily: typography.family.body,
      fontSize: typography.size.h1,
      color: colors.burgundy.accent,
      marginBottom: spacing.md,
    },
    message: {
      fontFamily: typography.family.body,
      fontSize: typography.size.body,
      color: colors.text.secondary,
      textAlign: 'center',
    },
    button: {
      marginTop: spacing.lg,
      alignSelf: 'stretch',
    },
  });
};
