import React, { useEffect, useLayoutEffect, useState } from 'react';
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
import axios from 'axios';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { fetchNextQuestion } from '../api/questions';
import {
  endSession,
  getActiveSession,
  skipCurrentQuestion,
} from '../api/sessions';
import { parseApiError } from '../api/errors';
import { useSaveMemory } from '../queries/useSaveMemory';
import { GameSession, Question } from '../domain/types';
import { pl } from '../i18n/pl';

type Props = NativeStackScreenProps<RootStackParamList, 'Question'>;

export function QuestionScreen({ navigation }: Props) {
  const [question, setQuestion] = useState<Question | null>(null);
  const [session, setSession] = useState<GameSession | null>(null);
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Saving a memory also invalidates the memories list (see useSaveMemory). The
  // local `submitting` flag still gates both save and skip identically.
  const saveMemory = useSaveMemory();

  // Ends the current session and returns to the picker. Tolerant of a missing
  // session (e.g. it expired server-side) — the destination is the same.
  const goToPicker = async (target: GameSession | null) => {
    if (target) {
      try {
        await endSession(target.ulid);
      } catch {
        // best-effort: the session may already be closed
      }
    }
    navigation.replace('CategoryPicker');
  };

  // Pulls the next card. When the deck is exhausted, closes the session and
  // bounces back to the picker.
  const loadNext = async () => {
    const res = await fetchNextQuestion();
    if (res.session) {
      setSession(res.session);
    }
    if (res.sessionComplete || !res.question) {
      Alert.alert(pl.appTitle, pl.question.sessionComplete);
      await goToPicker(res.session ?? session);
      return;
    }
    setQuestion(res.question);
    setAnswer('');
  };

  const handleError = async (err: unknown) => {
    if (axios.isAxiosError(err)) {
      const status = err.response?.status;
      // Stale question (someone advanced the session) — just refetch.
      if (status === 409) {
        try {
          await loadNext();
        } catch (e) {
          setError(parseApiError(e, pl.question.loadError).topLevel);
        }
        return;
      }
      // Session already ended server-side — back to the picker.
      if (status === 410) {
        navigation.replace('CategoryPicker');
        return;
      }
    }
    setError(parseApiError(err, pl.question.saveError).topLevel);
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const current = await getActiveSession();
        if (!active) {
          return;
        }
        if (!current) {
          navigation.replace('CategoryPicker');
          return;
        }
        setSession(current);
        await loadNext();
      } catch (err) {
        if (active) {
          await handleError(err);
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
    // Run once on mount; callbacks captured at first render are sufficient.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onEnd = async () => {
    await goToPicker(session);
  };

  useLayoutEffect(() => {
    const label = session?.category?.name ?? pl.question.mixLabel;
    const current = session ? session.currentIndex + 1 : 0;
    const total = session?.remainingCount ?? 0;
    navigation.setOptions({
      // eslint-disable-next-line react/no-unstable-nested-components
      headerTitle: () => (
        <Text testID="question-progress" style={styles.progress}>
          {session
            ? pl.question.progress(label, current, total)
            : pl.question.headerTitle}
        </Text>
      ),
      // headerRight is a navigation render prop, not a remounted subtree.
      // eslint-disable-next-line react/no-unstable-nested-components
      headerRight: () => (
        <TouchableOpacity testID="question-end" onPress={onEnd}>
          <Text style={styles.headerButton}>{pl.question.endButton}</Text>
        </TouchableOpacity>
      ),
    });
    // onEnd closes over the current session, which is in the dep list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation, session]);

  const onSave = async () => {
    if (!question || !session) {
      return;
    }
    if (answer.trim().length === 0) {
      setError(pl.question.emptyAnswer);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await saveMemory.mutateAsync({
        questionUlid: question.ulid,
        answerA: answer.trim(),
        answerB: null,
        answeredAt: new Date().toISOString(),
      });
      setSession(res.session);
      setAnswer('');
      await loadNext();
    } catch (err) {
      await handleError(err);
    } finally {
      setSubmitting(false);
    }
  };

  const onSkip = async () => {
    if (!session) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const updated = await skipCurrentQuestion(session.ulid);
      setSession(updated);
      setAnswer('');
      await loadNext();
    } catch (err) {
      await handleError(err);
    } finally {
      setSubmitting(false);
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
      testID="question-screen"
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled">
      {error && (
        <Text testID="question-error" style={styles.error}>
          {error}
        </Text>
      )}

      <Text testID="question-body" style={styles.questionBody}>
        {question?.body}
      </Text>

      <TextInput
        testID="question-answer-input"
        style={styles.input}
        placeholder={pl.question.placeholder}
        multiline
        textAlignVertical="top"
        editable={!submitting}
        value={answer}
        onChangeText={setAnswer}
      />

      <TouchableOpacity
        testID="question-submit"
        style={[styles.button, submitting && styles.buttonDisabled]}
        onPress={onSave}
        disabled={submitting}>
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>{pl.question.submitButton}</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        testID="question-skip"
        style={[styles.button, styles.secondaryButton]}
        onPress={onSkip}
        disabled={submitting}>
        <Text style={styles.secondaryButtonText}>{pl.question.skipButton}</Text>
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
  progress: {
    fontSize: 16,
    fontWeight: '600',
  },
  error: {
    color: '#b00020',
    marginBottom: 12,
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
