import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useRewards } from '../queries/useRewards';
import { useRedeemCode } from '../queries/useRedeemCode';
import { parseApiError } from '../api/errors';
import { Card } from '../components/Card';
import { GoldButton } from '../components/GoldButton';
import { ScreenContainer } from '../components/ScreenContainer';
import { SectionLabel } from '../components/SectionLabel';
import { TextField } from '../components/TextField';
import { Theme, useTheme } from '../theme';
import { pl } from '../i18n/pl';

type Props = NativeStackScreenProps<RootStackParamList, 'Rewards'>;

// "Wasze nagrody" (P7): the first screen that shows the credit balance, which
// had been growing invisibly since P5. Also hosts redeeming a promo code — a
// rare, one-off action that does not warrant a route of its own. The ad button
// moves here from ProfileScreen in slice 3.
export function RewardsScreen({ navigation }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const { data: rewards, isLoading, isError } = useRewards();
  const { mutate: redeem, isPending: redeeming } = useRedeemCode();

  // The code being typed is client state; only the result of sending it is
  // server state.
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);

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

  const onCodeChange = (value: string) => {
    setCode(value);
    setCodeError(null);
  };

  const onRedeem = () => {
    const trimmed = code.trim();
    if (trimmed.length === 0) {
      setCodeError(pl.rewards.codeEmpty);
      return;
    }
    setCodeError(null);
    redeem(trimmed, {
      onSuccess: () => {
        setCode('');
        Alert.alert(pl.appTitle, pl.rewards.codeRedeemed);
      },
      onError: err => {
        // The server distinguishes a bad/expired/used code (422) from one this
        // couple already redeemed (409) and says so in its own words. Showing
        // its message beats matching on it — the same reasoning that keeps the
        // unlock error message-agnostic.
        const parsed = parseApiError(err, pl.rewards.codeError);
        setCodeError(parsed.fields.code ?? parsed.topLevel);
      },
    });
  };

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

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{pl.rewards.codeTitle}</Text>

        <TextField
          label={pl.rewards.codeLabel}
          testID="rewards-code"
          value={code}
          onChangeText={onCodeChange}
          error={codeError ?? undefined}
          placeholder={pl.rewards.codePlaceholder}
          // Codes are printed in caps and compared case-insensitively
          // server-side (citext), but autocorrect mangling them is a real risk.
          autoCapitalize="characters"
        />

        <GoldButton
          testID="rewards-code-submit"
          title={pl.rewards.codeSubmit}
          onPress={onRedeem}
          loading={redeeming}
          disabled={redeeming}
        />
      </View>
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
    section: {
      marginTop: spacing.xxl,
      paddingTop: spacing.xl,
      borderTopWidth: 1,
      borderTopColor: colors.border.subtle,
    },
    sectionTitle: {
      fontFamily: typography.family.heading,
      fontSize: typography.size.h3,
      color: colors.text.primary,
      marginBottom: spacing.lg,
    },
  });
};
