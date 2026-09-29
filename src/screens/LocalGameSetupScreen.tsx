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
import { loadPartnerName, savePartnerName } from '../storage/partnerName';
import { Card } from '../components/Card';
import { EarnCreditsActions } from '../components/EarnCreditsActions';
import { ScreenContainer } from '../components/ScreenContainer';
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
  //
  // The name typed into the last game wins over it, and is read from the device
  // in the mount effect below because storage is async. Nothing renders until
  // that effect has finished, so there is no window in which the couple could be
  // typing over an answer that is still on its way.
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
      // Read alongside the session rather than in an effect of its own: both are
      // one disk read on the way into this screen, and splitting them would mean
      // two spinners' worth of state for one wait.
      const [loaded, remembered] = await Promise.all([
        loadLocalGameState(),
        loadPartnerName(),
      ]);
      let saved = loaded;
      if (!active) {
        return;
      }
      if (remembered !== null) {
        setPlayer2(remembered);
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
        // Remembered here rather than as the couple types, so what comes back
        // next time is a name they actually played a game with — not whatever
        // the field happened to hold when they changed their mind and left.
        //
        // Best-effort, and deliberately NOT awaited into the try below: the deck
        // is dealt and on disk by now, so a store that fails must cost the couple
        // a convenience, not the game. Awaiting it here would send a storage
        // failure to the catch and tell them the questions could not be fetched,
        // over a session that had in fact just been dealt.
        savePartnerName(player2Name).catch(() => {});
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
   * Sends what the paused game still owes before anything replaces it.
   *
   * Usually nothing: the mount effect has already flushed the buffer. What is
   * left is what that flush could not send, and a new deal written over the
   * session would drop those cards for the map without a word. So the deal waits
   * for them, and if they still cannot be sent the paused game stays — the
   * couple can resume it, or try again with a connection.
   *
   * Read off disk rather than from `stored`: the disk is what the deal is about
   * to overwrite.
   */
  const settleOwedCards = useCallback(async (): Promise<boolean> => {
    const onDisk = await loadLocalGameState();
    if (onDisk === null || onDisk.pendingReport.length === 0) {
      return true;
    }
    try {
      await flush.mutateAsync(onDisk.pendingReport);
    } catch {
      setDeckError(pl.localGame.owedReportError);
      return false;
    }
    await saveLocalGameState(confirmReported(onDisk, onDisk.pendingReport));
    return true;
    // The mutation is stable for the life of the screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Starting, and the three things it can mean.
   *
   * The setup in the form is the one already paused on this phone: that session
   * is picked up rather than replaced. Same guard as the demo, and the reason it
   * earns its keep is that dealing a fresh deck would silently drop cards the
   * couple had played but not yet reported.
   *
   * A DIFFERENT setup, with a paused game on disk: ask first. There is one slot,
   * so this deal ends that game — and nothing on the button says so. The only
   * alternative to warning is a second slot, which is a feature rather than a
   * fix.
   *
   * Nothing paused: deal.
   */
  const start = useCallback(
    async () => {
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

      if (
        stored &&
        matchesSetup(stored, {
          player1,
          player2: name,
          // The stored session's own slug, deliberately. With the picker hidden
          // this screen no longer says anything about the category, so it cannot
          // disagree with one — and passing the null it now deals with would make
          // every game paused BEFORE this change fail the guard, warn the couple
          // that resuming will end their game, and then end it. matchesSetup
          // itself is right and stays untouched; what changed is that the
          // category left the setup.
          categorySlug: stored.categorySlug,
        })
      ) {
        setDeckError(null);
        navigation.navigate('LocalGame');
        return;
      }

      if (stored) {
        Alert.alert(pl.localGame.overwriteTitle, pl.localGame.overwriteMessage, [
          // Cancelling carries no action at all: the paused game is still on
          // disk and its card is still on screen, offering to resume.
          { text: pl.localGame.overwriteCancel, style: 'cancel' },
          {
            text: pl.localGame.overwriteConfirm,
            style: 'destructive',
            // Not awaited, and it cannot reject: both steps answer every
            // failure with a message on the screen.
            onPress: async () => {
              if (await settleOwedCards()) {
                await dealFresh(name, null, null);
              }
            },
          },
        ]);
        return;
      }

      // Null on both: the whole deck. The mix was always what "no category"
      // meant here, and it is now the only thing dealt.
      await dealFresh(name, null, null);
    },
    [dealFresh, navigation, player1, player2, settleOwedCards, stored],
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
            earn: false,
            title: pl.localGame.exhaustion.otherCategoriesTitle,
            body: pl.localGame.exhaustion.otherCategoriesBody,
            remaining: null,
            cta: null,
          },
          locked_available: {
            gold: false,
            // The one reason with something to earn: they have run out of FREE
            // cards while closed ones remain, so a credit is worth something.
            earn: true,
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
            // Nothing left to unlock, so nothing to earn credits FOR. Offering
            // the two ways here would be selling a couple something that does
            // not exist — the same reason this branch has no CTA either.
            earn: false,
            title: pl.localGame.exhaustion.completeTitle,
            body: pl.localGame.exhaustion.completeBody,
            remaining: null,
            cta: null,
          },
        }[exhaustion.reason];

  return (
    <ScreenContainer testID="local-game-setup-screen">
      <Text style={styles.title}>{pl.localGame.setupTitle}</Text>
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

              {/* The funnel used to end at the deck screen, which answers "what
                  can I unlock" but not "how do I afford it". These two do, they
                  have existed since P5 and P6, and until now there was no way to
                  reach them from the moment a couple actually wants them.

                  Secondary to the unlock on purpose: the deck is the direct
                  answer, these are the ways to pay for it. */}
              {exhaustionPanel.earn && (
                <View testID="local-game-exhaustion-earn" style={styles.earn}>
                  <SectionLabel>
                    {pl.localGame.exhaustion.earnTitle}
                  </SectionLabel>
                  <Text style={styles.exhaustionText}>
                    {pl.localGame.exhaustion.earnBody}
                  </Text>
                  <EarnCreditsActions
                    testID="local-game-exhaustion"
                    style={styles.earnAction}
                  />
                </View>
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

      </View>

      {/* One button where the category tiles used to be. The deck is the whole
          deck now; picking a slice of it is hidden, not removed — the model,
          the API and the funnel's "try another category" branch are all
          untouched, so the tiles come back by being rendered again. */}
      <GoldButton
        testID="local-game-start"
        title={pl.localGame.startButton}
        onPress={start}
        loading={busy}
        style={styles.start}
      />

      {deckError && (
        <Text testID="local-game-setup-error" style={styles.error}>
          {deckError}
        </Text>
      )}
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
    earn: {
      marginTop: spacing.xxl,
    },
    earnAction: {
      marginTop: spacing.md,
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
    title: {
      fontFamily: typography.family.heading,
      fontSize: typography.size.h1,
      color: colors.text.primary,
      marginBottom: spacing.xl,
    },
    start: {
      marginTop: spacing.xl,
    },
    error: {
      fontFamily: typography.family.body,
      fontSize: typography.size.bodySm,
      color: colors.burgundy.accent,
      marginTop: spacing.md,
    },
  });
};
