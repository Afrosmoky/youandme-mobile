import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Alert, type AlertButton } from 'react-native';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderWithQueryClient } from '../test/renderWithQueryClient';
import { LocalGameSetupScreen } from './LocalGameSetupScreen';
import { listCategories } from '../api/categories';
import {
  type DeckExhaustion,
  fetchGameDeck,
  reportPlayedCards,
} from '../api/localGame';
import { useAuth } from '../auth/AuthContext';
import { startLocalGame } from '../domain/localGame';
import {
  clearLocalGameState,
  loadLocalGameState,
  saveLocalGameState,
} from '../storage/localGameState';
import type { RootStackParamList } from '../navigation/types';
import type { Couple, Question, User } from '../domain/types';
import { pl } from '../i18n/pl';

jest.mock('../api/categories', () => ({ listCategories: jest.fn() }));
jest.mock('../api/localGame', () => ({
  fetchGameDeck: jest.fn(),
  reportPlayedCards: jest.fn(),
}));
jest.mock('../auth/AuthContext', () => ({ useAuth: jest.fn() }));

type Props = NativeStackScreenProps<RootStackParamList, 'LocalGameSetup'>;

const user = { nickname: 'piotr_s' } as User;
const couple = { partnerNameLocal: 'Wiktoria' } as Couple;

const categories = [
  {
    slug: 'randka',
    name: 'Randka',
    description: null,
    tone: null,
    premiumOnly: false,
    ordering: 1,
  },
];

const question = (n: number): Question => ({
  ulid: `Q${n}`,
  body: `Pytanie ${n}?`,
  type: 'session',
  category: { slug: 'randka', name: 'Randka' },
  tags: [],
  options: null,
  liked: false,
  isLocked: false,
});

// The deck endpoint answers with a pool and, when that pool is empty, a reason
// (S4a). Both suites below deal decks through this.
const deck = (questions: Question[], exhaustion: DeckExhaustion | null = null) =>
  ({ questions, exhaustion });

const navigate = jest.fn();

function makeProps(): Props {
  return {
    navigation: { navigate, setOptions: jest.fn(), replace: jest.fn() },
    route: { key: 'LocalGameSetup', name: 'LocalGameSetup', params: undefined },
  } as unknown as Props;
}

const renderScreen = () =>
  renderWithQueryClient(<LocalGameSetupScreen {...makeProps()} />);

describe('LocalGameSetupScreen', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await clearLocalGameState();
    jest.mocked(listCategories).mockResolvedValue(categories);
    jest.mocked(fetchGameDeck).mockResolvedValue(deck([question(1), question(2)]));
    jest
      .mocked(reportPlayedCards)
      .mockResolvedValue({ playedTotal: 0, newlyPlayed: 0 });
    jest.mocked(useAuth).mockReturnValue({ user, couple } as ReturnType<
      typeof useAuth
    >);
  });

  test('shows the logged-in nickname as player one, read-only', async () => {
    renderScreen();

    expect(await screen.findByTestId('local-game-player1')).toHaveTextContent(
      'piotr_s',
    );
  });

  test('prefills player two from the couple partner name', async () => {
    renderScreen();

    expect(await screen.findByTestId('local-game-player2')).toHaveProp(
      'value',
      'Wiktoria',
    );
  });

  test('refuses to start without a name for player two', async () => {
    jest.mocked(useAuth).mockReturnValue({ user, couple: null } as ReturnType<
      typeof useAuth
    >);
    renderScreen();

    fireEvent.press(await screen.findByTestId('category-randka'));

    expect(
      await screen.findByTestId('local-game-player2-error'),
    ).toHaveTextContent(pl.localGame.player2Required);
    expect(fetchGameDeck).not.toHaveBeenCalled();
  });

  test('refuses a name past the sixty-character cap', async () => {
    renderScreen();
    fireEvent.changeText(
      await screen.findByTestId('local-game-player2'),
      'x'.repeat(61),
    );
    fireEvent.press(screen.getByTestId('category-randka'));

    expect(
      await screen.findByTestId('local-game-player2-error'),
    ).toHaveTextContent(pl.localGame.player2TooLong);
    expect(fetchGameDeck).not.toHaveBeenCalled();
  });

  test('a category fetches that deck and opens the game', async () => {
    renderScreen();

    fireEvent.press(await screen.findByTestId('category-randka'));

    await waitFor(() => expect(fetchGameDeck).toHaveBeenCalledWith('randka'));
    expect(navigate).toHaveBeenCalledWith('LocalGame');
  });

  test('mix fetches the deck with no category', async () => {
    renderScreen();

    fireEvent.press(await screen.findByTestId('category-mix'));

    await waitFor(() => expect(fetchGameDeck).toHaveBeenCalledWith(null));
  });

  test('starting writes a playable session to disk', async () => {
    renderScreen();
    fireEvent.press(await screen.findByTestId('category-randka'));

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('LocalGame'));

    const stored = await loadLocalGameState();
    expect(stored?.player1).toBe('piotr_s');
    expect(stored?.player2).toBe('Wiktoria');
    expect(stored?.categorySlug).toBe('randka');
    // Snapshotted at the deal, so the resume card can name what is waiting
    // without going back to the categories list for it.
    expect(stored?.categoryName).toBe('Randka');
    expect(stored?.queue).toHaveLength(2);
    expect(stored?.cursor).toBe(0);
  });

  test('the mix deck is stored as no category at all', async () => {
    renderScreen();
    fireEvent.press(await screen.findByTestId('category-mix'));

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('LocalGame'));

    const stored = await loadLocalGameState();
    expect(stored?.categorySlug).toBeNull();
    expect(stored?.categoryName).toBeNull();
  });

  // An exhausted category is a success, not a failure — and it must not open a
  // game with nothing in it. With no reason to go on this is all the screen can
  // say; the three reasons that CAN be told apart have their own suite below.
  test('an empty deck with no reason falls back to the neutral message', async () => {
    jest.mocked(fetchGameDeck).mockResolvedValue(deck([]));
    renderScreen();

    fireEvent.press(await screen.findByTestId('category-randka'));

    expect(await screen.findByTestId('category-list-error')).toHaveTextContent(
      pl.localGame.deckEmpty,
    );
    expect(screen.queryByTestId('local-game-exhaustion')).toBeNull();
    expect(navigate).not.toHaveBeenCalled();
    expect(await loadLocalGameState()).toBeNull();
  });

  test('a failed deck fetch surfaces an error and starts nothing', async () => {
    jest.mocked(fetchGameDeck).mockRejectedValue(new Error('network'));
    renderScreen();

    fireEvent.press(await screen.findByTestId('category-randka'));

    expect(await screen.findByTestId('category-list-error')).toBeOnTheScreen();
    expect(navigate).not.toHaveBeenCalled();
  });
});

