import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react';
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
import { Theme, useTheme } from '../theme';
import { SectionLabel } from '../components/SectionLabel';
import { GoldButton } from '../components/GoldButton';
import { OutlineButton } from '../components/OutlineButton';
import { pl } from '../i18n/pl';

type Props = NativeStackScreenProps<RootStackParamList, 'Question'>;

export function QuestionScreen({ navigation }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
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
    navigation.setOptions({
      headerStyle: { backgroundColor: theme.colors.bg.base },
      headerTintColor: theme.colors.gold.primary,
      headerShadowVisible: false,
      headerTitleAlign: 'center',
      // Category label in gold caps; testID stays for the render test.
      // eslint-disable-next-line react/no-unstable-nested-components
      headerTitle: () => (
        <SectionLabel testID="question-progress">
          {session ? label : pl.question.headerTitle}
        </SectionLabel>
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
        <ActivityIndicator color={theme.colors.gold.primary} />
      </View>
    );
  }

  const current = session ? session.currentIndex + 1 : 0;
  const total = session?.remainingCount ?? 0;
  const progressFraction = total > 0 ? Math.min(current / total, 1) : 0;

  return (
    <ScrollView
      testID="question-screen"
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled">
      <View style={styles.progressRow}>
        <View style={styles.progressTrack}>
          <View
            style={[styles.progressFill, { width: `${progressFraction * 100}%` }]}
          />
        </View>
        <Text testID="question-counter" style={styles.counter}>
          {pl.question.counter(current, total)}
        </Text>
      </View>

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
        style={[
          styles.input,
          // Alegreya italic while empty (placeholder), regular once typing.
          {
            fontFamily:
              answer.length === 0
                ? theme.typography.family.bodyItalic
                : theme.typography.family.body,
          },
        ]}
        placeholder={pl.question.placeholder}
        placeholderTextColor={theme.colors.text.muted}
        multiline
        textAlignVertical="top"
        editable={!submitting}
        value={answer}
        onChangeText={setAnswer}
      />

      <GoldButton
        testID="question-submit"
        title={pl.question.submitButton}
        onPress={onSave}
        loading={submitting}
        disabled={submitting}
        style={styles.submitButton}
      />

      <OutlineButton
        testID="question-skip"
        title={pl.question.skipButton}
        onPress={onSkip}
        disabled={submitting}
      />
    </ScrollView>
  );
}

const createStyles = (theme: Theme) => {
  const { colors, typography, spacing, radius } = theme;
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg.base,
    },
    content: {
      padding: spacing.xxl,
    },
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.bg.base,
    },
    headerButton: {
      fontFamily: typography.family.body,
      fontSize: typography.size.bodySm,
      color: colors.gold.primary,
    },
    progressRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.xxl,
    },
    progressTrack: {
      flex: 1,
      height: 3,
      borderRadius: radius.pill,
      backgroundColor: colors.border.subtle,
      overflow: 'hidden',
      marginRight: spacing.md,
    },
    progressFill: {
      height: '100%',
      borderRadius: radius.pill,
      backgroundColor: colors.gold.primary,
    },
    counter: {
      fontFamily: typography.family.body,
      fontSize: typography.size.micro,
      color: colors.text.muted,
    },
    error: {
      fontFamily: typography.family.body,
      fontSize: typography.size.bodySm,
      color: colors.burgundy.accent,
      marginBottom: spacing.md,
    },
    questionBody: {
      fontFamily: typography.family.heading,
      fontSize: typography.size.h2,
      color: colors.text.primary,
      lineHeight: typography.size.h2 * 1.3,
      marginBottom: spacing.xxl,
    },
    input: {
      backgroundColor: colors.bg.elevated,
      borderRadius: radius.md,
      padding: spacing.lg,
      minHeight: 120,
      fontSize: typography.size.body,
      color: colors.text.primary,
      marginBottom: spacing.xl,
    },
    submitButton: {
      marginBottom: spacing.md,
    },
  });
};
