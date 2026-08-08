import React, { useLayoutEffect, useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
  const { data: daily } = useDailyCard();
  // A 404 / empty ritual seed leaves `ritual` undefined; the tile is simply
  // hidden (quiet empty state), the rest of the home screen is unaffected.
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

      <Card
        variant="gold"
        testID="home-daily-card"
        onPress={() => navigation.navigate('DailyCard')}
        style={styles.tile}>
        <SectionLabel>{pl.home.dailyCardTitle}</SectionLabel>
        <Text style={styles.dailyQuestion}>
          {daily ? teaser(daily.question.body) : '…'}
        </Text>
        <View style={styles.dailyFooter}>
          <Badge testID="home-daily-status">
            {daily?.answeredToday ? pl.home.dailyCardDone : pl.home.dailyCardTodo}
          </Badge>
          <Text testID="home-streak" style={styles.streak}>
            {streakLabel}
          </Text>
        </View>
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

      <Card
        testID="home-session"
        onPress={() => navigation.navigate('CategoryPicker')}
        style={styles.tile}>
        <Text style={styles.tileTitle}>{pl.home.sessionTitle}</Text>
        <Text style={styles.tileHint}>{pl.home.sessionHint}</Text>
      </Card>

      <Card
        testID="home-local-game"
        onPress={() => navigation.navigate('LocalGameSetup')}
        style={styles.tile}>
        <Text style={styles.tileTitle}>{pl.home.localGameTitle}</Text>
        <Text style={styles.tileHint}>{pl.home.localGameHint}</Text>
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
