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
import { likeQuestion, unlikeQuestion } from '../api/likes';
import { parseApiError } from '../api/errors';
import { useSaveMemory } from '../queries/useSaveMemory';
import { GameSession, Question } from '../domain/types';
import { Theme, useTheme } from '../theme';
import { Badge } from '../components/Badge';
import { SectionLabel } from '../components/SectionLabel';
import { GoldButton } from '../components/GoldButton';
import { OutlineButton } from '../components/OutlineButton';
import { LikeHeart } from '../components/LikeHeart';
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
  // Like state is imperative here (R1m keeps this whole screen imperative): a
  // local flag seeded from question.liked, flipped optimistically. likePending
  // blocks overlapping toggles — without it a fast double-tap would race a POST
  // and a DELETE (mirrors the daily card's isPending guard).
  const [liked, setLiked] = useState(false);
  const [likePending, setLikePending] = useState(false);
  // Saving a memory also invalidates the memories list (see useSaveMemory). The
  // local `submitting` flag still gates both save and skip identically.
  const saveMemory = useSaveMemory();

  // Ends the current session and returns to the hub. Tolerant of a missing
  // session (e.g. it expired server-side) — the destination is the same.
  //
  // The destination is Home, not CategoryPicker: since P4 the hub is Home, and
  // landing on the picker would strand the user on a screen with no path back to
  // the daily card and the weekly ritual. A new session starts from Home's
  // "sesja pytań" tile, which pushes the picker with a working back button.
  //
  // popTo rather than replace, because the two ways in here leave different
  // stacks. Started from Home the stack is [Home, CategoryPicker, Question], and
  // replace would swap only the top, leaving [Home, CategoryPicker, Home] — a
  // hub with a back arrow onto the picker. Resumed at startup it is [Question]
  // alone, with no Home to pop back to. popTo covers both: it unwinds to an
  // existing Home, and creates one when there is none (verified against the
  // installed StackRouter — both shapes settle on exactly [Home]).
  const goToHome = async (target: GameSession | null) => {
    if (target) {
      try {
        await endSession(target.ulid);
      } catch {
        // best-effort: the session may already be closed
      }
    }
    navigation.popTo('Home');
  };

  // Pulls the next card. When the deck is exhausted, closes the session and
  // bounces back to the hub.
  const loadNext = async () => {
    const res = await fetchNextQuestion();
    if (res.session) {
      setSession(res.session);
    }
    if (res.sessionComplete || !res.question) {
      Alert.alert(pl.appTitle, pl.question.sessionComplete);
      await goToHome(res.session ?? session);
      return;
    }
    setQuestion(res.question);
    setLiked(res.question.liked);
    setAnswer('');
  };

  // Optimistic like toggle: flip local state now, call the API, reconcile with
  // the server's returned state, roll back on error. Guarded by likePending so a
  // double-tap doesn't fire two overlapping requests.
  const onToggleLike = async () => {
    if (!question || likePending) {
      return;
    }
    const current = liked;
    setLiked(!current);
    setLikePending(true);
    try {
      const res = current
        ? await unlikeQuestion(question.ulid)
        : await likeQuestion(question.ulid);
      setLiked(res.liked);
    } catch {
      setLiked(current);
    } finally {
      setLikePending(false);
    }
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
      // Session already ended server-side — back to the hub (see goToHome for
      // why popTo and not replace).
      if (status === 410) {
        navigation.popTo('Home');
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
          navigation.popTo('Home');
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
    await goToHome(session);
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

      {/*
        Only cards bought with a credit are marked. The 60 free questions get
        nothing — a badge on every card would say nothing at all.
      */}
      {question?.isLocked && (
        <Badge testID="question-unlocked" style={styles.unlockedBadge}>
          {pl.question.unlockedBadge}
        </Badge>
      )}

      <View style={styles.questionRow}>
        <Text testID="question-body" style={styles.questionBody}>
          {question?.body}
        </Text>
        <LikeHeart
          testID="question-like"
          liked={liked}
          onToggle={onToggleLike}
          disabled={!question || likePending}
        />
      </View>

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
    unlockedBadge: {
      marginBottom: spacing.md,
    },
    questionRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: spacing.xxl,
    },
    questionBody: {
      flex: 1,
      fontFamily: typography.family.heading,
      fontSize: typography.size.h2,
      color: colors.text.primary,
      lineHeight: typography.size.h2 * 1.3,
      marginRight: spacing.md,
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
