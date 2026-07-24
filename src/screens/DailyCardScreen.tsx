import React, { useLayoutEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import axios from 'axios';
import { useQueryClient } from '@tanstack/react-query';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useDailyCard } from '../queries/useDailyCard';
import { useAnswerDailyCard } from '../queries/useAnswerDailyCard';
import { useLikeQuestion } from '../queries/useLikeQuestion';
import { queryKeys } from '../queries/queryKeys';
import { parseApiError } from '../api/errors';
import { isStreakMilestone } from '../domain/streak';
import { notifyStreakMilestone } from '../notifications/notifee';
import { ScreenContainer } from '../components/ScreenContainer';
import { GoldButton } from '../components/GoldButton';
import { LikeHeart } from '../components/LikeHeart';
import { Celebration } from '../components/Celebration';
import { Theme, useTheme } from '../theme';
import { pl } from '../i18n/pl';

type Props = NativeStackScreenProps<RootStackParamList, 'DailyCard'>;

export function DailyCardScreen({ navigation }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const queryClient = useQueryClient();
  const { data: daily, isLoading } = useDailyCard();
  const answer = useAnswerDailyCard();
  const like = useLikeQuestion();

  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  // Streak that triggered a celebration (null = no modal). The modal covers the
  // foreground case; notifyStreakMilestone self-guards so it never doubles up.
  const [celebrateStreak, setCelebrateStreak] = useState<number | null>(null);

  // Answered state is server truth: after a successful answer the daily card
  // query is invalidated (see useAnswerDailyCard) and answeredToday flips true.
  const answered = daily?.answeredToday ?? false;

  useLayoutEffect(() => {
    navigation.setOptions({
      headerStyle: { backgroundColor: theme.colors.bg.base },
      headerTintColor: theme.colors.gold.primary,
      headerShadowVisible: false,
      headerTitleAlign: 'center',
      // eslint-disable-next-line react/no-unstable-nested-components
      headerTitle: () => (
        <Text style={styles.headerTitle}>{pl.dailyCard.headerTitle}</Text>
      ),
    });
  }, [navigation, styles, theme]);

  // Toggle the like on the daily question. Visible whether or not the card has
  // been answered — a couple can still like a question they already answered.
  // isPending blocks overlapping toggles; the hook handles optimistic/rollback.
  const onToggleLike = () => {
    if (!daily || like.isPending) {
      return;
    }
    like.mutate({ ulid: daily.question.ulid, liked: daily.question.liked });
  };

  const onSubmit = () => {
    if (!daily) {
      return;
    }
    if (text.trim().length === 0) {
      setError(pl.dailyCard.emptyAnswer);
      return;
    }
    setError(null);
    answer.mutate(
      {
        questionUlid: daily.question.ulid,
        answerA: text.trim(),
        answerB: null,
      },
      {
        onSuccess: ({ couple }) => {
          setText('');
          const newStreak = couple.streakCurrent;
          if (isStreakMilestone(newStreak)) {
            setCelebrateStreak(newStreak);
            notifyStreakMilestone(newStreak);
          }
        },
        onError: err => {
          // Both 409 cases (already answered / not-today card) are stale-state
          // problems: refetch and let the fresh card speak for itself, rather
          // than matching on the error message (brittle).
          if (axios.isAxiosError(err) && err.response?.status === 409) {
            queryClient.invalidateQueries({ queryKey: queryKeys.dailyCard });
            setError(pl.dailyCard.staleRefreshing);
            return;
          }
          setError(parseApiError(err, pl.dailyCard.saveError).topLevel);
        },
      },
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={theme.colors.gold.primary} />
      </View>
    );
  }

  return (
    <ScreenContainer testID="daily-card-screen">
      <View style={styles.questionRow}>
        <Text testID="daily-card-question" style={styles.question}>
          {daily?.question.body}
        </Text>
        <LikeHeart
          testID="daily-card-like"
          liked={daily?.question.liked ?? false}
          onToggle={onToggleLike}
          disabled={!daily || like.isPending}
        />
      </View>

      {answered ? (
        <View>
          <Text style={styles.answeredTitle}>{pl.dailyCard.answeredTitle}</Text>
          <TouchableOpacity
            testID="daily-card-answered-link"
            onPress={() => navigation.navigate('Memories')}>
            <Text style={styles.answeredLink}>{pl.dailyCard.answeredLink}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {error && (
            <Text testID="daily-card-error" style={styles.error}>
              {error}
            </Text>
          )}
          <TextInput
            testID="daily-card-input"
            style={styles.input}
            placeholder={pl.dailyCard.placeholder}
            placeholderTextColor={theme.colors.text.muted}
            multiline
            textAlignVertical="top"
            editable={!answer.isPending}
            value={text}
            onChangeText={setText}
          />
          <GoldButton
            testID="daily-card-submit"
            title={pl.dailyCard.submitButton}
            onPress={onSubmit}
            loading={answer.isPending}
          />
        </>
      )}

      <Celebration
        visible={celebrateStreak !== null}
        streak={celebrateStreak ?? 0}
        onDismiss={() => setCelebrateStreak(null)}
      />
    </ScreenContainer>
  );
}

const createStyles = (theme: Theme) => {
  const { colors, typography, spacing, radius } = theme;
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
    questionRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: spacing.xxl,
    },
    question: {
      flex: 1,
      fontFamily: typography.family.heading,
      fontSize: typography.size.h2,
      color: colors.text.primary,
      lineHeight: typography.size.h2 * 1.3,
      marginRight: spacing.md,
    },
    error: {
      fontFamily: typography.family.body,
      fontSize: typography.size.bodySm,
      color: colors.burgundy.accent,
      marginBottom: spacing.md,
    },
    input: {
      backgroundColor: colors.bg.elevated,
      borderRadius: radius.md,
      padding: spacing.lg,
      minHeight: 120,
      fontFamily: typography.family.body,
      fontSize: typography.size.body,
      color: colors.text.primary,
      marginBottom: spacing.xl,
    },
    answeredTitle: {
      fontFamily: typography.family.heading,
      fontSize: typography.size.h3,
      color: colors.gold.primary,
      marginBottom: spacing.md,
    },
    answeredLink: {
      fontFamily: typography.family.body,
      fontSize: typography.size.body,
      color: colors.gold.primary,
    },
  });
};
