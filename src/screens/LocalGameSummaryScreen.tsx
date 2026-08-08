import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { LocalGameSummary, summarise } from '../domain/localGame';
import {
  clearLocalGameState,
  loadLocalGameState,
} from '../storage/localGameState';
import { useReportPlayedCards } from '../queries/useReportPlayedCards';
import { useMilestoneCelebration } from '../queries/useMilestoneCelebration';
import { useProgress } from '../queries/useProgress';
import { ScreenContainer } from '../components/ScreenContainer';
import { Card } from '../components/Card';
import { Celebration } from '../components/Celebration';
import { GoldButton } from '../components/GoldButton';
import { OutlineButton } from '../components/OutlineButton';
import { SectionLabel } from '../components/SectionLabel';
import { Theme, useTheme } from '../theme';
import { pl } from '../i18n/pl';

type Props = NativeStackScreenProps<RootStackParamList, 'LocalGameSummary'>;

// End of a local session (P10 S3): what the couple did, and the one moment the
// server hears about any of it.
export function LocalGameSummaryScreen({ navigation }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [summary, setSummary] = useState<LocalGameSummary | null>(null);
  const [reportFailed, setReportFailed] = useState(false);
  const report = useReportPlayedCards();
  const reportStarted = useRef(false);
  // What this session owes the server, read once on mount (see below).
  const owed = useRef<string[] | null>(null);

  // Declared BEFORE the report is fired, and gated on progress below, for a
  // reason that is easy to lose: the hook celebrates a locked -> unlocked
  // transition it watched happen, and its FIRST reading only seeds a baseline.
  // Mounted after the report had already landed, it would take one reading of
  // the new numbers and correctly never fire — the couple would cross a
  // milestone and see nothing.
  const { milestone, dismiss } = useMilestoneCelebration();
  // The same query the hook reads, deduplicated by TanStack. Waiting on it here
  // is what guarantees the baseline exists before anything can move it.
  const { data: progress, isError: progressFailed } = useProgress();

  // Read the session ONCE, on mount.
  //
  // Deliberately not folded into the report effect below. That one re-runs when
  // the map changes — which it does moments after the report, because the report
  // invalidates it — and by then this session has been cleared from disk. A
  // second read would come back null and bounce the couple off their own summary
  // (and out from under a celebration that had not appeared yet). "Nothing
  // stored" is only an answer about how this screen was ENTERED.
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
      // Held in a ref so the report below does not have to go back to disk for
      // something it was already told.
      owed.current = stored.playedUlids;
      setSummary(summarise(stored));
    })();
    return () => {
      active = false;
    };
    // Run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Report, once the session has been read AND the baseline reading of the map
  // is in (or has failed — a couple must not be stuck on a spinner because the
  // map is down). `summary` is in the deps as the render-visible signal that the
  // ref above has been filled, for the case where the map resolves first.
  useEffect(() => {
    if (summary === null || owed.current === null) {
      return;
    }
    if (!progress && !progressFailed) {
      return;
    }
    if (reportStarted.current) {
      return;
    }
    reportStarted.current = true;

    let active = true;
    (async () => {
      try {
        await report.mutateAsync(owed.current ?? []);
        // Only now is the session finished with. Cleared on success alone: if
        // the report did not land, the state stays put and the setup screen
        // flushes the same buffer on the next visit.
        await clearLocalGameState();
      } catch {
        if (active) {
          setReportFailed(true);
        }
      }
    })();
    return () => {
      active = false;
    };
    // reportStarted keeps this to one report however often the deps move.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress, progressFailed, summary]);

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

      {reportFailed && (
        <Text testID="local-game-report-pending" style={styles.pending}>
          {pl.localGame.reportPending}
        </Text>
      )}

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
    pending: {
      fontFamily: typography.family.body,
      fontSize: typography.size.bodySm,
      color: colors.text.muted,
      marginBottom: spacing.lg,
    },
    playAgain: {
      marginBottom: spacing.md,
    },
  });
};
