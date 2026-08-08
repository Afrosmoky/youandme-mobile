import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderWithQueryClient } from '../test/renderWithQueryClient';
import { LocalGameScreen } from './LocalGameScreen';
import { startLocalGame } from '../domain/localGame';
import {
  clearLocalGameState,
  loadLocalGameState,
  saveLocalGameState,
} from '../storage/localGameState';
import { createLocalMemory } from '../api/memories';
import type { RootStackParamList } from '../navigation/types';
import type { Challenge } from '../domain/challenges';
import type { Memory, Question } from '../domain/types';
import { pl } from '../i18n/pl';

jest.mock('../api/memories', () => ({ createLocalMemory: jest.fn() }));

type Props = NativeStackScreenProps<RootStackParamList, 'LocalGame'>;

const question = (n: number): Question => ({
  ulid: `Q${n}`,
  body: `Pytanie ${n}?`,
  type: 'session',
  category: { slug: 'randka', name: 'Randka' },
  tags: [],
  liked: false,
  isLocked: false,
});

const challenge: Challenge = {
  id: 'gazechallenge',
  title: 'Wyzwanie Spojrzeń',
  description: 'Patrzcie sobie w oczy przez minutę.',
};

const popTo = jest.fn();
const replace = jest.fn();

function makeProps(): Props {
  return {
    navigation: { popTo, replace, setOptions: jest.fn(), navigate: jest.fn() },
    route: { key: 'LocalGame', name: 'LocalGame', params: undefined },
  } as unknown as Props;
}

// A session of `count` questions, with a challenge every `interval` cards.
const session = (count: number, interval = 5) =>
  startLocalGame({
    player1: 'piotr_s',
    player2: 'Wiktoria',
    categorySlug: 'randka',
    questions: Array.from({ length: count }, (_, i) => question(i + 1)),
    challenges: [challenge],
    interval,
    startedAt: '2026-08-05T18:00:00.000Z',
  });

const renderScreen = () =>
  renderWithQueryClient(<LocalGameScreen {...makeProps()} />);

describe('LocalGameScreen', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await clearLocalGameState();
  });

  test('shows the card number and whose turn it is', async () => {
    await saveLocalGameState(session(20));
    renderScreen();

    expect(await screen.findByTestId('local-game-header')).toHaveTextContent(
      pl.localGame.cardHeader(1, 20, 'piotr_s'),
    );
    expect(screen.getByTestId('local-game-question')).toHaveTextContent(
      'Pytanie 1?',
    );
  });

  test('with nothing stored it sends the couple back to the setup', async () => {
    renderScreen();

    await waitFor(() => expect(replace).toHaveBeenCalledWith('LocalGameSetup'));
  });

  test('the primary button hands the phone over, then moves on', async () => {
    await saveLocalGameState(session(20));
    renderScreen();

    const primary = await screen.findByTestId('local-game-primary');
    expect(primary).toHaveTextContent(pl.localGame.passButton);

    fireEvent.press(primary);

    // Same card, other player.
    await waitFor(() =>
      expect(screen.getByTestId('local-game-header')).toHaveTextContent(
        pl.localGame.cardHeader(1, 20, 'Wiktoria'),
      ),
    );
    expect(screen.getByTestId('local-game-primary')).toHaveTextContent(
      pl.localGame.nextButton,
    );
  });

  test('moving on deals the next card and hands the phone back', async () => {
    await saveLocalGameState(session(20));
    renderScreen();

    fireEvent.press(await screen.findByTestId('local-game-primary'));
    await waitFor(() =>
      expect(screen.getByTestId('local-game-primary')).toHaveTextContent(
        pl.localGame.nextButton,
      ),
    );
    fireEvent.press(screen.getByTestId('local-game-primary'));

    await waitFor(() =>
      expect(screen.getByTestId('local-game-header')).toHaveTextContent(
        pl.localGame.cardHeader(2, 20, 'piotr_s'),
      ),
    );
  });

  test('skipping moves on without a handover', async () => {
    await saveLocalGameState(session(20));
    renderScreen();

    fireEvent.press(await screen.findByTestId('local-game-skip'));

    await waitFor(() =>
      expect(screen.getByTestId('local-game-question')).toHaveTextContent(
        'Pytanie 2?',
      ),
    );
  });

  test('every transition is written to disk, so a pause resumes in place', async () => {
    await saveLocalGameState(session(20));
    renderScreen();

    fireEvent.press(await screen.findByTestId('local-game-skip'));

    await waitFor(async () =>
      expect((await loadLocalGameState())?.cursor).toBe(1),
    );
    // And the skipped card is on its way to the report.
    expect((await loadLocalGameState())?.playedUlids).toEqual(['Q1']);
  });

  test('the answer field is hidden until asked for', async () => {
    await saveLocalGameState(session(20));
    renderScreen();

    expect(screen.queryByTestId('local-game-answer')).toBeNull();

    fireEvent.press(await screen.findByTestId('local-game-write-toggle'));

    expect(screen.getByTestId('local-game-answer')).toBeOnTheScreen();
  });

  test('what one player types belongs to their turn only', async () => {
    await saveLocalGameState(session(20));
    renderScreen();

    fireEvent.press(await screen.findByTestId('local-game-write-toggle'));
    fireEvent.changeText(
      screen.getByTestId('local-game-answer'),
      'moja odpowiedź',
    );
    // Hand over, then open the field again: player two starts from blank.
    fireEvent.press(screen.getByTestId('local-game-primary'));
    await waitFor(() =>
      expect(screen.queryByTestId('local-game-answer')).toBeNull(),
    );
    fireEvent.press(screen.getByTestId('local-game-write-toggle'));

    expect(screen.getByTestId('local-game-answer')).toHaveProp('value', '');
  });

  test('a challenge gets its own layout and a single way onward', async () => {
    // Interval 1: question, challenge, question.
    await saveLocalGameState(session(3, 1));
    renderScreen();

    fireEvent.press(await screen.findByTestId('local-game-skip'));

    expect(
      await screen.findByTestId('local-game-challenge-title'),
    ).toHaveTextContent(challenge.title);
    // No turns, no skip, no answer on a challenge.
    expect(screen.queryByTestId('local-game-skip')).toBeNull();
    expect(screen.queryByTestId('local-game-write-toggle')).toBeNull();
    expect(screen.getByTestId('local-game-primary')).toHaveTextContent(
      pl.localGame.challengeDoneButton,
    );
  });

  test('a challenge adds nothing to the report', async () => {
    await saveLocalGameState(session(3, 1));
    renderScreen();

    fireEvent.press(await screen.findByTestId('local-game-skip'));
    fireEvent.press(await screen.findByTestId('local-game-primary'));

    await waitFor(async () =>
      expect((await loadLocalGameState())?.playedUlids).toEqual(['Q1']),
    );
  });

  test('the end of the queue hands over to the summary', async () => {
    await saveLocalGameState(session(1));
    renderScreen();

    fireEvent.press(await screen.findByTestId('local-game-skip'));

    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith('LocalGameSummary'),
    );
  });

  // The app killed on the last card: the session is over but was never
  // summarised, so its played cards were never reported.
  test('a finished session found on disk goes straight to the summary', async () => {
    const finished = { ...session(1), cursor: 1, playedUlids: ['Q1'] };
    await saveLocalGameState(finished);
    renderScreen();

    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith('LocalGameSummary'),
    );
  });

  // Leaving mid-game is a pause: the state stays put and the setup screen offers
  // it back.
  test('pausing leaves the session on disk', async () => {
    await saveLocalGameState(session(20));
    renderScreen();

    fireEvent.press(await screen.findByTestId('local-game-skip'));
    await waitFor(async () =>
      expect((await loadLocalGameState())?.cursor).toBe(1),
    );

    expect(await loadLocalGameState()).not.toBeNull();
  });
});

