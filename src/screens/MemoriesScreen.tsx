import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
} from 'react';
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
import { listMemories } from '../api/memories';
import { Memory } from '../domain/types';
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

export function MemoriesScreen({ navigation }: Props) {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Loads the first page, replacing the list and cursor. Used on mount and on
  // pull-to-refresh.
  const loadInitial = useCallback(async () => {
    try {
      const page = await listMemories();
      setMemories(page.memories);
      setNextCursor(page.nextCursor);
    } catch {
      Alert.alert(pl.appTitle, pl.memories.loadError);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await loadInitial();
      setLoading(false);
    })();
  }, [loadInitial]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadInitial();
    setRefreshing(false);
  }, [loadInitial]);

  // Appends the next page when the user scrolls near the end. No-op while a
  // page is already loading or there is no further cursor.
  const onEndReached = useCallback(async () => {
    if (loadingMore || nextCursor === null) {
      return;
    }
    setLoadingMore(true);
    try {
      const page = await listMemories(nextCursor);
      setMemories(prev => [...prev, ...page.memories]);
      setNextCursor(page.nextCursor);
    } catch {
      Alert.alert(pl.appTitle, pl.memories.loadError);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, nextCursor]);

  useLayoutEffect(() => {
    navigation.setOptions({
      // headerRight is a navigation render prop, not a remounted subtree.
      // eslint-disable-next-line react/no-unstable-nested-components
      headerRight: () => (
        <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
          <Text style={styles.headerButton}>{pl.profile.headerButton}</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <FlatList
      testID="memories-list"
      data={memories}
      keyExtractor={item => item.ulid}
      contentContainerStyle={
        memories.length === 0 ? styles.emptyContent : styles.listContent
      }
      refreshing={refreshing}
      onRefresh={onRefresh}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      ListFooterComponent={
        loadingMore ? (
          <ActivityIndicator style={styles.footer} />
        ) : null
      }
      ListEmptyComponent={
        <Text style={styles.emptyText}>{pl.memories.empty}</Text>
      }
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={styles.question}>{item.question.body}</Text>
          <Text style={styles.answer}>{item.answer}</Text>
          <Text style={styles.date}>{formatDate(item.answeredAt)}</Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  emptyContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    color: '#777',
    fontSize: 16,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
    padding: 16,
    marginBottom: 12,
  },
  question: {
    fontSize: 13,
    color: '#888',
    marginBottom: 6,
  },
  answer: {
    fontSize: 17,
    color: '#222',
    marginBottom: 8,
  },
  date: {
    fontSize: 12,
    color: '#aaa',
  },
  headerButton: {
    color: '#0a84ff',
    fontSize: 16,
  },
  footer: {
    paddingVertical: 16,
  },
});