// S4b: an empty pool used to look exactly like a failed request — one red line
// in the error slot, saying "pick another category" whether or not there was
// another category to pick. Three reasons, three answers, and the panel is a
// normal state of the game rather than something that went wrong.
describe('LocalGameSetupScreen — an exhausted deck', () => {
  const exhausted = (
    reason: DeckExhaustion['reason'],
    lockedRemaining = 0,
  ) =>
    jest
      .mocked(fetchGameDeck)
      .mockResolvedValue(deck([], { reason, lockedRemaining }));

  beforeEach(async () => {
    jest.clearAllMocks();
    await clearLocalGameState();
    jest.mocked(listCategories).mockResolvedValue(categories);
    jest
      .mocked(reportPlayedCards)
      .mockResolvedValue({ playedTotal: 0, newlyPlayed: 0 });
    jest.mocked(useAuth).mockReturnValue({ user, couple } as ReturnType<
      typeof useAuth
    >);
  });

  // The tiles below the panel are the action, so the panel does not repeat it.
  test('a spent category sends them back to the tiles, with no CTA', async () => {
    exhausted('other_categories');
    renderScreen();

    fireEvent.press(await screen.findByTestId('category-randka'));

    expect(
      await screen.findByTestId('local-game-exhaustion-body'),
    ).toHaveTextContent(pl.localGame.exhaustion.otherCategoriesBody);
    expect(screen.queryByTestId('local-game-exhaustion-cta')).toBeNull();
    // The tiles are still right there, and nothing was started.
    expect(screen.getByTestId('category-randka')).toBeOnTheScreen();
    expect(navigate).not.toHaveBeenCalled();
  });

  test('a paywall says so and counts what is behind it', async () => {
    exhausted('locked_available', 12);
    renderScreen();

    fireEvent.press(await screen.findByTestId('category-randka'));

    expect(
      await screen.findByTestId('local-game-exhaustion-body'),
    ).toHaveTextContent(pl.localGame.exhaustion.lockedBody);
    expect(
      screen.getByTestId('local-game-exhaustion-remaining'),
    ).toHaveTextContent(pl.localGame.exhaustion.lockedRemaining(12));
  });

  // The one CTA of the three, and it points at the screen that already owns
  // unlocking — cards with "unlock (1 credit)", credits, and the rewards link
  // in its header. Nothing about ads or premium is restated on this panel.
  test('the paywall CTA hands over to the deck screen', async () => {
    exhausted('locked_available', 3);
    renderScreen();

    fireEvent.press(await screen.findByTestId('category-randka'));
    fireEvent.press(await screen.findByTestId('local-game-exhaustion-cta'));

    expect(navigate).toHaveBeenCalledWith('Deck');
  });

  // A count of zero would contradict the reason it comes with, so it is left off
  // rather than printed.
  test('a paywall with no count left prints no count', async () => {
    exhausted('locked_available', 0);
    renderScreen();

    fireEvent.press(await screen.findByTestId('category-randka'));

    await screen.findByTestId('local-game-exhaustion');
    expect(screen.queryByTestId('local-game-exhaustion-remaining')).toBeNull();
    // The way onward still stands: credits are not the only way to unlock.
    expect(screen.getByTestId('local-game-exhaustion-cta')).toBeOnTheScreen();
  });

  // Selling more cards to a couple who has played every one of them would be
  // selling something that does not exist.
  test('a finished deck celebrates and offers nothing to unlock', async () => {
    exhausted('complete');
    renderScreen();

    fireEvent.press(await screen.findByTestId('category-randka'));

    expect(
      await screen.findByTestId('local-game-exhaustion-body'),
    ).toHaveTextContent(pl.localGame.exhaustion.completeBody);
    expect(screen.queryByTestId('local-game-exhaustion-cta')).toBeNull();
    expect(screen.queryByTestId('local-game-exhaustion-remaining')).toBeNull();
  });

  // The two channels stay apart: this is a state of the game, not a failure, so
  // it does not land in the slot that says something went wrong.
  test('exhaustion does not show up as an error', async () => {
    exhausted('complete');
    renderScreen();

    fireEvent.press(await screen.findByTestId('category-randka'));

    await screen.findByTestId('local-game-exhaustion');
    expect(screen.queryByTestId('category-list-error')).toBeNull();
  });

  // Otherwise the answer to the previous tap would stand over the next one.
  test('the panel is cleared by the next attempt', async () => {
    exhausted('complete');
    renderScreen();

    fireEvent.press(await screen.findByTestId('category-randka'));
    await screen.findByTestId('local-game-exhaustion');

    jest.mocked(fetchGameDeck).mockResolvedValue(deck([question(1)]));
    fireEvent.press(screen.getByTestId('category-mix'));

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('LocalGame'));
    expect(screen.queryByTestId('local-game-exhaustion')).toBeNull();
  });

  // A deck with cards in it is untouched by any of this — no panel, and the game
  // opens exactly as it did before S4b.
  test('a deck with cards opens the game and shows no panel', async () => {
    jest.mocked(fetchGameDeck).mockResolvedValue(deck([question(1)]));
    renderScreen();

    fireEvent.press(await screen.findByTestId('category-randka'));

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('LocalGame'));
    expect(screen.queryByTestId('local-game-exhaustion')).toBeNull();
    expect(await loadLocalGameState()).not.toBeNull();
  });
});

