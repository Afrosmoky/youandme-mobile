import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { LocalGameSummary, summarise } from '../domain/localGame';
import { loadLocalGameState } from '../storage/localGameState';
import { useMilestoneCelebration } from '../queries/useMilestoneCelebration';
import { ScreenContainer } from '../components/ScreenContainer';
import { Card } from '../components/Card';
import { Celebration } from '../components/Celebration';
import { GoldButton } from '../components/GoldButton';
import { OutlineButton } from '../components/OutlineButton';
import { SectionLabel } from '../components/SectionLabel';
import { Theme, useTheme } from '../theme';
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
        navigation.replace('LocalGameSetup');
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

      <GoldButton
        testID="local-game-play-again"
        title={pl.localGame.playAgainButton}
        onPress={() => navigation.replace('LocalGameSetup')}
        style={styles.playAgain}
      />
      <OutlineButton
        testID="local-game-summary-home"
        title={pl.localGame.backHome}
        onPress={() => navigation.popTo('Home')}
      />

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
  const { colors, typography, spacing } = theme;
  return StyleSheet.create({
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.bg.base,
    },
    title: {
      fontFamily: typography.family.heading,
      fontSize: typography.size.h1,
      color: colors.text.primary,
      marginBottom: spacing.xl,
    },
    counts: {
      marginBottom: spacing.xl,
    },
    count: {
      fontFamily: typography.family.body,
      fontSize: typography.size.body,
      color: colors.text.primary,
      marginTop: spacing.md,
    },
    playAgain: {
      marginBottom: spacing.md,
    },
  });
};
