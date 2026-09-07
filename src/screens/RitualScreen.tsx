import React, { useLayoutEffect, useMemo } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useWeeklyRitual } from '../queries/useWeeklyRitual';
import { useSetRitualCompleted } from '../queries/useSetRitualCompleted';
import { isRitualWeekRolledOver } from '../api/rituals';
import { GoldButton } from '../components/GoldButton';
import { OutlineButton } from '../components/OutlineButton';
import { ScreenContainer } from '../components/ScreenContainer';
import { Theme, useTheme } from '../theme';
import { pl } from '../i18n/pl';

type Props = NativeStackScreenProps<RootStackParamList, 'Ritual'>;

const RITUAL_DAYS = 7;

// The ritual of the week: title, body, a 7-dot day counter, and since 3B one
// button saying the couple did it.
//
// That button carries nothing with it — no reward, no weekly streak, no effect
// on the map or the milestones. P4 cut completion status on purpose and stage II
// still owns its consequences; this is the mark alone, because Wiktoria asked
// for somewhere to put "done", not for a second progress system.
export function RitualScreen({ navigation }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { data: ritual, isLoading } = useWeeklyRitual();
  const { mutate: setCompleted, isPending } = useSetRitualCompleted();

  // The hook already sorts the cache out in both directions; what is left here
  // is purely what the couple sees. A rolled-over week says nothing at all — the
  // ritual on screen is being replaced with the current one, which is an answer,
  // not an error.
  const onToggleCompleted = (completed: boolean) =>
    setCompleted(completed, {
      onError: err => {
        if (!isRitualWeekRolledOver(err)) {
          Alert.alert(pl.appTitle, pl.ritual.completeError);
        }
      },
    });

  useLayoutEffect(() => {
    navigation.setOptions({
      headerStyle: { backgroundColor: theme.colors.bg.base },
      headerTintColor: theme.colors.gold.primary,
      headerShadowVisible: false,
      headerTitleAlign: 'center',
      // eslint-disable-next-line react/no-unstable-nested-components
      headerTitle: () => (
        <Text style={styles.headerTitle}>{pl.ritual.headerTitle}</Text>
      ),
    });
  }, [navigation, styles, theme]);

  if (isLoading || !ritual) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={theme.colors.gold.primary} />
      </View>
    );
  }

  const dots = Array.from({ length: RITUAL_DAYS }, (_, i) => i < ritual.dayOfWeek);

  return (
    <ScreenContainer testID="ritual-screen">
      <Text testID="ritual-title" style={styles.title}>
        {ritual.ritual.title}
      </Text>

      <View testID="ritual-day-counter" style={styles.counter}>
        <View style={styles.dots}>
          {dots.map((filled, i) => (
            <View
              key={i}
              style={[styles.dot, filled ? styles.dotFilled : styles.dotEmpty]}
            />
          ))}
        </View>
        <Text style={styles.dayText}>{pl.ritual.day(ritual.dayOfWeek)}</Text>
      </View>

      <Text testID="ritual-body" style={styles.body}>
        {ritual.ritual.body}
      </Text>

      {/* One button, two states, built from the two buttons the app already has
          rather than a new variant: filled gold to invite the tap, outline once
          it has been given, which reads as "done" without inventing a token. */}
      {ritual.completed ? (
        <OutlineButton
          testID="ritual-completed"
          title={pl.ritual.completedButton}
          onPress={() => onToggleCompleted(false)}
          loading={isPending}
          style={styles.completeButton}
        />
      ) : (
        <GoldButton
          testID="ritual-complete"
          title={pl.ritual.completeButton}
          onPress={() => onToggleCompleted(true)}
          loading={isPending}
          style={styles.completeButton}
        />
      )}
    </ScreenContainer>
  );
}

const createStyles = (theme: Theme) => {
  const { colors, typography, spacing, radius } = theme;
  return StyleSheet.create({
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.bg.base,
    },
    headerTitle: {
      fontFamily: typography.family.heading,
      fontSize: typography.size.h2,
      color: colors.text.primary,
    },
    title: {
      fontFamily: typography.family.heading,
      fontSize: typography.size.h2,
      color: colors.text.primary,
      marginBottom: spacing.lg,
    },
    counter: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.xxl,
    },
    dots: {
      flexDirection: 'row',
      marginRight: spacing.md,
    },
    dot: {
      width: 10,
      height: 10,
      borderRadius: radius.pill,
      marginRight: spacing.sm,
    },
    dotFilled: {
      backgroundColor: colors.text.bright,
    },
    dotEmpty: {
      backgroundColor: colors.border.subtle,
    },
    dayText: {
      fontFamily: typography.family.body,
      fontSize: typography.size.bodySm,
      color: colors.text.bright,
    },
    body: {
      fontFamily: typography.family.body,
      fontSize: typography.size.body,
      color: colors.text.primary,
      lineHeight: typography.size.body * 1.5,
    },
    completeButton: {
      marginTop: spacing.xxl,
    },
  });
};
