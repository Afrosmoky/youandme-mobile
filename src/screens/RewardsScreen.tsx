import React, { useEffect, useLayoutEffect, useMemo } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useRewards } from '../queries/useRewards';
import { Card } from '../components/Card';
import { ScreenContainer } from '../components/ScreenContainer';
import { SectionLabel } from '../components/SectionLabel';
import { Theme, useTheme } from '../theme';
import { pl } from '../i18n/pl';

type Props = NativeStackScreenProps<RootStackParamList, 'Rewards'>;

// "Wasze nagrody" (P7): the first screen that shows the credit balance, which
// had been growing invisibly since P5. Slice 1 is read-only — the redeem field
// lands in slice 2, and the ad button moves here from ProfileScreen in slice 3.
export function RewardsScreen({ navigation }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const { data: rewards, isLoading, isError } = useRewards();

  useEffect(() => {
    if (isError) {
      Alert.alert(pl.appTitle, pl.rewards.loadError);
    }
  }, [isError]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerStyle: { backgroundColor: theme.colors.bg.base },
      headerTintColor: theme.colors.gold.primary,
      headerShadowVisible: false,
      headerTitleAlign: 'center',
      // eslint-disable-next-line react/no-unstable-nested-components
      headerTitle: () => (
        <Text style={styles.headerTitle}>{pl.rewards.headerTitle}</Text>
      ),
    });
  }, [navigation, styles, theme]);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={theme.colors.gold.primary} />
      </View>
    );
  }

  return (
    <ScreenContainer testID="rewards-screen">
      <Card variant="gold" testID="rewards-balance" style={styles.balanceCard}>
        <SectionLabel>{pl.rewards.creditsLabel}</SectionLabel>
        <Text testID="rewards-credits" style={styles.credits}>
          {rewards ? String(rewards.credits) : '—'}
        </Text>
        <Text style={styles.hint}>{pl.rewards.creditsHint}</Text>
      </Card>

      {rewards && (
        <Text testID="rewards-ads-today" style={styles.adsToday}>
          {pl.rewards.adsToday(rewards.ads.remainingToday, rewards.ads.dailyCap)}
        </Text>
      )}
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
    headerTitle: {
      fontFamily: typography.family.heading,
      fontSize: typography.size.h2,
      color: colors.text.primary,
    },
    balanceCard: {
      marginBottom: spacing.xl,
    },
    credits: {
      fontFamily: typography.family.heading,
      fontSize: typography.size.h1,
      color: colors.gold.primary,
      marginTop: spacing.sm,
    },
    hint: {
      fontFamily: typography.family.body,
      fontSize: typography.size.bodySm,
      color: colors.text.secondary,
      marginTop: spacing.sm,
    },
    adsToday: {
      fontFamily: typography.family.body,
      fontSize: typography.size.bodySm,
      color: colors.text.muted,
    },
  });
};
