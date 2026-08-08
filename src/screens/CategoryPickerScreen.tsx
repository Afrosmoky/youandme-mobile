import React, { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import axios from 'axios';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { startSession } from '../api/sessions';
import { parseApiError } from '../api/errors';
import { CategoryList } from '../components/CategoryList';
import { Theme, useTheme } from '../theme';
import { pl } from '../i18n/pl';

type Props = NativeStackScreenProps<RootStackParamList, 'CategoryPicker'>;

// Picks the category for a server-side session. The tiles themselves live in
// CategoryList (extracted in P10, so the local game offers the same choice);
// what stays here is what a tap MEANS on this screen — start a session and open
// the question screen.
export function CategoryPickerScreen({ navigation }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerStyle: { backgroundColor: theme.colors.bg.base },
      headerTintColor: theme.colors.gold.primary,
      headerShadowVisible: false,
      // The screen title lives in the body as an h1 (per mockup).
      headerTitle: () => null,
      // An explicit way back to the hub, replacing the default back arrow. The
      // arrow only pops one screen, which is wrong on the way back OUT of a
      // session: Question pops to here, and here the couple wants Home, not the
      // screen they happened to come from. popTo works for both stack shapes —
      // [Home, CategoryPicker] unwinds, a session resumed at startup has no Home
      // to unwind to and gets one. (This screen goes away when the session and
      // the local game merge; until then it is a dead end without this.)
      // eslint-disable-next-line react/no-unstable-nested-components
      headerLeft: () => (
        <TouchableOpacity
          testID="category-picker-home"
          onPress={() => navigation.popTo('Home')}>
          <Text style={styles.headerButton}>{pl.categoryPicker.homeButton}</Text>
        </TouchableOpacity>
      ),
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

  return (
    <CategoryList
      testID="category-picker-screen"
      title={pl.categoryPicker.title}
      onSelect={start}
      disabled={starting}
      error={sessionError}
    />
  );
}

const createStyles = (theme: Theme) => {
  const { colors, typography, spacing } = theme;
  return StyleSheet.create({
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
