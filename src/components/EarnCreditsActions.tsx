import React, { useMemo } from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { OutlineButton } from './OutlineButton';
import { useShareApp, useRateApp } from '../queries/useShareApp';
import { useRewards } from '../queries/useRewards';
import { useDeck } from '../queries/useDeck';
import { EarnGain, earnOffer } from '../domain/rewards';
import type { RootStackParamList } from '../navigation/types';
import { Theme, useTheme } from '../theme';
import { pl } from '../i18n/pl';

type Props = {
  // Each action is `${testID}-share` and `${testID}-rate`, so a call site keeps
  // whatever ids its tests already use. What they give is `${testID}-share-gain`
  // and `${testID}-rate-gain`; the way to the deck `${testID}-unlock`.
  testID: string;
  // Positions the pair. The gap BETWEEN them belongs to this component; the gap
  // above them belongs to whatever it sits under.
  style?: StyleProp<ViewStyle>;
  // Off where the screen already points at the deck itself (the exhaustion
  // panel's own "Odblokujcie więcej"), so the same way in is not offered twice.
  unlockLink?: boolean;
};

/**
 * The two things a couple can do to earn more cards, in the one shape they have
 * everywhere.
 *
 * Four screens offer them: the profile, the deck-exhaustion funnel, the rewards
 * screen and the game summary. They were the same two buttons with the same
 * labels calling the same handlers in each — which is how two of them end up
 * drifting into being "a different way to do the same thing" the first time one
 * is touched.
 *
 * The hooks live inside rather than being passed in, because there is no version
 * of this where a caller wants different behaviour: sharing claims its reward
 * when a target is picked, rating claims for the gesture of asking, and both are
 * idempotent server-side.
 *
 * Under each button, what it gives ("+5 kart"), or that it was taken; under both,
 * the way from here to the deck where the cards are actually unlocked. Earning
 * without that way was the gap: a couple gained the right to five cards on the
 * summary and, playing again, met none of them, because a card only opens on
 * the deck screen.
 *
 * All of it needs the balance AND the closed deck. Until both have arrived — or
 * if either fails — the buttons stand alone: no "+0", no link with an empty
 * count, never a stand-in number.
 */
export function EarnCreditsActions({ testID, style, unlockLink = true }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const shareApp = useShareApp();
  const rateApp = useRateApp();
  const { data: rewards } = useRewards();
  const { data: deck } = useDeck();

  const offer = rewards && deck ? earnOffer(rewards, deck) : null;

  const gainLine = (gain: EarnGain | undefined, id: string) => {
    if (!gain || gain.kind === 'none') {
      return null;
    }
    return (
      <Text testID={id} style={styles.gain}>
        {gain.kind === 'claimed' ? pl.earn.claimed : pl.earn.gain(gain.count)}
      </Text>
    );
  };

  return (
    <View style={style}>
      <OutlineButton
        testID={`${testID}-share`}
        title={pl.earn.shareApp}
        onPress={shareApp}
      />
      {gainLine(offer?.share, `${testID}-share-gain`)}
      <OutlineButton
        testID={`${testID}-rate`}
        title={pl.earn.rateApp}
        onPress={rateApp}
        style={styles.second}
      />
      {gainLine(offer?.rating, `${testID}-rate-gain`)}

      {/* popTo, not navigate: on the rewards screen the deck is already right
          underneath, and navigate would stack a second one on top of it. */}
      {unlockLink && offer && offer.unlockable > 0 && (
        <TouchableOpacity
          testID={`${testID}-unlock`}
          onPress={() => navigation.popTo('Deck')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.unlock}>
          <Text style={styles.unlockText}>
            {pl.earn.unlockLink(offer.unlockable)}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const createStyles = (theme: Theme) => {
  const { colors, typography, spacing } = theme;
  return StyleSheet.create({
    second: {
      marginTop: spacing.md,
    },
    gain: {
      fontFamily: typography.family.body,
      fontSize: typography.size.bodySm,
      color: colors.gold.primary,
      textAlign: 'center',
      marginTop: spacing.xs,
    },
    unlock: {
      marginTop: spacing.lg,
      alignSelf: 'center',
    },
    unlockText: {
      fontFamily: typography.family.body,
      fontSize: typography.size.body,
      color: colors.gold.primary,
    },
  });
};
