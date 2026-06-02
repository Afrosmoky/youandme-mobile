import React, { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { fetchNextQuestion } from '../api/questions';
import { createMemory } from '../api/memories';
import { Question } from '../domain/types';
import { pl } from '../i18n/pl';

type Props = NativeStackScreenProps<RootStackParamList, 'Question'>;

export function QuestionScreen({ navigation }: Props) {
  const [question, setQuestion] = useState<Question | null>(null);
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadNext = useCallback(async () => {
    setLoading(true);
    setAnswer('');
    try {
      const next = await fetchNextQuestion();
      setQuestion(next);
    } catch {
      Alert.alert(pl.appTitle, pl.question.loadError);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNext();
  }, [loadNext]);

  useLayoutEffect(() => {
    navigation.setOptions({
      // headerRight is a navigation render prop, not a remounted subtree.
      // eslint-disable-next-line react/no-unstable-nested-components
      headerRight: () => (
        <TouchableOpacity onPress={() => navigation.navigate('Memories')}>
          <Text style={styles.headerButton}>{pl.question.memoriesButton}</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  const onSave = async () => {
    if (!question || answer.trim().length === 0) {
      Alert.alert(pl.appTitle, pl.question.emptyAnswer);
      return;
    }
    setSaving(true);
    try {
      await createMemory({
        questionUlid: question.ulid,
        answer: answer.trim(),
        answeredAt: new Date().toISOString(),
      });
      Alert.alert(pl.question.saved, pl.question.savedBody);
      await loadNext();
    } catch {
      Alert.alert(pl.appTitle, pl.question.saveError);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled">
      <Text style={styles.questionBody}>{question?.body}</Text>

      <TextInput
        style={styles.input}
        placeholder={pl.question.answerPlaceholder}
        multiline
        textAlignVertical="top"
        value={answer}
        onChangeText={setAnswer}
      />

      <TouchableOpacity
        style={[styles.button, saving && styles.buttonDisabled]}
        onPress={onSave}
        disabled={saving}>
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>{pl.question.save}</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.secondaryButton]}
        onPress={loadNext}
        disabled={saving}>
        <Text style={styles.secondaryButtonText}>{pl.question.next}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 24,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  questionBody: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    minHeight: 120,
    fontSize: 16,
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#333',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#333',
  },
  secondaryButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  headerButton: {
    color: '#0a84ff',
    fontSize: 16,
  },
});
