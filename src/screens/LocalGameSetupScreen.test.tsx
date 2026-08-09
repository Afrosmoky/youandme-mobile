import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderWithQueryClient } from '../test/renderWithQueryClient';
import { LocalGameSetupScreen } from './LocalGameSetupScreen';
import { listCategories } from '../api/categories';
import { fetchGameDeck, reportPlayedCards } from '../api/localGame';
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
    jest.mocked(fetchGameDeck).mockResolvedValue([question(1), question(2)]);
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
    expect(stored?.queue).toHaveLength(2);
    expect(stored?.cursor).toBe(0);
  });

  // An exhausted category is a success, not a failure — and it must not open a
  // game with nothing in it.
  test('an empty deck says so instead of opening an empty game', async () => {
    jest.mocked(fetchGameDeck).mockResolvedValue([]);
    renderScreen();

    fireEvent.press(await screen.findByTestId('category-randka'));

    expect(await screen.findByTestId('category-list-error')).toHaveTextContent(
      pl.localGame.deckEmpty,
    );
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

describe('LocalGameSetupScreen — a paused game', () => {
  const paused = () =>
    startLocalGame({
      player1: 'piotr_s',
      player2: 'Wiktoria',
      categorySlug: 'randka',
      questions: [question(1), question(2), question(3)],
      challenges: [],
      startedAt: '2026-08-05T18:00:00.000Z',
    });

  beforeEach(async () => {
    jest.clearAllMocks();
    await clearLocalGameState();
    jest.mocked(listCategories).mockResolvedValue(categories);
    jest.mocked(fetchGameDeck).mockResolvedValue([question(1)]);
    jest
      .mocked(reportPlayedCards)
      .mockResolvedValue({ playedTotal: 0, newlyPlayed: 0 });
    jest.mocked(useAuth).mockReturnValue({ user, couple } as ReturnType<
      typeof useAuth
    >);
  });

  test('offers to resume, naming the partner and the position', async () => {
    await saveLocalGameState(paused());
    renderScreen();

    expect(
      await screen.findByTestId('local-game-resume-summary'),
    ).toHaveTextContent(pl.localGame.resumeSummary('Wiktoria', 1, 3));
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

  test('a different partner deals a fresh deck', async () => {
    await saveLocalGameState(paused());
    renderScreen();

    fireEvent.changeText(
      await screen.findByTestId('local-game-player2'),
      'Ala',
    );
    fireEvent.press(screen.getByTestId('category-randka'));

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

    await waitFor(() => expect(fetchGameDeck).toHaveBeenCalledWith(null));
    expect((await loadLocalGameState())?.categorySlug).toBeNull();
  });
});
