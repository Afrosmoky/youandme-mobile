import React, { useEffect, useLayoutEffect, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useProgress } from '../queries/useProgress';
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

  const { data: progress, isLoading, isError } = useProgress();

  useEffect(() => {
    if (isError) {
      Alert.alert(pl.appTitle, pl.progress.loadError);
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

  // No milestones seeded yet: the artwork would render an empty trail, which
  // reads as breakage rather than as "nothing here yet".
  if (!progress || progress.milestones.length === 0) {
    return (
      <ScreenContainer testID="progress-screen">
        <Text testID="progress-empty" style={styles.empty}>
          {pl.progress.empty}
        </Text>
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
    empty: {
      fontFamily: typography.family.body,
      fontSize: typography.size.body,
      color: colors.text.muted,
      textAlign: 'center',
    },
  });
};
