import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useAuth } from '../auth/AuthContext';
import { fetchGameDeck } from '../api/localGame';
import { parseApiError } from '../api/errors';
import { CHALLENGES } from '../domain/challenges';
import { shuffle } from '../domain/shuffle';
import {
  LocalGameState,
  isFinished,
  matchesSetup,
  questionCounter,
  startLocalGame,
} from '../domain/localGame';
import { useReportPlayedCards } from '../queries/useReportPlayedCards';
import {
  clearLocalGameState,
  loadLocalGameState,
  saveLocalGameState,
} from '../storage/localGameState';
import { CategoryList } from '../components/CategoryList';
import { Card } from '../components/Card';
import { GoldButton } from '../components/GoldButton';
import { OutlineButton } from '../components/OutlineButton';
import { SectionLabel } from '../components/SectionLabel';
import { TextField } from '../components/TextField';
import { Theme, useTheme } from '../theme';
import { pl } from '../i18n/pl';

type Props = NativeStackScreenProps<RootStackParamList, 'LocalGameSetup'>;

// Matches the backend cap on memories.player_b_name (and partner_name_local):
// the two land in the same column shape, so a couple would rightly expect them
// to accept the same thing.
const PLAYER_NAME_MAX = 60;

// Setup for the local two-player game (P10 S2).
//
// Player 1 is the logged-in nickname, read-only — the session belongs to their
// couple, whoever is holding the phone. Player 2 is a name typed here, not an
// account: in the MVP the partner has no login, so the name lives on this phone
// and reaches the server only as a snapshot on a saved memory.
//
// This is also where a paused game is picked up. That decision lives here rather
// than in BootstrapScreen on purpose: Bootstrap decides about the SERVER
// session, and folding two independent loops into one decision point is how
// "where does the user land" stops being answerable.
export function LocalGameSetupScreen({ navigation }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { user, couple } = useAuth();

  const player1 = user?.nickname ?? pl.localGame.player1Fallback;

  // Seeded from the couple's stored partner name, which is the right guess most
  // of the time — and editable, because the backend is explicit that the local
  // game's second player and partner_name_local may legitimately differ.
  const [player2, setPlayer2] = useState(couple?.partnerNameLocal ?? '');
  const [nameError, setNameError] = useState<string | null>(null);
  const [deckError, setDeckError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // The paused session, if there is one. Null once resumed or discarded.
  const [stored, setStored] = useState<LocalGameState | null>(null);
  const [loadingStored, setLoadingStored] = useState(true);
  // Sends whatever a previous session left owing — see the mount effect.
  const flush = useReportPlayedCards();

  useEffect(() => {
    let active = true;
    (async () => {
      const saved = await loadLocalGameState();
      if (!active) {
        return;
      }

      // Flush before anything else can touch the stored state: the played buffer
      // of an interrupted session is the one thing left in it that the server
      // still wants, and this runs on mount, before the couple can tap a
      // category and overwrite it.
      //
      // Two ways to get here with cards owing: the app was killed mid-session,
      // or the summary screen's report failed. Both are covered by the same
      // resend, because the endpoint keeps a set — cards already counted come
      // back as newly_played: 0 rather than counting twice.
      let reported = true;
      if (saved !== null && saved.playedUlids.length > 0) {
        try {
          await flush.mutateAsync(saved.playedUlids);
        } catch {
          // Keep the buffer and try again on the next visit. It is lost only if
          // this fails AND the couple starts a new game before it succeeds —
          // accepted, because the alternative is a finished session that cannot
          // be cleared blocking a fresh one.
          reported = false;
        }
      }

      // A finished session has nothing to resume — its only remaining value was
      // the buffer, so once that has landed the state goes.
      if (saved !== null && isFinished(saved) && reported) {
        await clearLocalGameState();
      }
      if (!active) {
        return;
      }
      setStored(saved !== null && !isFinished(saved) ? saved : null);
      setLoadingStored(false);
    })();
    return () => {
      active = false;
    };
    // Run once on mount; the mutation is stable for the life of the screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerStyle: { backgroundColor: theme.colors.bg.base },
      headerTintColor: theme.colors.gold.primary,
      headerShadowVisible: false,
      title: pl.localGame.setupHeaderTitle,
    });
  }, [navigation, theme]);

  /**
   * Deals a deck and starts a session — unless the setup in the form is the one
   * already paused on this phone, in which case that session is picked up rather
   * than replaced. Same guard as the demo, and the reason it earns its keep:
   * dealing a fresh deck would silently drop cards the couple had played but not
   * yet reported.
   */
  const start = useCallback(
    async (categorySlug: string | null) => {
      const name = player2.trim();
      const invalid =
        name.length === 0
          ? pl.localGame.player2Required
          : name.length > PLAYER_NAME_MAX
          ? pl.localGame.player2TooLong
          : null;

      setNameError(invalid);
      if (invalid) {
        return;
      }

      setDeckError(null);
      setBusy(true);
      try {
        if (
          stored &&
          matchesSetup(stored, { player1, player2: name, categorySlug })
        ) {
          navigation.navigate('LocalGame');
          return;
        }

        const questions = await fetchGameDeck(categorySlug);
        if (questions.length === 0) {
          // A couple who has played everything in a category has succeeded at
          // the game. Say so here rather than opening a game with no cards.
          setDeckError(pl.localGame.deckEmpty);
          return;
        }

        await saveLocalGameState(
          startLocalGame({
            player1,
            player2: name,
            categorySlug,
            questions,
            // Shuffled per session, so a couple meets a different slice of the
            // twenty across sessions instead of the same first two every time.
            // Here rather than in buildQueue: sequencing stays deterministic,
            // and the order is the caller's call. Resuming reads the queue back
            // from disk already sealed, so it never reshuffles.
            challenges: shuffle(CHALLENGES),
            startedAt: new Date().toISOString(),
          }),
        );
        navigation.navigate('LocalGame');
      } catch (err) {
        setDeckError(parseApiError(err, pl.localGame.deckError).topLevel);
      } finally {
        setBusy(false);
      }
    },
    [navigation, player1, player2, stored],
  );

  const discard = useCallback(async () => {
    await clearLocalGameState();
    setStored(null);
  }, []);

  if (loadingStored) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={theme.colors.gold.primary} />
      </View>
    );
  }

  const resumeCounter = stored ? questionCounter(stored) : null;

  return (
    <CategoryList
      testID="local-game-setup-screen"
      title={pl.localGame.setupTitle}
      onSelect={start}
      disabled={busy}
      error={deckError}
      header={
        <View>
          {stored && resumeCounter && (
            <Card testID="local-game-resume" variant="gold" style={styles.resume}>
              <SectionLabel>{pl.localGame.resumeTitle}</SectionLabel>
              <Text testID="local-game-resume-summary" style={styles.resumeText}>
                {pl.localGame.resumeSummary(
                  stored.player2,
                  resumeCounter.current,
                  resumeCounter.total,
                )}
              </Text>
              <GoldButton
                testID="local-game-resume-button"
                title={pl.localGame.resumeButton}
                onPress={() => navigation.navigate('LocalGame')}
                style={styles.resumeButton}
              />
              <OutlineButton
                testID="local-game-discard"
                title={pl.localGame.restartButton}
                onPress={discard}
              />
            </Card>
          )}

          <TextField
            label={pl.localGame.player1Label}
            value={player1}
            editable={false}
            testID="local-game-player1"
          />

          <TextField
            label={pl.localGame.player2Label}
            value={player2}
            onChangeText={value => {
              setPlayer2(value);
              setNameError(null);
            }}
            placeholder={pl.localGame.player2Placeholder}
            hint={pl.localGame.player2Hint}
            error={nameError ?? undefined}
            autoCapitalize="words"
            testID="local-game-player2"
          />

          <Text style={styles.prompt}>{pl.localGame.categoryPrompt}</Text>
        </View>
      }
    />
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
    resume: {
      marginBottom: spacing.xl,
    },
    resumeText: {
      fontFamily: typography.family.body,
      fontSize: typography.size.body,
      color: colors.text.primary,
      marginTop: spacing.sm,
      marginBottom: spacing.lg,
    },
    resumeButton: {
      marginBottom: spacing.md,
    },
    prompt: {
      fontFamily: typography.family.body,
      fontSize: typography.size.bodySm,
      color: colors.text.muted,
      marginBottom: spacing.md,
    },
  });
};
