import React, { useLayoutEffect, useMemo } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useDailyCard } from '../queries/useDailyCard';
import { useWeeklyRitual } from '../queries/useWeeklyRitual';
import { useLocalPushSchedule } from '../notifications/useLocalPushSchedule';
import { ScreenContainer } from '../components/ScreenContainer';
import { GlowBackground } from '../components/GlowBackground';
import { Card } from '../components/Card';
import { SectionLabel } from '../components/SectionLabel';
import { Badge } from '../components/Badge';
import { ErrorState } from '../components/ErrorState';
import { parseApiError } from '../api/errors';
import { Theme, useTheme } from '../theme';
import { pl } from '../i18n/pl';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

// Trims a question to a one-line teaser for the daily-card tile.
function teaser(body: string): string {
  const max = 80;
  return body.length > max ? `${body.slice(0, max).trimEnd()}…` : body;
}

// Home hub (P4, scope 3.9): daily card + session + memories tiles. Laid out airy
// so a future ranking tab has room. The daily card tile is visually distinct
// (gold) from the session tile.
export function HomeScreen({ navigation }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const {
    data: daily,
    error: dailyError,
    isLoading: dailyLoading,
    isError: dailyFailed,
    isFetching: dailyFetching,
    refetch: refetchDaily,
  } = useDailyCard();
  // A 404 / empty ritual seed leaves `ritual` undefined; the tile is simply
  // hidden (quiet empty state), the rest of the home screen is unaffected.
  //
  // Deliberately unchanged in P11: a network failure hides this tile the same
  // way an unseeded ritual does. The two are indistinguishable here, and that
  // is accepted rather than overlooked - when the whole connection is down the
  // daily card above is already saying so, and a second outage notice under it
  // would be noise. The case this does not cover is the ritual endpoint failing
  // on its own, where the couple sees nothing at all and no explanation.
  const { data: ritual } = useWeeklyRitual();

  // Push scheduling is driven by the daily card state; gated until it resolves.
  useLocalPushSchedule({
    dailyPushHour: daily?.dailyPushHour ?? 20,
    answeredToday: daily?.answeredToday ?? false,
    enabled: !!daily,
  });

  useLayoutEffect(() => {
    navigation.setOptions({
      headerStyle: { backgroundColor: theme.colors.bg.base },
      headerTintColor: theme.colors.gold.primary,
      headerShadowVisible: false,
      headerTitleAlign: 'center',
      // eslint-disable-next-line react/no-unstable-nested-components
      headerTitle: () => (
        <Text style={styles.headerTitle}>{pl.home.headerTitle}</Text>
      ),
      // eslint-disable-next-line react/no-unstable-nested-components
      headerRight: () => (
        <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
          <Text style={styles.headerButton}>{pl.profile.headerButton}</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, styles, theme]);

  const streakLabel = daily
    ? daily.streakCurrent > 0
      ? pl.home.streak(daily.streakCurrent)
      : pl.home.streakNone
    : '';

  return (
    <ScreenContainer testID="home-screen">
      <GlowBackground size={320} intensity={0.3} style={styles.glow} />

      {/*
        The daily card is the one tile on this hub with something to fetch, and
        it is the first thing anyone sees after signing in - so it says which of
        the three things is happening rather than showing an ellipsis for all of
        them. It used to render "…" for a pending request and for a failed one
        alike, with the footer underneath confidently claiming the couple had
        not answered today and had no streak.

        Only pressable once there is a card: tapping through to a screen that
        has nothing to show is not a way out of either state, and in the failed
        one the retry is.
      */}
      <Card
        variant="gold"
        testID="home-daily-card"
        onPress={daily ? () => navigation.navigate('DailyCard') : undefined}
        style={styles.tile}>
        <SectionLabel>{pl.home.dailyCardTitle}</SectionLabel>

        {dailyLoading ? (
          <ActivityIndicator
            testID="home-daily-loading"
            color={theme.colors.gold.primary}
            style={styles.dailyLoading}
          />
        ) : dailyFailed ? (
          <ErrorState
            testID="home-daily-error"
            message={parseApiError(dailyError, pl.dailyCard.loadError).topLevel}
            onRetry={() => refetchDaily()}
            retrying={dailyFetching}
            style={styles.dailyError}
          />
        ) : (
          <>
            <Text style={styles.dailyQuestion}>
              {daily ? teaser(daily.question.body) : '…'}
            </Text>
            <View style={styles.dailyFooter}>
              <Badge testID="home-daily-status">
                {daily?.answeredToday
                  ? pl.home.dailyCardDone
                  : pl.home.dailyCardTodo}
              </Badge>
              <Text testID="home-streak" style={styles.streak}>
                {streakLabel}
              </Text>
            </View>
          </>
        )}
      </Card>

      {ritual && (
        <Card
          testID="home-ritual"
          onPress={() => navigation.navigate('Ritual')}
          style={styles.tile}>
          <Text style={styles.ritualLabel}>{pl.home.ritualLabel}</Text>
          <Text style={styles.tileTitle}>{ritual.ritual.title}</Text>
          <Text style={styles.tileHint}>{teaser(ritual.ritual.body)}</Text>
          <Text testID="home-ritual-day" style={styles.ritualDay}>
            {pl.ritual.day(ritual.dayOfWeek)}
          </Text>
        </Card>
      )}

      {/* S3c: the couple's session IS the local game. The server-side session
          (CategoryPicker -> QuestionScreen) is no longer reachable from here —
          one game, one way in, so a couple is never asked which of two things
          called "sesja pytań" they meant. Those screens stay in the codebase,
          dormant, for the solo mode of etap II; BootstrapScreen still resumes a
          server session that is already open. */}
      <Card
        testID="home-local-game"
        onPress={() => navigation.navigate('LocalGameSetup')}
        style={styles.tile}>
        <Text style={styles.tileTitle}>{pl.home.localGameTitle}</Text>
        <Text style={styles.tileHint}>{pl.home.localGameHint}</Text>
      </Card>

      {/* Directly under the local game on purpose: the two modes are the same
          idea seen twice, one playable today and one announced. Keeping it on
          Home (rather than waiting for etap II) is the whole point — testers
          should see the path exists and is coming, not wonder whether playing
          apart was ever planned. */}
      <Card
        testID="home-remote-game"
        onPress={() =>
          navigation.navigate('ComingSoon', {
            title: pl.comingSoon.remoteGameTitle,
            body: pl.comingSoon.remoteGameBody,
          })
        }
        style={styles.tile}>
        <View style={styles.tileHeader}>
          <Text style={styles.tileTitle}>{pl.home.remoteGameTitle}</Text>
          <Badge testID="home-remote-game-badge">{pl.comingSoon.badge}</Badge>
        </View>
        <Text style={styles.tileHint}>{pl.home.remoteGameHint}</Text>
      </Card>

      <Card
        testID="home-deck"
        onPress={() => navigation.navigate('Deck')}
        style={styles.tile}>
        <Text style={styles.tileTitle}>{pl.home.deckTitle}</Text>
        <Text style={styles.tileHint}>{pl.home.deckHint}</Text>
      </Card>

      <Card
        testID="home-progress"
        onPress={() => navigation.navigate('ProgressMap')}
        style={styles.tile}>
        <Text style={styles.tileTitle}>{pl.home.progressTitle}</Text>
        <Text style={styles.tileHint}>{pl.home.progressHint}</Text>
      </Card>

      <Card
        testID="home-memories"
        onPress={() => navigation.navigate('Memories')}
        style={styles.tile}>
        <Text style={styles.tileTitle}>{pl.home.memoriesTitle}</Text>
        <Text style={styles.tileHint}>{pl.home.memoriesHint}</Text>
      </Card>
    </ScreenContainer>
  );
}

const createStyles = (theme: Theme) => {
  const { colors, typography, spacing } = theme;
  return StyleSheet.create({
    glow: {
      justifyContent: 'flex-start',
    },
    headerTitle: {
      fontFamily: typography.family.heading,
      fontSize: typography.size.h2,
      color: colors.text.primary,
    },
    headerButton: {
      fontFamily: typography.family.body,
      fontSize: typography.size.bodySm,
      color: colors.gold.primary,
    },
    tile: {
      marginBottom: spacing.lg,
    },
    // Keeps the tile roughly the height it will be once the card lands, so the
    // hub does not jump when it does.
    dailyLoading: {
      marginVertical: spacing.xxl,
    },
    dailyError: {
      paddingHorizontal: 0,
      paddingBottom: 0,
    },
    dailyQuestion: {
      fontFamily: typography.family.heading,
      fontSize: typography.size.h3,
      color: colors.text.primary,
      marginTop: spacing.sm,
      marginBottom: spacing.lg,
    },
    dailyFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    streak: {
      fontFamily: typography.family.body,
      fontSize: typography.size.bodySm,
      color: colors.gold.primary,
    },
    tileTitle: {
      fontFamily: typography.family.heading,
      fontSize: typography.size.h3,
      color: colors.text.primary,
    },
    // Title on the left, "Wkrótce" pill on the right, baselines aligned.
    tileHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    tileHint: {
      fontFamily: typography.family.body,
      fontSize: typography.size.bodySm,
      color: colors.text.secondary,
      marginTop: spacing.xs,
    },
    // Ritual tile accent is text.bright (near-white), not gold — the gold tile
    // is the daily card. Colour is the only distinction until the P11a style
    // guide (Wiktoria, task #36) may assign the ritual its own token.
    ritualLabel: {
      fontFamily: typography.family.heading,
      fontSize: typography.size.label,
      color: colors.text.bright,
      letterSpacing: typography.letterSpacing.label,
      textTransform: 'uppercase',
      marginBottom: spacing.sm,
    },
    ritualDay: {
      fontFamily: typography.family.body,
      fontSize: typography.size.bodySm,
      color: colors.text.bright,
      marginTop: spacing.md,
    },
  });
};
