import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
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
  currentItem,
  isFinished,
  markMemorySaved,
  passTurn,
  primaryAction,
  questionCounter,
  setAnswer,
} from '../domain/localGame';
import {
  loadLocalGameState,
  saveLocalGameState,
} from '../storage/localGameState';
import { parseApiError } from '../api/errors';
import { useSaveLocalMemory } from '../queries/useSaveLocalMemory';
import { ScreenContainer } from '../components/ScreenContainer';
import { Badge } from '../components/Badge';
import { SectionLabel } from '../components/SectionLabel';
import { GoldButton } from '../components/GoldButton';
import { OutlineButton } from '../components/OutlineButton';
import { TextField } from '../components/TextField';
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
  const saveMemory = useSaveLocalMemory();

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

  // Moving between cards: persist, close the answer field, and hand over to the
  // summary once the queue is spent.
  const transition = useCallback(
    async (next: LocalGameState) => {
      setWriting(false);
      setSaveError(null);
      await persist(next);
      if (isFinished(next)) {
        navigation.replace('LocalGameSummary');
      }
    },
    [navigation, persist],
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

      <Text testID="local-game-question" style={styles.question}>
        {item.question.body}
      </Text>

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
          writing ? pl.localGame.writeToggleHide : pl.localGame.writeToggleShow
        }
        onPress={() => setWriting(current => !current)}
        style={styles.writeToggle}
      />

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
    question: {
      fontFamily: typography.family.heading,
      fontSize: typography.size.h2,
      color: colors.text.primary,
      lineHeight: typography.size.h2 * 1.3,
      marginTop: spacing.lg,
      marginBottom: spacing.xxl,
    },
    writeToggle: {
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
