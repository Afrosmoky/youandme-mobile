import React, { useLayoutEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
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
import { useMilestoneCelebration } from '../queries/useMilestoneCelebration';
import { queryKeys } from '../queries/queryKeys';
import { parseApiError } from '../api/errors';
import { useAuth } from '../auth/AuthContext';
import { isStreakMilestone } from '../domain/streak';
import { notifyStreakMilestone } from '../notifications/notifee';
import { ScreenTitle } from '../components/ScreenTitle';
import { GlowBackground } from '../components/GlowBackground';
import { ScreenContainer } from '../components/ScreenContainer';
import { GameCard } from '../components/GameCard';
import { GoldButton } from '../components/GoldButton';
import { SectionLabel } from '../components/SectionLabel';
import { TextField } from '../components/TextField';
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
  const { user, couple } = useAuth();

  // Two answers, as on a memory of the game: the account is the couple's, so
  // the card is answered by both of them. Only the first is required — the
  // backend's answer_a — and the second is sent as null when left empty.
  const [answerA, setAnswerA] = useState('');
  const [answerB, setAnswerB] = useState('');
  // Banner for what belongs to no field (409, network, server); the inline
  // errors under each field for what does (P2 canon).
  const [error, setError] = useState<string | null>(null);
  const [answerAError, setAnswerAError] = useState<string | null>(null);
  const [answerBError, setAnswerBError] = useState<string | null>(null);
  // Streak that triggered a celebration (null = no modal). The modal covers the
  // foreground case; notifyStreakMilestone self-guards so it never doubles up.
  const [celebrateStreak, setCelebrateStreak] = useState<number | null>(null);
  // P8: the daily card counts towards the progress map, so answering here can
  // unlock a milestone. The hook watches the progress refetch that
  // useAnswerDailyCard triggers; it fires only on an unlock seen from this
  // mount, never on what was already unlocked when the screen opened.
  const { milestone, dismiss: dismissMilestone } = useMilestoneCelebration();

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
        <ScreenTitle>{pl.dailyCard.headerTitle}</ScreenTitle>
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
    // Refused here even when the partner's field is filled: moving that text
    // into the first answer would put it under the wrong name.
    if (answerA.trim().length === 0) {
      setAnswerAError(pl.dailyCard.emptyAnswer);
      return;
    }
    setError(null);
    setAnswerAError(null);
    setAnswerBError(null);
    const trimmedB = answerB.trim();
    answer.mutate(
      {
        questionUlid: daily.question.ulid,
        answerA: answerA.trim(),
        answerB: trimmedB.length > 0 ? trimmedB : null,
      },
      {
        onSuccess: ({ couple: updated }) => {
          setAnswerA('');
          setAnswerB('');
          const newStreak = updated.streakCurrent;
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
          const parsed = parseApiError(err, pl.dailyCard.saveError);
          const fieldA = parsed.fields.answer_a ?? null;
          const fieldB = parsed.fields.answer_b ?? null;
          setAnswerAError(fieldA);
          setAnswerBError(fieldB);
          if (!fieldA && !fieldB) {
            setError(parsed.topLevel);
          }
        },
      },
    );
  };

  // One modal slot, two occasions. A single answer can land on both a streak
  // milestone and a map milestone, and two RN Modals would stack on top of each
  // other. The streak goes first — it is what the couple just did — and
  // dismissing it uncovers the map milestone instead of dropping it.
  const celebration =
    celebrateStreak !== null
      ? {
          title: pl.celebration.streakTitle(celebrateStreak),
          body: pl.celebration.streakBody,
        }
      : milestone
      ? {
          title: pl.celebration.milestoneTitle,
          body: pl.celebration.milestoneBody(milestone.name),
        }
      : null;

  const onDismissCelebration = () => {
    if (celebrateStreak !== null) {
      setCelebrateStreak(null);
      return;
    }
    dismissMilestone();
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={theme.colors.gold.primary} />
      </View>
    );
  }

  return (
    <ScreenContainer
      testID="daily-card-screen"
      contentContainerStyle={styles.fills}
      avoidsKeyboard>
      {/* The same soft gold wash Home and the auth screens already carry, on the
          three screens where a couple actually plays. It is a background layer
          behind the card, not a glow on the text — the question itself stays
          flat, which is the boundary this slice does not cross. */}
      <GlowBackground size={320} intensity={0.28} style={styles.glow} />
      {/* The same frame, label and corner hearts as a card of the local game
          (S_polish): the daily question IS a card, and the two screens were
          drawing it two different ways. */}
      {/* The label is also where the streak lives, for the same reason the
          game's label carries the card counter and whose turn it is: it is the
          line that talks about the session rather than about this one question.
          Now that the card fills the screen there is no spare room under it for
          a block of its own, and the backend has been sending streakCurrent
          since P4 with nobody showing it. */}
      <SectionLabel testID="daily-card-label" style={styles.cardLabel}>
        {pl.dailyCard.cardLabel(daily?.streakCurrent ?? 0)}
      </SectionLabel>

      {/* Takes whatever height is left over, so the action below it sits at the
          bottom of the screen instead of wherever the question happens to end,
          and the screen stops being half card and half nothing. The same three
          styles as the game's card (LocalGameScreen, 3D): the card fills, its
          body scrolls inside it, and a short question stays centred in that
          space rather than pinned to the top of it. */}
      <GameCard
        testID="daily-card-card"
        style={[styles.card, styles.cardFills]}
        like={{
          liked: daily?.question.liked ?? false,
          onToggle: onToggleLike,
          disabled: !daily || like.isPending,
          testID: 'daily-card-like',
        }}>
        <ScrollView
          style={styles.cardBody}
          contentContainerStyle={styles.cardBodyContent}
          keyboardShouldPersistTaps="handled">
          <Text testID="daily-card-question" style={styles.question}>
            {daily?.question.body}
          </Text>

          {/* Answered is a state OF the card, so it stays inside it rather
              than replacing it — the couple can still read what they answered,
              and still like it. With no field and no button, the centred body
              is what keeps the full-height frame reading as a card at rest
              rather than as an empty box: the two lines sit in the middle, the
              way the game's challenge card does. */}
          {answered ? (
            <View>
              <Text style={styles.answeredTitle}>
                {pl.dailyCard.answeredTitle}
              </Text>
              <TouchableOpacity
                testID="daily-card-answered-link"
                onPress={() => navigation.navigate('Memories')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.answeredLink}>
                  {pl.dailyCard.answeredLink}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            // The same labels the memory will carry once this is saved: the
            // backend writes the nickname and partner_name_local onto it.
            <View>
              <TextField
                testID="daily-card-answer-a"
                label={
                  user?.nickname
                    ? pl.memoryCard.answerLabel(user.nickname)
                    : pl.dailyCard.ownAnswerFallback
                }
                placeholder={pl.dailyCard.placeholder}
                value={answerA}
                onChangeText={value => {
                  setAnswerA(value);
                  setAnswerAError(null);
                }}
                error={answerAError ?? undefined}
                multiline
                inputStyle={styles.input}
              />
              <TextField
                testID="daily-card-answer-b"
                label={
                  couple?.partnerNameLocal
                    ? pl.memoryCard.answerLabel(couple.partnerNameLocal)
                    : pl.memoryCard.partnerAnswerLabel
                }
                placeholder={pl.dailyCard.placeholder}
                value={answerB}
                onChangeText={value => {
                  setAnswerB(value);
                  setAnswerBError(null);
                }}
                error={answerBError ?? undefined}
                hint={pl.dailyCard.partnerHint}
                multiline
                inputStyle={styles.input}
                style={styles.lastField}
              />
            </View>
          )}
        </ScrollView>
      </GameCard>

      {error && (
        <Text testID="daily-card-error" style={styles.error}>
          {error}
        </Text>
      )}

      {/* One primary action across the width, under the card — the game's
          footer minus the two secondaries it has no use for. */}
      {!answered && (
        <GoldButton
          testID="daily-card-submit"
          title={pl.dailyCard.submitButton}
          onPress={onSubmit}
          loading={answer.isPending}
        />
      )}

      <Celebration
        visible={celebration !== null}
        title={celebration?.title ?? ''}
        body={celebration?.body ?? ''}
        onDismiss={onDismissCelebration}
      />
    </ScreenContainer>
  );
}

