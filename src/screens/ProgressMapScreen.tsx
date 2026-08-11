import React, { useLayoutEffect, useMemo } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useProgress } from '../queries/useProgress';
import { parseApiError } from '../api/errors';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { ProgressMap } from '../components/ProgressMap';
import { ScreenContainer } from '../components/ScreenContainer';
import { Theme, useTheme } from '../theme';
import { pl } from '../i18n/pl';

type Props = NativeStackScreenProps<RootStackParamList, 'ProgressMap'>;

// Horizontal breathing room around the map, matching the padding
// ScreenContainer gives every other screen.
const H_PADDING = 24;

// The couple's journey (P8): milestones unlocked by the number of cards played.
// Read-only — nothing here can move the couple's progress, only show it.
export function ProgressMapScreen({ navigation }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { width: windowWidth } = useWindowDimensions();

  const {
    data: progress,
    error,
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useProgress();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerStyle: { backgroundColor: theme.colors.bg.base },
      headerTintColor: theme.colors.gold.primary,
      headerShadowVisible: false,
      headerTitleAlign: 'center',
      // eslint-disable-next-line react/no-unstable-nested-components
      headerTitle: () => (
        <Text style={styles.headerTitle}>{pl.progress.headerTitle}</Text>
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

  // Error before empty, and this order is the point. The two used to share one
  // branch — `!progress` is true after a failed request as well — so a dropped
  // connection told the couple their journey had not started yet.
  if (isError) {
    return (
      <ScreenContainer
        testID="progress-screen"
        contentContainerStyle={styles.stateContent}>
        <ErrorState
          testID="progress-error"
          message={parseApiError(error, pl.progress.loadError).topLevel}
          onRetry={() => refetch()}
          retrying={isFetching}
        />
      </ScreenContainer>
    );
  }

  // No milestones seeded yet: the artwork would render an empty trail, which
  // reads as breakage rather than as "nothing here yet".
  if (!progress || progress.milestones.length === 0) {
    return (
      <ScreenContainer
        testID="progress-screen"
        contentContainerStyle={styles.stateContent}>
        <EmptyState testID="progress-empty" title={pl.progress.empty} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer testID="progress-screen">
      <ProgressMap progress={progress} width={windowWidth - H_PADDING * 2} />
    </ScreenContainer>
  );
}

const createStyles = (theme: Theme) => {
  const { colors, typography } = theme;
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
    // The room EmptyState/ErrorState need to sit centred; they bring their own
    // alignment but never claim the screen.
    stateContent: {
      flexGrow: 1,
      justifyContent: 'center',
    },
  });
};
