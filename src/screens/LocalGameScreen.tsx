import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import {
  LocalGameState,
  advance,
  canSaveMemory,
  confirmReported,
  currentItem,
  isFinished,
  markMemorySaved,
  passTurn,
  primaryAction,
  questionCounter,
  setAnswer,
  setQuestionLiked,
} from '../domain/localGame';
import {
  loadLocalGameState,
  saveLocalGameState,
} from '../storage/localGameState';
import { parseApiError } from '../api/errors';
import { likeQuestion, unlikeQuestion } from '../api/likes';
import { useSaveLocalMemory } from '../queries/useSaveLocalMemory';
import { useReportPlayedCards } from '../queries/useReportPlayedCards';
import { useMilestoneCelebration } from '../queries/useMilestoneCelebration';
import { ScreenContainer } from '../components/ScreenContainer';
import { Badge } from '../components/Badge';
import { Celebration } from '../components/Celebration';
import { LikeHeart } from '../components/LikeHeart';
import { SectionLabel } from '../components/SectionLabel';
import { GoldButton } from '../components/GoldButton';
import { OutlineButton } from '../components/OutlineButton';
import { TextField } from '../components/TextField';
import { OptionPicker } from '../components/OptionPicker';
import { Theme, useTheme } from '../theme';
import { pl } from '../i18n/pl';

type Props = NativeStackScreenProps<RootStackParamList, 'LocalGame'>;

