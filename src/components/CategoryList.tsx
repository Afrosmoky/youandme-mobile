import React, { useMemo } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { parseApiError } from '../api/errors';
import { useCategories } from '../queries/useCategories';
import { Card } from './Card';
import { Theme, useTheme } from '../theme';
import { pl } from '../i18n/pl';

type Props = {
  // Called with the chosen category's slug and its name, both null for "mix".
  //
  // The name is here because this component is the one place that HAS it: a
  // caller that wants to show what was chosen (P10's setup, on its resume card)
  // would otherwise have to run the categories query a second time just to map
  // the slug back. Callers that do not care simply take one argument.
  onSelect: (slug: string | null, name: string | null) => void;
  // Blocks every tile while the caller is busy with the previous choice.
  disabled?: boolean;
  // Shown above the list. Omit on a screen that already has a heading.
  title?: string;
  // Rendered above the list — the caller's own error (starting a session,
  // fetching a deck), separate from this component's failure to load categories.
  error?: string | null;
  // Anything the screen needs between its title and the tiles — P10's setup puts
  // its players form here. Inside the list's header rather than above the list,
  // so the form and the tiles scroll as one under an open keyboard.
  header?: React.ReactNode;
  testID?: string;
};

// The category tiles plus the "mix" tile, extracted from CategoryPickerScreen
// in P10 so the local game's setup screen can offer the same choice without a
// second list drifting away from this one. What happens on a tap is the
// caller's business: the session picker starts a server session, the local game
// fetches a deck.
//
// testIDs are deliberately unprefixed (`category-<slug>`, `category-mix`): they
// name what the tile IS, and only one of these lists is ever on screen.
export function CategoryList({
  onSelect,
  disabled,
  title,
  error,
  header,
  testID,
}: Props) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const {
    data: categories,
    isLoading,
    isError,
    error: categoriesError,
  } = useCategories();

  // The caller's error wins: it is about what the user just did, while a stale
  // categories error is about what happened before they touched anything.
  const message =
    error ??
    (isError
      ? parseApiError(categoriesError, pl.categoryPicker.error).topLevel
      : null);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={theme.colors.gold.primary} />
        <Text style={styles.loadingText}>{pl.categoryPicker.loading}</Text>
      </View>
    );
  }

  return (
    <View testID={testID} style={styles.container}>
      {message && (
        <Text testID="category-list-error" style={styles.error}>
          {message}
        </Text>
      )}
      <FlatList
        data={categories ?? []}
        keyExtractor={item => item.slug}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            {title ? <Text style={styles.title}>{title}</Text> : null}
            {header}
          </>
        }
        renderItem={({ item }) => (
          <Card
            testID={`category-${item.slug}`}
            onPress={() => onSelect(item.slug, item.name)}
            disabled={disabled}
            style={styles.categoryCard}>
            <View style={styles.categoryRow}>
              <View style={styles.categoryText}>
                <Text style={styles.categoryName}>{item.name}</Text>
                {item.description && (
                  <Text style={styles.categoryDesc}>{item.description}</Text>
                )}
              </View>
              <Text style={styles.chevron}>›</Text>
            </View>
          </Card>
        )}
        ListFooterComponent={
          <Card
            testID="category-mix"
            variant="gold"
            onPress={() => onSelect(null, null)}
            disabled={disabled}
            style={styles.mixCard}>
            <Text style={styles.mixName}>{pl.categoryPicker.mixButton}</Text>
            <Text style={styles.mixHint}>{pl.categoryPicker.mixHint}</Text>
          </Card>
        }
      />
      {disabled && (
        <ActivityIndicator
          style={styles.busySpinner}
          color={theme.colors.gold.primary}
        />
      )}
    </View>
  );
}

const createStyles = (theme: Theme) => {
  const { colors, typography, spacing } = theme;
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg.base,
    },
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.bg.base,
    },
    loadingText: {
      marginTop: spacing.md,
      color: colors.text.muted,
      fontFamily: typography.family.body,
      fontSize: typography.size.bodySm,
    },
    listContent: {
      padding: spacing.lg,
    },
    title: {
      fontFamily: typography.family.heading,
      fontSize: typography.size.h1,
      color: colors.text.primary,
      marginBottom: spacing.xl,
    },
    error: {
      fontFamily: typography.family.body,
      fontSize: typography.size.bodySm,
      color: colors.burgundy.accent,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
    },
    categoryCard: {
      marginBottom: spacing.md,
    },
    categoryRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    categoryText: {
      flex: 1,
    },
    categoryName: {
      fontFamily: typography.family.heading,
      fontSize: typography.size.h3,
      color: colors.text.primary,
    },
    categoryDesc: {
      fontFamily: typography.family.body,
      fontSize: typography.size.bodySm,
      color: colors.text.secondary,
      marginTop: spacing.xs,
    },
    chevron: {
      fontFamily: typography.family.body,
      fontSize: typography.size.h3,
      color: colors.gold.deep,
      marginLeft: spacing.md,
    },
    mixCard: {
      marginTop: spacing.sm,
      paddingVertical: spacing.xl,
    },
    mixName: {
      fontFamily: typography.family.heading,
      fontSize: typography.size.h3,
      color: colors.gold.primary,
    },
    mixHint: {
      fontFamily: typography.family.body,
      fontSize: typography.size.bodySm,
      color: colors.text.secondary,
      marginTop: spacing.xs,
    },
    busySpinner: {
      paddingVertical: spacing.lg,
    },
  });
};
