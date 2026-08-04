import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react';
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
import { useMemories } from '../queries/useMemories';
import { useSetMemoryFavorite } from '../queries/useSetMemoryFavorite';
import { Card } from '../components/Card';
import { SectionLabel } from '../components/SectionLabel';
import { Badge } from '../components/Badge';
import { LikeHeart } from '../components/LikeHeart';
import { Theme, useTheme } from '../theme';
import { pl } from '../i18n/pl';

type Props = NativeStackScreenProps<RootStackParamList, 'Memories'>;

// Formats an ISO 8601 (UTC) timestamp into a Polish local-time label.
const dateFormatter = new Intl.DateTimeFormat('pl-PL', {
  dateStyle: 'long',
  timeStyle: 'short',
});

function formatDate(iso: string): string {
  return dateFormatter.format(new Date(iso));
}

// Maps the backend `origin` enum to a Polish label. Falls back to the raw value
// for any origin added server-side before mobile knows about it.
function originLabel(origin: string): string {
  switch (origin) {
    case 'session':
      return pl.memories.origin.session;
    case 'daily':
      return pl.memories.origin.daily;
    case 'challenge':
      return pl.memories.origin.challenge;
    default:
      return origin;
  }
}

export function MemoriesScreen({ navigation }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  // The filter is a query of its own, not a client-side filter: the server
  // narrows the same list, so paging keeps working past the first page.
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const {
    data,
    isLoading,
    isError,
    isRefetching,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    refetch,
  } = useMemories(favoritesOnly);
  const favorite = useSetMemoryFavorite();

  // Flatten the paginated cache into a single newest-first list for the FlatList.
  const memories = data?.pages.flatMap(page => page.memories) ?? [];

  // Preserve the previous behaviour: a failed initial load or page fetch shows
  // the same alert. TanStack owns the error state, so we mirror it into the
  // side-effect here. Fires once per transition into the error state (temporary
  // pattern for this slice; superseded when error UI lands in P11).
  useEffect(() => {
    if (isError) {
      Alert.alert(pl.appTitle, pl.memories.loadError);
    }
  }, [isError]);

  // Appends the next page when the user scrolls near the end. No-op while a
  // page is already loading or there is no further cursor.
  const onEndReached = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  // The heart writes through the cache optimistically (see useSetMemoryFavorite),
  // so the tap lands immediately; a failure rolls it back and says so.
  const onToggleFavorite = (ulid: string, isFavorite: boolean) => {
    if (favorite.isPending) {
      return;
    }
    favorite.mutate(
      { ulid, favorite: !isFavorite },
      { onError: () => Alert.alert(pl.appTitle, pl.memories.favoriteError) },
    );
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerStyle: { backgroundColor: theme.colors.bg.base },
      headerTintColor: theme.colors.gold.primary,
      headerShadowVisible: false,
      headerTitleAlign: 'left',
      // eslint-disable-next-line react/no-unstable-nested-components
      headerTitle: () => (
        <Text style={styles.headerTitle}>{pl.memories.headerTitle}</Text>
      ),
      // headerRight is a navigation render prop, not a remounted subtree.
      // eslint-disable-next-line react/no-unstable-nested-components
      headerRight: () => (
        <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
          <Text style={styles.headerButton}>{pl.profile.headerButton}</Text>
        </TouchableOpacity>
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
    <FlatList
      testID="memories-list"
      style={styles.list}
      data={memories}
      keyExtractor={item => item.ulid}
      contentContainerStyle={
        memories.length === 0 ? styles.emptyContent : styles.listContent
      }
      refreshing={isRefetching && !isFetchingNextPage}
      onRefresh={() => refetch()}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      ListFooterComponent={
        isFetchingNextPage ? (
          <ActivityIndicator
            style={styles.footer}
            color={theme.colors.gold.primary}
          />
        ) : null
      }
      ListHeaderComponent={
        <TouchableOpacity
          testID="memories-favorites-filter"
          style={styles.filter}
          onPress={() => setFavoritesOnly(current => !current)}>
          <Text
            style={[styles.filterText, favoritesOnly && styles.filterTextOn]}>
            {favoritesOnly ? pl.memories.allFilter : pl.memories.favoritesFilter}
          </Text>
        </TouchableOpacity>
      }
      ListEmptyComponent={
        <Text style={styles.emptyText}>
          {favoritesOnly ? pl.memories.emptyFavorites : pl.memories.empty}
        </Text>
      }
      renderItem={({ item }) => (
        <Card
          testID={`memory-item-${item.ulid}`}
          onPress={() =>
            navigation.navigate('MemoryCard', { memoryUlid: item.ulid })
          }
          style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.categorySlot}>
              {item.question.category && (
                <SectionLabel>{item.question.category.name}</SectionLabel>
              )}
            </View>
            <Badge testID={`memory-origin-${item.ulid}`}>
              {originLabel(item.origin)}
            </Badge>
            <LikeHeart
              testID={`memory-favorite-${item.ulid}`}
              liked={item.isFavorite}
              onToggle={() => onToggleFavorite(item.ulid, item.isFavorite)}
              disabled={favorite.isPending}
            />
          </View>

          <Text style={styles.question}>{item.question.body}</Text>

          <Text style={styles.playerLabel}>
            {pl.memories.player(item.playerAName)}
          </Text>
          <Text testID={`memory-player-a-${item.ulid}`} style={styles.answer}>
            {item.answerA}
          </Text>

          {item.answerB !== null && item.playerBName && (
            <>
              <Text style={styles.playerLabel}>
                {pl.memories.player(item.playerBName)}
              </Text>
              <Text
                testID={`memory-player-b-${item.ulid}`}
                style={styles.answer}>
                {item.answerB}
              </Text>
            </>
          )}

          <Text style={styles.date}>{formatDate(item.answeredAt)}</Text>
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
    emptyText: {
      fontFamily: typography.family.body,
      fontSize: typography.size.body,
      color: colors.text.muted,
      textAlign: 'center',
    },
    card: {
      marginBottom: spacing.md,
    },
    // Provisional filter control pending the style guide (#36): a gold text
    // toggle over the list, not a segmented control we would have to restyle.
    filter: {
      alignSelf: 'flex-end',
      paddingBottom: spacing.md,
    },
    filterText: {
      fontFamily: typography.family.body,
      fontSize: typography.size.bodySm,
      color: colors.text.muted,
    },
    filterTextOn: {
      color: colors.gold.primary,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    categorySlot: {
      flex: 1,
    },
    question: {
      fontFamily: typography.family.body,
      fontSize: typography.size.bodySm,
      color: colors.text.secondary,
      marginBottom: spacing.md,
    },
    playerLabel: {
      fontFamily: typography.family.body,
      fontSize: typography.size.bodySm,
      color: colors.text.muted,
      marginBottom: spacing.xs,
    },
    answer: {
      fontFamily: typography.family.body,
      fontSize: typography.size.body,
      color: colors.text.primary,
      marginBottom: spacing.md,
    },
    date: {
      fontFamily: typography.family.body,
      fontSize: typography.size.micro,
      color: colors.text.muted,
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
    footer: {
      paddingVertical: spacing.lg,
    },
  });
};