// The local game itself (P10): one card at a time, two people, one phone.
//
// The screen owns no rules. Every transition is a function from src/domain/
// localGame.ts applied to the state and written straight back to disk, so what
// is on screen and what would be resumed can never disagree. What lives here is
// presentation: which of the two layouts a card gets, what the primary button
// says, and whether the answer field is open.
//
// There is no back arrow and no swipe (see RootNavigator): "Przerwij" is the
// only way out, so the setup screen always remounts and re-reads what is on
// disk rather than showing what it read when it first mounted.
export function LocalGameScreen({ navigation }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [state, setState] = useState<LocalGameState | null>(null);
  const [loading, setLoading] = useState(true);
  // The written answer is optional (Wiktoria: not everyone will write), so the
  // field starts hidden behind a toggle — and closes again on every card and
  // every handover, because it belongs to whoever is answering now.
  const [writing, setWriting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [likePending, setLikePending] = useState(false);
  const saveMemory = useSaveLocalMemory();
  const report = useReportPlayedCards();
  // One report at a time. Every transition offers to settle what is owed, and
  // two overlapping calls would race over the same buffer for no gain — the
  // endpoint is throttled and the next transition retries anyway.
  const reportInFlight = useRef(false);

  // Mounted here, at the START of the session, and this is the whole ordering the
  // celebration depends on: the hook's first reading of the map only seeds a
  // baseline, so it has to happen before the first report moves it. On the
  // summary screen (where P10 kept it) that ordering had to be constructed by
  // hand; here the couple gives it to us for free by playing a card.
  const { milestone, dismiss } = useMilestoneCelebration();

  // `state` as of the last committed render, for the two things that resume AFTER
  // an await — the like round trip (S3b) and the report (S3c). By the time either
  // answer comes back the couple may have typed more, handed the phone over or
  // moved on; applying it to the snapshot it started from would undo all of that.
  //
  // Null means "there is nothing on screen to write to": the state has not loaded
  // yet, or the screen is gone. A late answer then writes nothing, which is what
  // keeps it from resurrecting a session the setup screen has already cleared —
  // whatever was left owing is on disk, and the setup screen resends it.
  const latestState = useRef<LocalGameState | null>(null);
  useEffect(() => {
    latestState.current = state;
  }, [state]);
  useEffect(() => () => {
    latestState.current = null;
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      const stored = await loadLocalGameState();
      if (!active) {
        return;
      }
      if (stored === null) {
        // Nothing to play — the only honest place to be is the setup screen.
        navigation.replace('LocalGameSetup');
        return;
      }
      if (isFinished(stored)) {
        // The app died on the last card: the session is over but never
        // summarised, and its played cards were never reported.
        navigation.replace('LocalGameSummary');
        return;
      }
      setState(stored);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
    // Run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // State on screen and state on disk move together, so closing the app between
  // two cards resumes exactly where the couple stopped.
  //
  // Typing does NOT go through here — it updates React state only (see onType).
  // Persisting a keystroke would write to disk on every letter to save text that
  // is deliberately dropped at the next card anyway; the next transition through
  // here picks up whatever was typed by then.
  const persist = useCallback(async (next: LocalGameState) => {
    setState(next);
    await saveLocalGameState(next);
  }, []);

  /**
   * Tells the server what the session owes, without making anyone wait (S3c).
   *
   * Deliberately not awaited by the caller: the couple moves to the next card the
   * moment they tap, and a phone with no signal must not turn a game into a
   * queue of spinners. The map is what waits, and it catches up a beat later.
   *
   * Fired on EVERY transition, not only on the one that played a card, so a call
   * that failed is retried by the next tap rather than waiting for the end of the
   * session. That is safe because the endpoint keeps a set: a card sent twice
   * comes back as newly_played: 0.
   */
  const flushPending = useCallback(
    (pending: string[]) => {
      if (pending.length === 0 || reportInFlight.current) {
        return;
      }
      reportInFlight.current = true;
      // The exact list that went out. Cards played while it was in flight are
      // not in it, and must stay owed.
      const sent = pending;
      report
        .mutateAsync(sent)
        .then(async () => {
          const current = latestState.current;
          if (current === null) {
            return;
          }
          const next = confirmReported(current, sent);
          if (next !== current) {
            await persist(next);
          }
        })
        .catch(() => {
          // Keep the buffer. The next transition retries, and failing that the
          // setup screen does on the couple's next visit.
        })
        .finally(() => {
          reportInFlight.current = false;
        });
    },
    [persist, report],
  );

  // Moving between cards: persist, close the answer field, settle up with the
  // server, and hand over to the summary once the queue is spent.
  //
  // Order matters and is the same as everywhere else here: disk first, request
  // second. A phone that dies between the two still knows what it owes.
  const transition = useCallback(
    async (next: LocalGameState) => {
      setWriting(false);
      setSaveError(null);
      await persist(next);
      flushPending(next.pendingReport);
      if (isFinished(next)) {
        navigation.replace('LocalGameSummary');
      }
    },
    [flushPending, navigation, persist],
  );

  const onType = useCallback(
    (text: string) =>
      setState(current =>
        current ? setAnswer(current, current.activePlayer, text) : current,
      ),
    [],
  );

  const onSave = useCallback(async () => {
    if (state === null) {
      return;
    }
    const item = currentItem(state);
    if (item?.kind !== 'question') {
      return;
    }
    setSaveError(null);
    try {
      await saveMemory.mutateAsync({
        questionUlid: item.question.ulid,
        answerA: state.answers.p1.trim(),
        answerB: state.answers.p2.trim(),
        // A snapshot of the name typed at setup, not a reference: the second
        // player has no account, and this may differ from the couple's stored
        // partner name.
        playerBName: state.player2,
        answeredAt: new Date().toISOString(),
      });
      // Persist, but leave the card as it is — the couple is still on it.
      await persist(markMemorySaved(state, item.question.ulid));
    } catch (err) {
      setSaveError(parseApiError(err, pl.localGame.saveError).topLevel);
    }
  }, [persist, saveMemory, state]);

  // Writes one card's heart onto whatever the state is NOW, and only when that
  // actually changes something (setQuestionLiked returns the state untouched
  // otherwise) — so reconciling with the server's answer costs no second write.
  const writeLiked = useCallback(
    async (questionUlid: string, liked: boolean) => {
      const current = latestState.current;
      if (current === null) {
        return;
      }
      const next = setQuestionLiked(current, questionUlid, liked);
      if (next !== current) {
        await persist(next);
      }
    },
    [persist],
  );

  // The heart, exactly as on the served card (QuestionScreen) and the daily card:
  // flip now, call P5, reconcile with what the server says, roll back if the call
  // failed. What is different here is where the flip lands — in the queue on
  // disk, so a paused session resumes with the heart the couple left.
  //
  // A failed like is silent: nothing was lost, the heart simply goes back. The
  // save error banner is for the memory, which the couple asked to keep.
  const onToggleLike = useCallback(async () => {
    if (state === null || likePending) {
      return;
    }
    const item = currentItem(state);
    if (item?.kind !== 'question') {
      return;
    }
    const { ulid, liked } = item.question;

    setLikePending(true);
    await writeLiked(ulid, !liked);
    try {
      const res = liked
        ? await unlikeQuestion(ulid)
        : await likeQuestion(ulid);
      await writeLiked(ulid, res.liked);
    } catch {
      await writeLiked(ulid, liked);
    } finally {
      setLikePending(false);
    }
  }, [likePending, state, writeLiked]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerStyle: { backgroundColor: theme.colors.bg.base },
      headerTintColor: theme.colors.gold.primary,
      headerShadowVisible: false,
      title: pl.localGame.headerTitle,
      // Leaving is a pause, not an end: the state stays on disk and the setup
      // screen offers it back.
      // eslint-disable-next-line react/no-unstable-nested-components
      headerRight: () => (
        <TouchableOpacity
          testID="local-game-pause"
          onPress={() => navigation.popTo('Home')}>
          <Text style={styles.headerButton}>{pl.localGame.pauseButton}</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, styles, theme]);

  if (loading || state === null) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={theme.colors.gold.primary} />
      </View>
    );
  }

  const item = currentItem(state);
  const counter = questionCounter(state);
  const activeName =
    state.activePlayer === 'p1' ? state.player1 : state.player2;

  // Rendered on both layouts, because the milestone lands a beat AFTER the card
  // that earned it — by which time the couple may be on the next question or on
  // a challenge. The one card it cannot reach is the last: that transition leaves
  // for the summary immediately, so a milestone crossed by the final card of a
  // session is shown on the map rather than celebrated.
  const celebration = (
    <Celebration
      visible={milestone !== null}
      title={pl.celebration.milestoneTitle}
      body={milestone ? pl.celebration.milestoneBody(milestone.name) : ''}
      onDismiss={dismiss}
    />
  );

  if (item?.kind === 'challenge') {
    return (
      <ScreenContainer testID="local-game-challenge">
        <SectionLabel>{pl.localGame.challengeHeader}</SectionLabel>
        <Text testID="local-game-challenge-title" style={styles.challengeTitle}>
          {item.challenge.title}
        </Text>
        <Text style={styles.challengeBody}>{item.challenge.description}</Text>
        <GoldButton
          testID="local-game-primary"
          title={pl.localGame.challengeDoneButton}
          onPress={() => transition(advance(state))}
        />
        {celebration}
      </ScreenContainer>
    );
  }

  if (item?.kind !== 'question') {
    return null;
  }

  const action = primaryAction(state);
  const alreadySaved = state.savedMemoryUlids.includes(item.question.ulid);

  return (
    <ScreenContainer testID="local-game-screen">
      <SectionLabel testID="local-game-header">
        {pl.localGame.cardHeader(counter.current, counter.total, activeName)}
      </SectionLabel>

      {/* Only cards bought with a credit are marked; a badge on every card
          would say nothing at all. */}
      {item.question.isLocked && (
        <Badge testID="local-game-unlocked" style={styles.unlockedBadge}>
          {pl.question.unlockedBadge}
        </Badge>
      )}

      {/* The heart belongs to the question, and only to it: a challenge is an
          instruction the couple performs, not a card of the deck they can like
          (there is nothing server-side to like it on). */}
      <View style={styles.questionRow}>
        <Text testID="local-game-question" style={styles.question}>
          {item.question.body}
        </Text>
        <LikeHeart
          testID="local-game-like"
          liked={item.question.liked}
          onToggle={onToggleLike}
          disabled={likePending}
        />
      </View>

      {/* A card that came with options is answered by picking, and the picker is
          on screen from the start — there is nothing optional about it to hide
          behind a toggle, the way writing is optional on an open card. Both
          paths write to the same place through onType, so the picked labels are
          the answer text, and the turn, the save and the report never learn that
          this card was different. */}
      {item.question.options ? (
        <OptionPicker
          testID="local-game-options"
          label={
            item.question.options.multiple
              ? pl.localGame.pickMany
              : pl.localGame.pickOne
          }
          items={item.question.options.items}
          multiple={item.question.options.multiple}
          value={state.answers[state.activePlayer]}
          onChange={onType}
          style={styles.picker}
        />
      ) : (
        <>
          {writing ? (
            <TextField
              value={state.answers[state.activePlayer]}
              onChangeText={onType}
              placeholder={pl.localGame.answerPlaceholder(activeName)}
              multiline
              testID="local-game-answer"
            />
          ) : null}

          <OutlineButton
            testID="local-game-write-toggle"
            title={
              writing
                ? pl.localGame.writeToggleHide
                : pl.localGame.writeToggleShow
            }
            onPress={() => setWriting(current => !current)}
            style={styles.writeToggle}
          />
        </>
      )}

      {saveError && (
        <Text testID="local-game-save-error" style={styles.error}>
          {saveError}
        </Text>
      )}

      {/* Secondary, and live only once BOTH have written: a memory from the
          local game is the pair of answers. Writing stays optional, which is
          exactly why progress counts cards played rather than cards saved. */}
      {alreadySaved ? (
        <Badge testID="local-game-saved" style={styles.savedBadge}>
          {pl.localGame.savedBadge}
        </Badge>
      ) : (
        <OutlineButton
          testID="local-game-save"
          title={pl.localGame.saveButton}
          onPress={onSave}
          loading={saveMemory.isPending}
          disabled={!canSaveMemory(state) || saveMemory.isPending}
          style={styles.save}
        />
      )}

      {/* The one primary action, at the bottom: hand the phone over while
          player one holds it, move on once player two has had their turn. */}
      <GoldButton
        testID="local-game-primary"
        title={
          action === 'pass' ? pl.localGame.passButton : pl.localGame.nextButton
        }
        onPress={() =>
          transition(action === 'pass' ? passTurn(state) : advance(state))
        }
        style={styles.primary}
      />

      {/* Skipping is the same transition as moving on — the couple left the
          card behind either way, which is what the report counts. */}
      <OutlineButton
        testID="local-game-skip"
        title={pl.localGame.skipButton}
        onPress={() => transition(advance(state))}
      />

      {celebration}
    </ScreenContainer>
  );
}

const createStyles = (theme: Theme) => {
  const { colors, typography, spacing } = theme;
  return StyleSheet.create({
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
    unlockedBadge: {
      marginTop: spacing.md,
    },
    questionRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginTop: spacing.lg,
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
    writeToggle: {
      marginBottom: spacing.lg,
    },
    picker: {
      marginBottom: spacing.lg,
    },
    error: {
      fontFamily: typography.family.body,
      fontSize: typography.size.bodySm,
      color: colors.burgundy.accent,
      marginBottom: spacing.md,
    },
    save: {
      marginBottom: spacing.xl,
    },
    savedBadge: {
      marginBottom: spacing.xl,
      alignSelf: 'flex-start',
    },
    primary: {
      marginBottom: spacing.md,
    },
    challengeTitle: {
      fontFamily: typography.family.heading,
      fontSize: typography.size.h2,
      color: colors.gold.primary,
      marginTop: spacing.lg,
      marginBottom: spacing.lg,
    },
    challengeBody: {
      fontFamily: typography.family.body,
      fontSize: typography.size.body,
      color: colors.text.primary,
      lineHeight: typography.size.body * 1.5,
      marginBottom: spacing.xxl,
    },
  });
};
