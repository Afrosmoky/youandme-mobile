import React, { useMemo } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { OutlineButton } from './OutlineButton';
import { useShareApp, useRateApp } from '../queries/useShareApp';
import { Theme, useTheme } from '../theme';
import { pl } from '../i18n/pl';

type Props = {
  // Each action is `${testID}-share` and `${testID}-rate`, so a call site keeps
  // whatever ids its tests already use.
  testID: string;
  // Positions the pair. The gap BETWEEN them belongs to this component; the gap
  // above them belongs to whatever it sits under.
  style?: StyleProp<ViewStyle>;
};

/**
 * The two things a couple can do to earn a credit, in the one shape they have
 * everywhere.
 *
 * Three screens offer them: the profile, the deck-exhaustion funnel, and the
 * rewards screen. They were the same two buttons with the same labels calling
 * the same handlers in each — which is how two of them end up drifting into
 * being "a different way to do the same thing" the first time one is touched.
 *
 * The hooks live inside rather than being passed in, because there is no version
 * of this where a caller wants different behaviour: sharing claims its reward
 * when a target is picked, rating claims for the gesture of asking, and both are
 * idempotent server-side. A call site that wanted to change that would be a call
 * site doing something else.
 *
 * Nothing here reads shareRewardClaimed or ratingRewardClaimed, which the
 * rewards endpoint does return. That is P7's decision standing: sharing keeps
 * its value after the reward is taken, and how a claimed action should look is a
 * question for the style guide. The upside of this component is that answering
 * it later is one change rather than three.
 */
export function EarnCreditsActions({ testID, style }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const shareApp = useShareApp();
  const rateApp = useRateApp();

  return (
    <View style={style}>
      <OutlineButton
        testID={`${testID}-share`}
        title={pl.earn.shareApp}
        onPress={shareApp}
      />
      <OutlineButton
        testID={`${testID}-rate`}
        title={pl.earn.rateApp}
        onPress={rateApp}
        style={styles.second}
      />
    </View>
  );
}

const createStyles = (theme: Theme) => {
  const { spacing } = theme;
  return StyleSheet.create({
    second: {
      marginTop: spacing.md,
    },
  });
};
