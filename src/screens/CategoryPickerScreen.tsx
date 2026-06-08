import React, { useCallback, useEffect, useLayoutEffect, useState } from 'react';
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
import { listCategories } from '../api/categories';
import { startSession } from '../api/sessions';
import { parseApiError } from '../api/errors';
import { Category } from '../domain/types';
import { pl } from '../i18n/pl';

type Props = NativeStackScreenProps<RootStackParamList, 'CategoryPicker'>;

export function CategoryPickerScreen({ navigation }: Props) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
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
  }, [navigation]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const result = await listCategories();
        if (!active) {
          return;
        }
        // Defensive sort: backend already orders by `ordering`, but the screen
        // must not rely on transport order.
        setCategories([...result].sort((a, b) => a.ordering - b.ordering));
      } catch (err) {
        if (active) {
          setError(parseApiError(err, pl.categoryPicker.error).topLevel);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Starts a session for the given category (null = mix mode), then opens the
  // Question screen. A 409 means the couple already has an active session — we
  // resume it by navigating without params (Question fetches it itself).
  const start = useCallback(
    async (slug: string | null) => {
      setError(null);
      setStarting(true);
      try {
        const session = await startSession(slug);
        navigation.navigate('Question', { sessionUlid: session.ulid });
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 409) {
          navigation.navigate('Question');
          return;
        }
        setError(
          parseApiError(err, pl.categoryPicker.startSessionError).topLevel,
        );
      } finally {
        setStarting(false);
      }
    },
    [navigation],
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
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
        data={categories}
        keyExtractor={item => item.slug}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            testID={`category-${item.slug}`}
            style={styles.categoryTile}
            disabled={starting}
            onPress={() => start(item.slug)}>
            <Text style={styles.categoryName}>{item.name}</Text>
          </TouchableOpacity>
        )}
        ListFooterComponent={
          <TouchableOpacity
            testID="category-picker-mix"
            style={styles.mixTile}
            disabled={starting}
            onPress={() => start(null)}>
            <Text style={styles.mixName}>{pl.categoryPicker.mixButton}</Text>
            <Text style={styles.mixHint}>{pl.categoryPicker.mixHint}</Text>
          </TouchableOpacity>
        }
      />
      {starting && <ActivityIndicator style={styles.startingSpinner} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#777',
    fontSize: 15,
  },
  listContent: {
    padding: 16,
  },
  error: {
    color: '#b00020',
    fontSize: 14,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  categoryTile: {
    backgroundColor: '#333',
    borderRadius: 8,
    paddingVertical: 20,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  categoryName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  mixTile: {
    backgroundColor: '#666',
    borderRadius: 8,
    paddingVertical: 24,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  mixName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  mixHint: {
    color: '#ddd',
    fontSize: 13,
    marginTop: 4,
  },
  startingSpinner: {
    paddingVertical: 16,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 16,
  },
  headerButton: {
    color: '#0a84ff',
    fontSize: 16,
  },
});
