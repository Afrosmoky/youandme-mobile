import React, { useLayoutEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useDeck } from '../queries/useDeck';
import { useRewards } from '../queries/useRewards';
import { useUnlockQuestion } from '../queries/useUnlockQuestion';
import { parseApiError } from '../api/errors';
import { Badge } from '../components/Badge';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { OutlineButton } from '../components/OutlineButton';
import { SectionLabel } from '../components/SectionLabel';
import { Theme, useTheme } from '../theme';
import { pl } from '../i18n/pl';

type Props = NativeStackScreenProps<RootStackParamList, 'Deck'>;

// The closed deck (P7). Cards carry no question text — a locked card must not
// reveal what you would be paying for, and an unlocked one still reads its body
// only when the session draws it. So each row shows category and state, and the
// locked ones offer "unlock (1 credit)".
export function DeckScreen({ navigation }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const {
    data: deck,
    error,
    isLoading,
    isError,
    isRefetching,
    refetch,
  } = useDeck();
  const { data: rewards } = useRewards();
  const { mutate: unlock } = useUnlockQuestion();

  // Which card is mid-unlock. Per-card rather than a single flag so one pending
  // request only blocks its own row, and client state (useState), not server
  // state — nothing outside this screen cares.
  const [unlockingUlid, setUnlockingUlid] = useState<string | null>(null);

  // Read off the failure rather than fixed: `deck.loadError` is the fallback
  // now, so a dropped connection says so instead of blaming the deck.
  const errorMessage = parseApiError(error, pl.deck.loadError).topLevel;

  useLayoutEffect(() => {
    navigation.setOptions({
      headerStyle: { backgroundColor: theme.colors.bg.base },
      headerTintColor: theme.colors.gold.primary,
      headerShadowVisible: false,
      headerTitleAlign: 'center',
      // eslint-disable-next-line react/no-unstable-nested-components
      headerTitle: () => (
        <Text style={styles.headerTitle}>{pl.deck.headerTitle}</Text>
      ),
      // headerRight is a navigation render prop, not a remounted subtree.
      // eslint-disable-next-line react/no-unstable-nested-components
      headerRight: () => (
        <TouchableOpacity
          testID="deck-rewards-link"
          onPress={() => navigation.navigate('Rewards')}>
          <Text style={styles.headerButton}>{pl.rewards.headerTitle}</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, styles, theme]);

  const onUnlock = (ulid: string) => {
    setUnlockingUlid(ulid);
    unlock(ulid, {
      onSettled: () => setUnlockingUlid(null),
      onError: err => {
        // 422 covers both "not enough credits" and "question is not locked".
        // The server's own message is shown rather than matched on — the same
        // reasoning that keeps the daily card's 409 handling message-agnostic.
        Alert.alert(pl.appTitle, parseApiError(err, pl.deck.unlockError).topLevel);
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

  const cards = deck?.cards ?? [];
  // Credits gate the button, so an unknown balance (rewards not loaded yet)
  // must not look like zero — that would disable every unlock silently.
  const credits = rewards?.credits;
  const canAfford = credits === undefined || credits > 0;

  return (
    <FlatList
      testID="deck-list"
      style={styles.list}
      data={cards}
      keyExtractor={item => item.ulid}
      contentContainerStyle={
        cards.length === 0 ? styles.emptyContent : styles.listContent
      }
      refreshing={isRefetching}
      onRefresh={() => refetch()}
      ListHeaderComponent={
        deck ? (
          <View style={styles.summary}>
            <Text testID="deck-progress" style={styles.progress}>
              {pl.deck.progress(deck.unlockedCount, deck.lockedTotal)}
            </Text>
            {credits !== undefined && (
              <Text testID="deck-credits" style={styles.credits}>
                {`${pl.rewards.creditsLabel}: ${credits}`}
              </Text>
            )}
            {deck.complete && (
              <Text testID="deck-complete" style={styles.complete}>
                {pl.deck.complete}
              </Text>
            )}
          </View>
        ) : null
      }
      ListEmptyComponent={
        isError ? (
          <ErrorState
            testID="deck-error"
            message={errorMessage}
            onRetry={() => refetch()}
            retrying={isRefetching}
          />
        ) : (
          <EmptyState testID="deck-empty" title={pl.deck.empty} />
        )
      }
      renderItem={({ item }) => (
        <Card testID={`deck-card-${item.ulid}`} style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.categorySlot}>
              <SectionLabel>
                {item.category ? item.category.name : pl.deck.noCategory}
              </SectionLabel>
            </View>
            <Badge testID={`deck-state-${item.ulid}`}>
              {item.unlocked ? pl.deck.unlockedBadge : pl.deck.lockedBadge}
            </Badge>
          </View>

          <Text style={styles.hiddenBody}>{pl.deck.hiddenBody}</Text>

          {!item.unlocked && (
            <OutlineButton
              testID={`deck-unlock-${item.ulid}`}
              title={pl.deck.unlockButton}
              onPress={() => onUnlock(item.ulid)}
              loading={unlockingUlid === item.ulid}
              disabled={!canAfford || unlockingUlid !== null}
              style={styles.unlockButton}
            />
          )}
        </Card>
      )}
    />
  );
}

const createStyles = (theme: Theme) => {
  const { colors, typography, spacing } = theme;
  return StyleSheet.create({
    list: {
      flex: 1,
      backgroundColor: colors.bg.base,
    },
    listContent: {
      padding: spacing.xxl,
    },
    emptyContent: {
      flexGrow: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.xxl,
    },
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
    headerButton: {
      fontFamily: typography.family.body,
      fontSize: typography.size.bodySm,
      color: colors.gold.primary,
    },
    summary: {
      marginBottom: spacing.xl,
    },
    progress: {
      fontFamily: typography.family.heading,
      fontSize: typography.size.h3,
      color: colors.text.primary,
    },
    credits: {
      fontFamily: typography.family.body,
      fontSize: typography.size.body,
      color: colors.gold.primary,
      marginTop: spacing.xs,
    },
    complete: {
      fontFamily: typography.family.body,
      fontSize: typography.size.bodySm,
      color: colors.text.secondary,
      marginTop: spacing.sm,
    },
    card: {
      marginBottom: spacing.md,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.sm,
    },
    categorySlot: {
      flex: 1,
    },
    hiddenBody: {
      fontFamily: typography.family.bodyItalic,
      fontSize: typography.size.bodySm,
      color: colors.text.muted,
    },
    unlockButton: {
      marginTop: spacing.lg,
    },
  });
};
