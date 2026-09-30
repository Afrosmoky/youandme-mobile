import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import {
  BACK_TO_SETUP,
  BACK_TO_SETUP_AND_START,
} from '../navigation/backToSetup';
import { LocalGameSummary, summarise } from '../domain/localGame';
import { loadLocalGameState } from '../storage/localGameState';
import { useMilestoneCelebration } from '../queries/useMilestoneCelebration';
import { useDeckResetAction } from '../queries/useDeckResetAction';
import { ScreenContainer } from '../components/ScreenContainer';
import { Card } from '../components/Card';
import { Celebration } from '../components/Celebration';
import { EarnCreditsActions } from '../components/EarnCreditsActions';
import { GoldButton } from '../components/GoldButton';
import { OutlineButton } from '../components/OutlineButton';
import { SectionLabel } from '../components/SectionLabel';
import { Theme, useTheme, withGlowRoom } from '../theme';
import { pl } from '../i18n/pl';

type Props = NativeStackScreenProps<RootStackParamList, 'LocalGameSummary'>;

// End of a local session: what the couple did, and nothing else.
//
// P10 made this the one moment the server heard about the session, which put a
// report, a progress baseline, a milestone celebration and the clearing of the
// state all on one screen — and made their ordering the hard part. S3c moved the
// report onto every transition (the map has to be right WHILE they play), so all
// of that is gone from here:
//
//   - reporting happens as cards are played, and whatever is still owed when the
//     couple leaves is resent by the setup screen;
//   - the milestone was celebrated on the card that earned it;
//   - the state is cleared by the setup screen, once it has nothing left to send.
//
// What is left is a read: counters off the session on disk, and two ways onward.
//
// With ONE exception, and it is the reason S3d exists. The card that ends a
// session is reported like any other — fired, not awaited — so its answer comes
// back here, to the screen the couple was moved to. A milestone crossed by that
// last card therefore has no card left to be celebrated on. This screen picks up
// that one case: it watches the map with the baseline the game screen handed it
// (route params), which is what tells a fresh unlock apart from the ones the
// session started with or already celebrated mid-game. It reports nothing,
// clears nothing, and celebrates nothing it was told had been accounted for.
export function LocalGameSummaryScreen({ navigation, route }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [summary, setSummary] = useState<LocalGameSummary | null>(null);
  // Mounted unconditionally, ahead of the loading return: the answer to the last
  // report can arrive while the counters are still being read off disk, and a
  // hook that only started watching afterwards would miss it.
  const { milestone, dismiss } = useMilestoneCelebration(
    route.params?.seenMilestones,
  );

  // "Zagrajcie od nowa" is the full deck again, not the next deal of unseen
  // cards. The reset waits for the last card's report before it is sent — see
  // useResetDeck — and then the couple goes through Home to a fresh setup,
  // exactly as this button always took them, which deals the full deck and
  // opens the game by itself.
  const [resetError, setResetError] = useState<string | null>(null);
  const onResetDone = useCallback(() => {
    navigation.reset(BACK_TO_SETUP_AND_START);
  }, [navigation]);
  const { request: requestReset, resetting } = useDeckResetAction({
    onDone: onResetDone,
    onError: setResetError,
  });

  // Read ONCE, on mount. The session outlives this screen now, but the rule
  // stands for the same reason it did in P10: "nothing stored" is only ever an
  // answer about how this screen was ENTERED, and a later read that came back
  // empty would bounce the couple off their own summary.
  useEffect(() => {
    let active = true;
    (async () => {
      const stored = await loadLocalGameState();
      if (!active) {
        return;
      }
      if (stored === null) {
        navigation.reset(BACK_TO_SETUP);
        return;
      }
      setSummary(summarise(stored));
    })();
    return () => {
      active = false;
    };
    // Run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (summary === null) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={theme.colors.gold.primary} />
      </View>
    );
  }

  return (
    <ScreenContainer testID="local-game-summary">
      <Text style={styles.title}>{pl.localGame.summaryTitle}</Text>

      <Card variant="gold" style={styles.counts}>
        <SectionLabel>{pl.localGame.summaryHeaderTitle}</SectionLabel>
        <Text testID="local-game-summary-questions" style={styles.count}>
          {pl.localGame.summaryQuestions(summary.questionsPlayed)}
        </Text>
        <Text testID="local-game-summary-challenges" style={styles.count}>
          {pl.localGame.summaryChallenges(summary.challengesShown)}
        </Text>
        <Text testID="local-game-summary-memories" style={styles.count}>
          {pl.localGame.summaryMemories(summary.memoriesSaved)}
        </Text>
      </Card>

      {/* Why the next game can be shorter than this one. The card counter on
          the next deal ("Karta 1 z 26") otherwise reads as a bug. */}
      <Text testID="local-game-summary-spent" style={styles.spent}>
        {pl.localGame.summarySpentCards}
      </Text>

      <GoldButton
        testID="local-game-play-again"
        title={pl.localGame.playAgainButton}
        onPress={() => {
          setResetError(null);
          requestReset();
        }}
        loading={resetting}
        style={styles.playAgain}
      />
      <OutlineButton
        testID="local-game-summary-home"
        title={pl.localGame.backHome}
        onPress={() => navigation.popTo('Home')}
        disabled={resetting}
      />

      {resetError && (
        <Text testID="local-game-summary-error" style={styles.error}>
          {resetError}
        </Text>
      )}

      {/* The way to more cards, at the moment a couple has just run through
          theirs. Shown every time rather than only on a spent deck: this screen
          does not know whether the deck is spent (only the next deal does), and
          asking the server here would race the report of the last card, which is
          fired rather than awaited. A genuinely empty deck still gets the full
          funnel on the setup screen, one tap away.

          Under the two buttons, because playing on is what most couples want;
          this is the answer for when they cannot. */}
      <View testID="local-game-summary-earn" style={styles.earn}>
        <SectionLabel>{pl.earn.sectionTitle}</SectionLabel>
        <Text style={styles.earnBody}>{pl.earn.sectionBody}</Text>
        <EarnCreditsActions
          testID="local-game-summary-earn"
          style={styles.earnActions}
        />
      </View>

      {/* Over the summary, exactly as it sits over the game: the counters stay
          where they are, and the couple dismisses the modal onto them. */}
      <Celebration
        visible={milestone !== null}
        title={pl.celebration.milestoneTitle}
        body={milestone ? pl.celebration.milestoneBody(milestone.name) : ''}
        onDismiss={dismiss}
      />
    </ScreenContainer>
  );
}

