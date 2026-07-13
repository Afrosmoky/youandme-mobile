import React, { useLayoutEffect, useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useWeeklyRitual } from '../queries/useWeeklyRitual';
import { ScreenContainer } from '../components/ScreenContainer';
import { Theme, useTheme } from '../theme';
import { pl } from '../i18n/pl';

type Props = NativeStackScreenProps<RootStackParamList, 'Ritual'>;

const RITUAL_DAYS = 7;

// Read-only ritual detail: title, body, a 7-dot day counter. No action — the
// light ritual has no completion status (that is stage II).
export function RitualScreen({ navigation }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { data: ritual, isLoading } = useWeeklyRitual();

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
  });
};
