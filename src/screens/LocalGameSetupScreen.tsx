import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useAuth } from '../auth/AuthContext';
import { DeckExhaustion, fetchGameDeck } from '../api/localGame';
import { parseApiError } from '../api/errors';
import { CHALLENGES } from '../domain/challenges';
import { shuffle } from '../domain/shuffle';
import {
  LocalGameState,
  confirmReported,
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
  // Why the last attempt came back with no cards (S4b). Separate from deckError
  // on purpose: that one means the app failed, this one means the couple has
  // played everything there was — and until now the two looked identical.
  const [exhaustion, setExhaustion] = useState<DeckExhaustion | null>(null);
  const [busy, setBusy] = useState(false);
  // The paused session, if there is one. Null once resumed or discarded.
  const [stored, setStored] = useState<LocalGameState | null>(null);
  const [loadingStored, setLoadingStored] = useState(true);
  // Sends whatever a previous session left owing — see the mount effect.
  const flush = useReportPlayedCards();

  useEffect(() => {
    let active = true;
    (async () => {
      let saved = await loadLocalGameState();
      if (!active) {
        return;
      }

      // The safety net for the live report (S3c), and it runs before anything
      // else can touch the stored state — on mount, before the couple can tap a
      // category and overwrite it.
      //
      // Since the game screen settles up on every transition, a session usually
      // arrives here owing nothing. What lands in `pendingReport` is what the
      // live path could not finish: the phone died between playing a card and
      // the answer coming back, or the last request of a session was still in
      // flight when the screen went away. Resending is free — the endpoint keeps
      // a set, so cards already counted come back as newly_played: 0.
      let reported = true;
      if (saved !== null && saved.pendingReport.length > 0) {
        try {
          await flush.mutateAsync(saved.pendingReport);
          // Settle the buffer on disk too, so a resumed session does not carry
          // cards the server has already confirmed into its next transition.
          saved = confirmReported(saved, saved.pendingReport);
          await saveLocalGameState(saved);
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
   * Deals a deck and writes a fresh session over whatever was on disk.
   *
   * One slot is the reason this is its own step: everything that decides WHETHER
   * to reach it — the resume guard, the warning below — happens before it,
   * because by the time it runs the paused game is gone.
   */
  const dealFresh = useCallback(
    async (
      player2Name: string,
      categorySlug: string | null,
      categoryName: string | null,
    ) => {
      setDeckError(null);
      // Cleared on the way IN, so a second tap does not leave the panel from the
      // category before it standing over a different answer.
      setExhaustion(null);
      setBusy(true);
      try {
        const { questions, exhaustion: why } = await fetchGameDeck(categorySlug);
        if (questions.length === 0) {
          // Not an error, and since S4b not dressed as one: an empty pool goes
          // to its own panel, while setDeckError stays what it has always been
          // — the line that says something went wrong. A couple who has played
          // everything has succeeded at the game, and the panel can say which
          // kind of success it is.
          //
          // No reason (an older backend, or one this build cannot read) falls
          // back to the neutral message in the error slot, exactly as before.
          if (why === null) {
            setDeckError(pl.localGame.deckEmpty);
          } else {
            setExhaustion(why);
          }
          return;
        }

        const fresh = startLocalGame({
          player1,
          player2: player2Name,
          categorySlug,
          // Snapshotted with the session, so the resume card can name what is
          // waiting without a second read of the categories list.
          categoryName,
          questions,
          // Shuffled per session, so a couple meets a different slice of the
          // twenty across sessions instead of the same first two every time.
          // Here rather than in buildQueue: sequencing stays deterministic,
          // and the order is the caller's call. Resuming reads the queue back
          // from disk already sealed, so it never reshuffles.
          challenges: shuffle(CHALLENGES),
          startedAt: new Date().toISOString(),
        });
        await saveLocalGameState(fresh);
        // This screen stays mounted under the game, so what it believes is on
        // disk has to keep up: leave the old session here and a second tap on
        // the same category would warn about — and then redeal over — the game
        // that was just dealt.
        setStored(fresh);
        navigation.navigate('LocalGame');
      } catch (err) {
        setDeckError(parseApiError(err, pl.localGame.deckError).topLevel);
      } finally {
        setBusy(false);
      }
    },
    [navigation, player1],
  );

  /**
   * A tapped category, and the three things it can mean.
   *
   * The setup in the form is the one already paused on this phone: that session
   * is picked up rather than replaced. Same guard as the demo, and the reason it
   * earns its keep is that dealing a fresh deck would silently drop cards the
   * couple had played but not yet reported.
   *
   * A DIFFERENT setup, with a paused game on disk: ask first. There is one slot,
   * so this deal ends that game — and nothing on a category tile says so. The
   * only alternative to warning is a second slot, which is a feature rather than
   * a fix.
   *
   * Nothing paused: deal.
   */
  const start = useCallback(
    async (categorySlug: string | null, categoryName: string | null) => {
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
  // What the couple chose, in that order of preference: the name snapshotted at
  // the deal; the slug, for a session dealt before that field existed; and the
  // mix label, which is what "no category" actually means here.
  const resumeCategory = stored
    ? stored.categoryName ?? stored.categorySlug ?? pl.localGame.resumeMix
    : null;

  // What an empty pool says, per reason. One place, so the three cases cannot
  // drift apart, and the screen below stays a layout rather than a decision.
  //
  // The CTA exists for exactly one of them. `other_categories` needs none — the
  // category tiles are right underneath, which IS the action. `complete` needs
  // none either, and this is the part worth being deliberate about: offering to
  // unlock more to a couple who has played the whole deck would be selling them
  // something that does not exist. That leaves `locked_available`, whose way
  // onward is P7's deck screen — the list of closed cards with "unlock (1
  // credit)" on each and the rewards link in its header. Nothing about credits,
  // ads or premium is restated here; this panel points at the screen that owns
  // all three.
  const exhaustionPanel =
    exhaustion === null
      ? null
      : {
          other_categories: {
            gold: false,
            title: pl.localGame.exhaustion.otherCategoriesTitle,
            body: pl.localGame.exhaustion.otherCategoriesBody,
            remaining: null,
            cta: null,
          },
          locked_available: {
            gold: false,
            title: pl.localGame.exhaustion.lockedTitle,
            body: pl.localGame.exhaustion.lockedBody,
            // Zero locked cards left with this reason would contradict itself,
            // so the line is simply left off rather than printed as "0".
            remaining:
              exhaustion.lockedRemaining > 0
                ? pl.localGame.exhaustion.lockedRemaining(
                    exhaustion.lockedRemaining,
                  )
                : null,
            cta: pl.localGame.exhaustion.lockedCta,
          },
          complete: {
            gold: true,
            title: pl.localGame.exhaustion.completeTitle,
            body: pl.localGame.exhaustion.completeBody,
            remaining: null,
            cta: null,
          },
        }[exhaustion.reason];

  return (
    <CategoryList
      testID="local-game-setup-screen"
      title={pl.localGame.setupTitle}
      onSelect={start}
      disabled={busy}
      error={deckError}
      header={
        <View>
          {/* Above the resume card and the form, because it answers the tap the
              couple just made — and it sits in the same column as the tiles they
              will tap next. */}
          {exhaustionPanel && (
            <Card
              testID="local-game-exhaustion"
              variant={exhaustionPanel.gold ? 'gold' : undefined}
              style={styles.exhaustion}>
              <SectionLabel>{exhaustionPanel.title}</SectionLabel>
              <Text
                testID="local-game-exhaustion-body"
                style={styles.exhaustionText}>
                {exhaustionPanel.body}
              </Text>
              {exhaustionPanel.remaining && (
                <Text
                  testID="local-game-exhaustion-remaining"
                  style={styles.exhaustionRemaining}>
                  {exhaustionPanel.remaining}
                </Text>
              )}
              {exhaustionPanel.cta && (
                <GoldButton
                  testID="local-game-exhaustion-cta"
                  title={exhaustionPanel.cta}
                  onPress={() => navigation.navigate('Deck')}
                  style={styles.exhaustionCta}
                />
              )}
            </Card>
          )}

          {stored && resumeCounter && resumeCategory && (
            <Card testID="local-game-resume" variant="gold" style={styles.resume}>
              <SectionLabel>{pl.localGame.resumeTitle}</SectionLabel>
              <Text testID="local-game-resume-summary" style={styles.resumeText}>
                {pl.localGame.resumeSummary(
                  stored.player2,
                  resumeCategory,
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
    exhaustion: {
      marginBottom: spacing.xl,
    },
    exhaustionText: {
      fontFamily: typography.family.body,
      fontSize: typography.size.body,
      color: colors.text.primary,
      marginTop: spacing.sm,
    },
    exhaustionRemaining: {
      fontFamily: typography.family.body,
      fontSize: typography.size.bodySm,
      color: colors.text.secondary,
      marginTop: spacing.sm,
    },
    exhaustionCta: {
      marginTop: spacing.lg,
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