const createStyles = (theme: Theme) => {
  const { colors, typography, spacing, glow } = theme;
  return StyleSheet.create({
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.bg.base,
    },
    title: withGlowRoom({
      ...glow.heading,
      fontFamily: typography.family.heading,
      fontSize: typography.size.h1,
      color: colors.text.primary,
      marginBottom: spacing.xl,
    }),
    counts: {
      marginBottom: spacing.xl,
    },
    count: {
      fontFamily: typography.family.body,
      fontSize: typography.size.body,
      color: colors.text.primary,
      marginTop: spacing.md,
    },
    spent: {
      fontFamily: typography.family.body,
      fontSize: typography.size.bodySm,
      color: colors.text.secondary,
      marginBottom: spacing.lg,
    },
    playAgain: {
      marginBottom: spacing.md,
    },
    error: {
      fontFamily: typography.family.body,
      fontSize: typography.size.bodySm,
      color: colors.burgundy.accent,
      marginTop: spacing.md,
    },
    earn: {
      marginTop: spacing.xxl,
    },
    earnBody: {
      fontFamily: typography.family.body,
      fontSize: typography.size.bodySm,
      color: colors.text.secondary,
      marginTop: spacing.sm,
    },
    earnActions: {
      marginTop: spacing.lg,
    },
  });
};
