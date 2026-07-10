import React, { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import axios from 'axios';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { startSession } from '../api/sessions';
import { parseApiError } from '../api/errors';
import { useCategories } from '../queries/useCategories';
import { Card } from '../components/Card';
import { Theme, useTheme } from '../theme';
import { pl } from '../i18n/pl';

type Props = NativeStackScreenProps<RootStackParamList, 'CategoryPicker'>;

export function CategoryPickerScreen({ navigation }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const {
    data: categories,
    isLoading,
    isError,
    error: categoriesError,
  } = useCategories();
  // Session-start errors are separate from the categories query error; both
  // surface in the same banner, with the session error taking precedence.
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerStyle: { backgroundColor: theme.colors.bg.base },
      headerTintColor: theme.colors.gold.primary,
      headerShadowVisible: false,
      // The screen title lives in the body as an h1 (per mockup).
      headerTitle: () => null,
      // headerRight is a navigation render prop, not a remounted subtree.
      // eslint-disable-next-line react/no-unstable-nested-components
      headerRight: () => (
        <View style={styles.headerButtons}>
          <TouchableOpacity
            testID="category-picker-memories"
            onPress={() => navigation.navigate('Memories')}>
            <Text style={styles.headerButton}>
              {pl.categoryPicker.memoriesButton}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
            <Text style={styles.headerButton}>{pl.profile.headerButton}</Text>
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, styles, theme]);

  // Starts a session for the given category (null = mix mode), then opens the
  // Question screen. A 409 means the couple already has an active session — we
  // resume it by navigating without params (Question fetches it itself).
  const start = useCallback(
    async (slug: string | null) => {
      setSessionError(null);
      setStarting(true);
      try {
        const session = await startSession(slug);
        navigation.navigate('Question', { sessionUlid: session.ulid });
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 409) {
          navigation.navigate('Question');
          return;
        }
        setSessionError(
          parseApiError(err, pl.categoryPicker.startSessionError).topLevel,
        );
      } finally {
        setStarting(false);
      }
    },
    [navigation],
  );

  const error =
    sessionError ??
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
    <View testID="category-picker-screen" style={styles.container}>
      {error && (
        <Text testID="category-picker-error" style={styles.error}>
          {error}
        </Text>
      )}
      <FlatList
        data={categories ?? []}
        keyExtractor={item => item.slug}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <Text style={styles.title}>{pl.categoryPicker.title}</Text>
        }
        renderItem={({ item }) => (
          <Card
            testID={`category-${item.slug}`}
            onPress={() => start(item.slug)}
            disabled={starting}
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
            testID="category-picker-mix"
            variant="gold"
            onPress={() => start(null)}
            disabled={starting}
            style={styles.mixCard}>
            <Text style={styles.mixName}>{pl.categoryPicker.mixButton}</Text>
            <Text style={styles.mixHint}>{pl.categoryPicker.mixHint}</Text>
          </Card>
        }
      />
      {starting && (
        <ActivityIndicator
          style={styles.startingSpinner}
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
    startingSpinner: {
      paddingVertical: spacing.lg,
    },
    headerButtons: {
      flexDirection: 'row',
      gap: spacing.lg,
    },
    headerButton: {
      fontFamily: typography.family.body,
      fontSize: typography.size.bodySm,
      color: colors.gold.primary,
    },
  });
};
