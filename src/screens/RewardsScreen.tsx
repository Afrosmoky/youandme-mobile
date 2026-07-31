import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useRewards } from '../queries/useRewards';
import { useRedeemCode } from '../queries/useRedeemCode';
import { useWatchAdForCredit } from '../queries/useWatchAdForCredit';
import { parseApiError } from '../api/errors';
import { AD_REWARD_ENABLED } from '../config/features';
import { Card } from '../components/Card';
import { GoldButton } from '../components/GoldButton';
import { OutlineButton } from '../components/OutlineButton';
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

  const {
    data: rewards,
    isLoading,
    isError,
    isFetching: refreshingBalance,
    refetch: refetchRewards,
  } = useRewards();
  const { mutate: redeem, isPending: redeeming } = useRedeemCode();
  const { mutate: watchAd, isPending: watchingAd } = useWatchAdForCredit();

  // The code being typed is client state; only the result of sending it is
  // server state.
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);
  // "Credit on its way": purely a note to the user that a completed ad is
  // awaiting the server's callback. It is not server state — nothing can be
  // fetched to confirm it, which is exactly why it needs its own flag.
  const [creditPending, setCreditPending] = useState(false);

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

  const onWatchAd = () => {
    watchAd(undefined, {
      onSuccess: outcome => {
        if (outcome === 'earned') {
          // Nothing was granted here — the hook already asked for a fresh
          // balance, and this flag admits it may not reflect the credit yet.
          setCreditPending(true);
          return;
        }
        if (outcome === 'unavailable') {
          Alert.alert(pl.appTitle, pl.ads.unavailable);
        }
        // 'dismissed' — the user closed the ad early. Nothing to say.
      },
      onError: () => {
        // The nonce request failed, so no ad was shown and nothing is owed.
        Alert.alert(pl.appTitle, pl.ads.unavailable);
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

  // The daily cap is enforced server-side; this only avoids offering an ad we
  // already know will not be paid for.
  const adsLeft = rewards ? rewards.ads.remainingToday > 0 : true;

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

      {/*
        Hidden entirely until SSV is live (see AD_REWARD_ENABLED). With no
        public callback URL the server never learns the ad was watched, so the
        credit never arrives — showing the button would hand testers a path
        that looks like it works and silently does not.
      */}
      {AD_REWARD_ENABLED && (
        <View testID="rewards-ad-section" style={styles.section}>
          <Text style={styles.sectionTitle}>{pl.ads.sectionTitle}</Text>

          {creditPending && (
            <Text testID="rewards-credit-pending" style={styles.pending}>
              {pl.ads.pending}
            </Text>
          )}

          {adsLeft ? (
            <OutlineButton
              testID="rewards-watch-ad"
              title={pl.ads.watchButton}
              onPress={onWatchAd}
              loading={watchingAd}
              disabled={watchingAd}
            />
          ) : (
            <Text testID="rewards-ads-cap" style={styles.capReached}>
              {pl.ads.capReached}
            </Text>
          )}

          {creditPending && (
            <OutlineButton
              testID="rewards-refresh-balance"
              title={pl.ads.refreshButton}
              onPress={() => refetchRewards()}
              loading={refreshingBalance}
              disabled={refreshingBalance}
              style={styles.refreshButton}
            />
          )}
        </View>
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
    pending: {
      fontFamily: typography.family.body,
      fontSize: typography.size.bodySm,
      color: colors.gold.primary,
      marginBottom: spacing.md,
    },
    capReached: {
      fontFamily: typography.family.body,
      fontSize: typography.size.bodySm,
      color: colors.text.muted,
    },
    refreshButton: {
      marginTop: spacing.md,
    },
  });
};