describe('LocalGameSetupScreen — a paused game', () => {
  const paused = (
    categorySlug: string | null = 'randka',
    categoryName: string | null = 'Randka',
  ) =>
    startLocalGame({
      player1: 'piotr_s',
      player2: 'Wiktoria',
      categorySlug,
      categoryName,
      questions: [question(1), question(2), question(3)],
      challenges: [],
      startedAt: '2026-08-05T18:00:00.000Z',
    });

  // There is one slot for a local game, so starting a different one ends the
  // paused one — and that now asks first. Every "deals a fresh deck" path in
  // this suite goes through the warning; these two helpers answer it, and the
  // warning itself is tested further down.
  let alert: jest.SpyInstance;

  const overwriteButtons = () =>
    alert.mock.calls.at(-1)?.[2] as AlertButton[] | undefined;

  const confirmOverwrite = async () => {
    const confirm = overwriteButtons()?.find(
      button => button.text === pl.localGame.overwriteConfirm,
    );
    await act(async () => {
      confirm?.onPress?.();
    });
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    await clearLocalGameState();
    alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    jest.mocked(listCategories).mockResolvedValue(categories);
    jest.mocked(fetchGameDeck).mockResolvedValue(deck([question(1)]));
    jest
      .mocked(reportPlayedCards)
      .mockResolvedValue({ playedTotal: 0, newlyPlayed: 0 });
    jest.mocked(useAuth).mockReturnValue({ user, couple } as ReturnType<
      typeof useAuth
    >);
  });

  // The category is on the card because there is one slot: this line is the only
  // place the couple can see WHICH game is waiting for them.
  test('offers to resume, naming the partner, the category and the position', async () => {
    await saveLocalGameState(paused());
    renderScreen();

    expect(
      await screen.findByTestId('local-game-resume-summary'),
    ).toHaveTextContent(
      pl.localGame.resumeSummary('Wiktoria', 'Randka', 1, 3),
    );
  });

  test('a mixed deck is named as one', async () => {
    await saveLocalGameState(paused(null, null));
    renderScreen();

    expect(
      await screen.findByTestId('local-game-resume-summary'),
    ).toHaveTextContent(
      pl.localGame.resumeSummary('Wiktoria', pl.localGame.resumeMix, 1, 3),
    );
  });

  // A session dealt before the name was recorded: the slug is a poor name, and
  // still better than dropping the line that says what is waiting.
  test('a session with no recorded name falls back to its slug', async () => {
    await saveLocalGameState(paused('randka', null));
    renderScreen();

    expect(
      await screen.findByTestId('local-game-resume-summary'),
    ).toHaveTextContent(pl.localGame.resumeSummary('Wiktoria', 'randka', 1, 3));
  });

  test('resuming opens the game without dealing a new deck', async () => {
    await saveLocalGameState(paused());
    renderScreen();

    fireEvent.press(await screen.findByTestId('local-game-resume-button'));

    expect(navigate).toHaveBeenCalledWith('LocalGame');
    expect(fetchGameDeck).not.toHaveBeenCalled();
  });

  test('starting over drops the stored session', async () => {
    await saveLocalGameState(paused());
    renderScreen();

    fireEvent.press(await screen.findByTestId('local-game-discard'));

    await waitFor(() =>
      expect(screen.queryByTestId('local-game-resume')).toBeNull(),
    );
    expect(await loadLocalGameState()).toBeNull();
  });

  // The demo's guard, and the reason it matters: dealing a fresh deck here would
  // silently drop the cards already played but not yet reported.
  test('the same setup picks the paused game up rather than redealing', async () => {
    await saveLocalGameState(paused());
    renderScreen();

    fireEvent.press(await screen.findByTestId('category-randka'));

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('LocalGame'));
    expect(fetchGameDeck).not.toHaveBeenCalled();
  });

  test('the same setup is picked up without a warning', async () => {
    await saveLocalGameState(paused());
    renderScreen();

    fireEvent.press(await screen.findByTestId('category-randka'));

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('LocalGame'));
    expect(alert).not.toHaveBeenCalled();
  });

  // One slot: this deal ends the paused game, and nothing on a category tile
  // says so. Asking is the only alternative to a second slot.
  test('a different setup warns before it overwrites the paused game', async () => {
    await saveLocalGameState(paused());
    renderScreen();

    fireEvent.press(await screen.findByTestId('category-mix'));

    await waitFor(() =>
      expect(alert).toHaveBeenCalledWith(
        pl.localGame.overwriteTitle,
        pl.localGame.overwriteMessage,
        expect.any(Array),
      ),
    );
    // Nothing has happened yet — the deck is dealt on the answer, not on the
    // question.
    expect(fetchGameDeck).not.toHaveBeenCalled();
    expect((await loadLocalGameState())?.categorySlug).toBe('randka');
  });

  test('cancelling the warning leaves the paused game where it was', async () => {
    await saveLocalGameState(paused());
    renderScreen();

    fireEvent.press(await screen.findByTestId('category-mix'));
    await waitFor(() => expect(alert).toHaveBeenCalled());

    // The cancel button carries no action at all: dismissing IS doing nothing.
    const cancel = overwriteButtons()?.find(
      button => button.text === pl.localGame.overwriteCancel,
    );
    expect(cancel?.style).toBe('cancel');
    expect(cancel?.onPress).toBeUndefined();

    expect(fetchGameDeck).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
    expect((await loadLocalGameState())?.categorySlug).toBe('randka');
    expect(screen.getByTestId('local-game-resume')).toBeOnTheScreen();
  });

  test('confirming the warning deals the new game over the old one', async () => {
    await saveLocalGameState(paused());
    renderScreen();

    fireEvent.press(await screen.findByTestId('category-mix'));
    await waitFor(() => expect(alert).toHaveBeenCalled());
    await confirmOverwrite();

    await waitFor(() => expect(fetchGameDeck).toHaveBeenCalledWith(null));
    expect(navigate).toHaveBeenCalledWith('LocalGame');
    expect((await loadLocalGameState())?.categorySlug).toBeNull();
  });

  test('a different partner deals a fresh deck', async () => {
    await saveLocalGameState(paused());
    renderScreen();

    fireEvent.changeText(
      await screen.findByTestId('local-game-player2'),
      'Ala',
    );
    fireEvent.press(screen.getByTestId('category-randka'));
    await waitFor(() => expect(alert).toHaveBeenCalled());
    await confirmOverwrite();

    await waitFor(() => expect(fetchGameDeck).toHaveBeenCalledWith('randka'));
    expect((await loadLocalGameState())?.player2).toBe('Ala');
  });

  // The safety net for the live report (S3c): the app was killed between playing
  // a card and the answer coming back, so the card is still owed. This runs on
  // mount — before the couple can tap a category and overwrite the buffer.
  test('an interrupted session resends what it still owes, on entry', async () => {
    const interrupted = {
      ...paused(),
      playedUlids: ['Q1', 'Q2'],
      pendingReport: ['Q1', 'Q2'],
    };
    await saveLocalGameState(interrupted);
    renderScreen();

    await waitFor(() =>
      expect(reportPlayedCards).toHaveBeenCalledWith(['Q1', 'Q2']),
    );
    // Still resumable — flushing is not finishing.
    expect(await screen.findByTestId('local-game-resume')).toBeOnTheScreen();
    expect(await loadLocalGameState()).not.toBeNull();
  });

  // Once the server has them, the resumed session must not carry them into its
  // next transition and send them again.
  test('a landed flush settles the buffer on disk', async () => {
    const interrupted = {
      ...paused(),
      playedUlids: ['Q1', 'Q2'],
      pendingReport: ['Q1', 'Q2'],
    };
    await saveLocalGameState(interrupted);
    renderScreen();

    await waitFor(() => expect(reportPlayedCards).toHaveBeenCalled());
    await waitFor(async () =>
      expect((await loadLocalGameState())?.pendingReport).toEqual([]),
    );
    // Played is the session's own count and stays as it was.
    expect((await loadLocalGameState())?.playedUlids).toEqual(['Q1', 'Q2']);
  });

  // The usual case since S3c: the cards went out as they were played.
  test('a session that owes nothing reports nothing', async () => {
    await saveLocalGameState({ ...paused(), playedUlids: ['Q1'] });
    renderScreen();

    await screen.findByTestId('local-game-resume');
    expect(reportPlayedCards).not.toHaveBeenCalled();
  });

  // The last card of a session: its report was still in flight when the game
  // screen went away, so nothing confirmed it. This is where it lands.
  test('a finished session is flushed and then cleared', async () => {
    const finished = {
      ...paused(),
      cursor: 3,
      playedUlids: ['Q1', 'Q2', 'Q3'],
      pendingReport: ['Q3'],
    };
    await saveLocalGameState(finished);
    renderScreen();

    await waitFor(() => expect(reportPlayedCards).toHaveBeenCalledWith(['Q3']));
    await waitFor(async () => expect(await loadLocalGameState()).toBeNull());
    expect(screen.queryByTestId('local-game-resume')).toBeNull();
  });

  test('a failed flush keeps the buffer for the next visit', async () => {
    jest.mocked(reportPlayedCards).mockRejectedValue(new Error('network'));
    const finished = {
      ...paused(),
      cursor: 3,
      playedUlids: ['Q1'],
      pendingReport: ['Q1'],
    };
    await saveLocalGameState(finished);
    renderScreen();

    await waitFor(() => expect(reportPlayedCards).toHaveBeenCalled());
    expect((await loadLocalGameState())?.pendingReport).toEqual(['Q1']);
  });

  test('a different category deals a fresh deck', async () => {
    await saveLocalGameState(paused());
    renderScreen();

    fireEvent.press(await screen.findByTestId('category-mix'));
    await waitFor(() => expect(alert).toHaveBeenCalled());
    await confirmOverwrite();

    await waitFor(() => expect(fetchGameDeck).toHaveBeenCalledWith(null));
    expect((await loadLocalGameState())?.categorySlug).toBeNull();
  });

  // A finished session is not a paused one: the mount effect clears it, so
  // nothing is offered back and nothing is at risk of being overwritten.
  test('a finished session neither offers a resume nor warns', async () => {
    await saveLocalGameState({
      ...paused(),
      cursor: 3,
      playedUlids: ['Q1', 'Q2', 'Q3'],
      pendingReport: [],
    });
    renderScreen();

    const mix = await screen.findByTestId('category-mix');
    await waitFor(() => expect(screen.queryByTestId('local-game-resume')).toBeNull());

    fireEvent.press(mix);

    await waitFor(() => expect(fetchGameDeck).toHaveBeenCalledWith(null));
    expect(alert).not.toHaveBeenCalled();
  });
});
