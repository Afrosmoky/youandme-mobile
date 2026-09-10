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
import { ScreenTitle } from '../components/ScreenTitle';
import { ScreenContainer } from '../components/ScreenContainer';
import { GlowBackground } from '../components/GlowBackground';
import { Card } from '../components/Card';
import { GoldButton } from '../components/GoldButton';
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
        <ScreenTitle>{pl.home.headerTitle}</ScreenTitle>
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

      {/* Playing is what this screen is for, so it is the one thing on it that
          looks like an action rather than a surface. A solid button next to the
          daily card's gold TINT reads as two different kinds of object, which is
          the point — one is a door, the other is a thing to look at.

          S3c: the couple's session IS the local game. The server-side session
          (CategoryPicker -> QuestionScreen) is no longer reachable from here —
          one game, one way in, so a couple is never asked which of two things
          called "sesja pytań" they meant. Those screens stay in the codebase,
          dormant, for the solo mode of etap II; BootstrapScreen still resumes a
          server session that is already open. */}
      <GoldButton
        testID="home-local-game"
        title={pl.home.localGameTitle}
        onPress={() => navigation.navigate('LocalGameSetup')}
      />
      <Text style={styles.playHint}>{pl.home.localGameHint}</Text>

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
          <SectionLabel tone="bright" style={styles.ritualLabel}>
            {pl.home.ritualLabel}
          </SectionLabel>
          <Text style={styles.tileTitle}>{ritual.ritual.title}</Text>
          <Text style={styles.tileHint}>{teaser(ritual.ritual.body)}</Text>
          <Text testID="home-ritual-day" style={styles.ritualDay}>
            {pl.ritual.day(ritual.dayOfWeek)}
          </Text>
        </Card>
      )}

      {/* Everything a couple can look at, as small tiles in two columns.

          The order is the web's reading order — the one big action first, the
          rest smaller underneath — but the FORM is ours and this is the part
          worth being honest about: the web hub has no such grid. It is a landing
          page for people who are not signed in, and the two-column grid of large
          buttons lives on its deck-selection screen. So this is an
          interpretation of the hierarchy, not a port of a layout.

          They stay tiles rather than becoming buttons because ours carry state
          that buttons cannot: the remote game shows whether it is announced or
          available, and every one of them has a hint that says what it is for. */}
      <View style={styles.grid}>
        <Card
          testID="home-memories"
          onPress={() => navigation.navigate('Memories')}
          style={styles.gridTile}>
          <Text style={styles.tileTitle}>{pl.home.memoriesTitle}</Text>
          <Text style={styles.tileHint}>{pl.home.memoriesHint}</Text>
        </Card>

        <Card
          testID="home-deck"
          onPress={() => navigation.navigate('Deck')}
          style={styles.gridTile}>
          <Text style={styles.tileTitle}>{pl.home.deckTitle}</Text>
          <Text style={styles.tileHint}>{pl.home.deckHint}</Text>
        </Card>

        <Card
          testID="home-progress"
          onPress={() => navigation.navigate('ProgressMap')}
          style={styles.gridTile}>
          <Text style={styles.tileTitle}>{pl.home.progressTitle}</Text>
          <Text style={styles.tileHint}>{pl.home.progressHint}</Text>
        </Card>

        {/* Last, because it is the one thing here that cannot be opened yet.
            Keeping it on Home at all is the point — testers should see the path
            exists and is coming, not wonder whether playing apart was planned. */}
        <Card
          testID="home-remote-game"
          onPress={() =>
            navigation.navigate('ComingSoon', {
              title: pl.comingSoon.remoteGameTitle,
              body: pl.comingSoon.remoteGameBody,
            })
          }
          style={styles.gridTile}>
          <View style={styles.tileHeader}>
            <Text style={styles.tileTitle}>{pl.home.remoteGameTitle}</Text>
            <Badge testID="home-remote-game-badge">{pl.comingSoon.badge}</Badge>
          </View>
          <Text style={styles.tileHint}>{pl.home.remoteGameHint}</Text>
        </Card>
      </View>

    </ScreenContainer>
  );
}

const createStyles = (theme: Theme) => {
  const { colors, typography, spacing } = theme;
  return StyleSheet.create({
    glow: {
      justifyContent: 'flex-start',
    },
    headerButton: {
      fontFamily: typography.family.body,
      fontSize: typography.size.bodySm,
      color: colors.gold.primary,
    },
    tile: {
      marginBottom: spacing.lg,
    },
    // The line under the primary action, explaining what it opens. Small and
    // dim: the button already said the important half.
    playHint: {
      fontFamily: typography.family.body,
      fontSize: typography.size.bodySm,
      color: colors.text.secondary,
      textAlign: 'center',
      marginTop: spacing.sm,
      marginBottom: spacing.xl,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
    // Just under half, so two sit side by side with a gap between them without
    // depending on a `gap` value RN has only supported recently.
    gridTile: {
      width: '48%',
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
    // Only the gap is left here. The rest of what this style used to hold was a
    // hand-copy of SectionLabel differing in one colour, and it was the last
    // place in the app where caps lived outside that component — now the `bright`
    // tone (see SectionLabel: the gold tile is the daily card, so the ritual is
    // deliberately near-white).
    ritualLabel: {
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