describe('LocalGameScreen — saving a card as a memory', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await clearLocalGameState();
    jest.mocked(createLocalMemory).mockResolvedValue({} as Memory);
  });

  // Both answers written, on the current card.
  const answerBoth = async () => {
    fireEvent.press(await screen.findByTestId('local-game-write-toggle'));
    fireEvent.changeText(screen.getByTestId('local-game-answer'), 'moja');
    fireEvent.press(screen.getByTestId('local-game-primary'));
    await waitFor(() =>
      expect(screen.getByTestId('local-game-primary')).toHaveTextContent(
        pl.localGame.nextButton,
      ),
    );
    fireEvent.press(screen.getByTestId('local-game-write-toggle'));
    fireEvent.changeText(screen.getByTestId('local-game-answer'), 'jej');
  };

  test('the save is dead until both have written', async () => {
    await saveLocalGameState(session(20));
    renderScreen();

    expect(await screen.findByTestId('local-game-save')).toBeDisabled();

    fireEvent.press(screen.getByTestId('local-game-write-toggle'));
    fireEvent.changeText(screen.getByTestId('local-game-answer'), 'tylko ja');

    expect(screen.getByTestId('local-game-save')).toBeDisabled();
  });

  test('saving sends both answers and the second player name', async () => {
    await saveLocalGameState(session(20));
    renderScreen();
    await answerBoth();

    fireEvent.press(screen.getByTestId('local-game-save'));

    await waitFor(() =>
      expect(createLocalMemory).toHaveBeenCalledWith(
        expect.objectContaining({
          questionUlid: 'Q1',
          answerA: 'moja',
          answerB: 'jej',
          playerBName: 'Wiktoria',
        }),
      ),
    );
  });

  test('a saved card says so and cannot be saved twice', async () => {
    await saveLocalGameState(session(20));
    renderScreen();
    await answerBoth();

    fireEvent.press(screen.getByTestId('local-game-save'));

    expect(await screen.findByTestId('local-game-saved')).toHaveTextContent(
      pl.localGame.savedBadge,
    );
    expect(screen.queryByTestId('local-game-save')).toBeNull();
    expect((await loadLocalGameState())?.savedMemoryUlids).toEqual(['Q1']);
  });

  test('the couple stays on the card after saving', async () => {
    await saveLocalGameState(session(20));
    renderScreen();
    await answerBoth();

    fireEvent.press(screen.getByTestId('local-game-save'));
    await screen.findByTestId('local-game-saved');

    expect(screen.getByTestId('local-game-question')).toHaveTextContent(
      'Pytanie 1?',
    );
  });

  test('a failed save is shown and changes nothing', async () => {
    jest.mocked(createLocalMemory).mockRejectedValue(new Error('network'));
    await saveLocalGameState(session(20));
    renderScreen();
    await answerBoth();

    fireEvent.press(screen.getByTestId('local-game-save'));

    expect(
      await screen.findByTestId('local-game-save-error'),
    ).toBeOnTheScreen();
    expect((await loadLocalGameState())?.savedMemoryUlids).toEqual([]);
  });

  // Saving is not playing: the map moves on the report, not here.
  test('saving does not touch the played buffer', async () => {
    await saveLocalGameState(session(20));
    renderScreen();
    await answerBoth();

    fireEvent.press(screen.getByTestId('local-game-save'));
    await screen.findByTestId('local-game-saved');

    expect((await loadLocalGameState())?.playedUlids).toEqual([]);
  });
});
