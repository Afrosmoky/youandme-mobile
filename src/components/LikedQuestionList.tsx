import React, { useMemo } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { useLikedQuestions } from '../queries/useLikedQuestions';
import { parseApiError } from '../api/errors';
import { Card } from './Card';
import { Badge } from './Badge';
import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';
import { SectionLabel } from './SectionLabel';
import { Theme, useTheme } from '../theme';
import { pl } from '../i18n/pl';

// The cards this couple hearted (3B) — the half of the P5 like that was missing
// until now, and the reason a tester clicked the heart several times and
// reasonably concluded it did nothing.
//
// A component rather than a screen because it is one tab of the history screen,
// and its own component rather than a branch inside that screen because it owns
// a whole query, a page loader and three states. CategoryList is the precedent
// for a list this screen-shaped living in components/.
//
// Read-only on purpose. Unhearting from here would need either a second write
// path or generalising useLikeQuestion beyond the daily card's cache, and the
// list on its own is what closes the hole.
export function LikedQuestionList() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const {
    data,
    error,
    isLoading,
    isError,
    isRefetching,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    refetch,
  } = useLikedQuestions();

  const questions = data?.pages.flatMap(page => page.questions) ?? [];
  const errorMessage = parseApiError(error, pl.memories.likedLoadError).topLevel;

  const onEndReached = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={theme.colors.gold.primary} />
      </View>
    );
  }

  return (
    <FlatList
      testID="liked-questions-list"
      style={styles.list}
      data={questions}
      keyExtractor={item => item.ulid}
      contentContainerStyle={
        questions.length === 0 ? styles.emptyContent : styles.listContent
      }
      refreshing={isRefetching && !isFetchingNextPage}
      onRefresh={() => refetch()}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      ListFooterComponent={
        // Same split as the memories list: a page that fails with cards already
        // on screen gets a retry in the footer and keeps the couple's scroll
        // position; a first load that fails has nothing to protect and goes
        // through ListEmptyComponent.
        isFetchingNextPage ? (
          <ActivityIndicator
            style={styles.footer}
            color={theme.colors.gold.primary}
          />
        ) : isError && questions.length > 0 ? (
          <ErrorState
            testID="liked-questions-page-error"
            message={errorMessage}
            onRetry={() => fetchNextPage()}
            style={styles.footer}
          />
        ) : null
      }
      ListEmptyComponent={
        // "It broke" and "there is nothing here" must not look the same — the
        // difference is between telling a couple to tap a heart and hiding a
        // dead connection behind an invitation.
        isError ? (
          <ErrorState
            testID="liked-questions-error"
            message={errorMessage}
            onRetry={() => refetch()}
            retrying={isRefetching}
          />
        ) : (
          <EmptyState
            testID="liked-questions-empty"
            title={pl.memories.likedEmpty}
          />
        )
      }
      renderItem={({ item }) => (
        <Card testID={`liked-question-${item.ulid}`} style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.categorySlot}>
              {item.category && <SectionLabel>{item.category.name}</SectionLabel>}
            </View>
            {/* Same badge as in play, and it means the same thing: a card bought
                with a credit. NOT a padlock. The backend drops hearted cards
                this couple has not unlocked before it pages, so everything that
                reaches this list is a card they can open — there is no withheld
                state to render, and the free cards get no badge because a badge
                on everything says nothing. */}
            {item.isLocked && (
              <Badge testID={`liked-question-unlocked-${item.ulid}`}>
                {pl.question.unlockedBadge}
              </Badge>
            )}
          </View>

          <Text testID={`liked-question-body-${item.ulid}`} style={styles.body}>
            {item.body}
          </Text>
        </Card>
      )}
    />
  );
}

const createStyles = (theme: Theme) => {
  const { colors, typography, spacing } = theme;
  return StyleSheet.create({
    list: {
      backgroundColor: colors.bg.base,
    },
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.bg.base,
    },
    listContent: {
      padding: spacing.lg,
    },
    emptyContent: {
      flexGrow: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.xxl,
    },
    card: {
      marginBottom: spacing.md,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    categorySlot: {
      flex: 1,
    },
    // The question is the point of this card, so it reads as the primary text —
    // the mirror of the memories list, where the question is secondary because
    // the answers are the point there.
    body: {
      fontFamily: typography.family.body,
      fontSize: typography.size.body,
      color: colors.text.primary,
    },
    footer: {
      paddingVertical: spacing.lg,
    },
  });
};