const createStyles = (theme: Theme) => {
  const { colors, typography, spacing } = theme;
  return StyleSheet.create({
    // Pulled up behind the card rather than centred on the screen: the wash
    // belongs over the heading, which is where the web puts it.
    glow: {
      top: -120,
    },
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.bg.base,
    },
    // At least the height of the viewport, so `flex: 1` below it has something
    // definite to divide. Inside a ScrollView children otherwise get their
    // natural height and a filling card collapses onto its own text — the same
    // trap 3D hit from the other side, where the game screen had to stop
    // scrolling altogether. Here the screen stays a ScrollView on purpose: that
    // is what `avoidsKeyboard` needs something to scroll for.
    //
    // It also moves the gold wash. GlowBackground is absolute, so it never
    // competed with the card for space, but its box is its parent's — and the
    // parent just grew from the height of the content to the height of the
    // screen, which carries the wash's centre about 100dp down. That is where
    // the game already puts it (same `top: -120` over a full-height container),
    // so the two screens converge rather than drift. It stays put as the
    // question gets longer, because a long question scrolls INSIDE the card and
    // leaves this container exactly one viewport tall.
    fills: {
      flexGrow: 1,
    },
    cardLabel: {
      marginBottom: spacing.md,
    },
    card: {
      marginBottom: spacing.xl,
    },
    cardFills: {
      flex: 1,
    },
    // The scrolling half of the card. flexGrow keeps a short question centred
    // in the space rather than pinned to the top of it, which is how the card
    // reads when there is one line on it.
    cardBody: {
      flex: 1,
    },
    cardBodyContent: {
      flexGrow: 1,
      justifyContent: 'center',
    },
    question: {
      fontFamily: typography.family.heading,
      fontSize: typography.size.h2,
      color: colors.text.primary,
      lineHeight: typography.size.h2 * 1.3,
      marginBottom: spacing.xl,
    },
    error: {
      fontFamily: typography.family.body,
      fontSize: typography.size.bodySm,
      color: colors.burgundy.accent,
      marginBottom: spacing.md,
    },
    // Shorter than TextField's default paragraph box: two of them share the
    // card, and on Android the keyboard takes the bottom half of it.
    input: {
      minHeight: 90,
    },
    // The card's own padding closes the body; the field's bottom margin would
    // only add a gap above the frame.
    lastField: {
      marginBottom: 0,
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
