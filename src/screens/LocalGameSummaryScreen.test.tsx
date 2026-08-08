import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { screen, waitFor } from '@testing-library/react-native';
import { renderWithQueryClient } from '../test/renderWithQueryClient';
import { LocalGameSummaryScreen } from './LocalGameSummaryScreen';
import { reportPlayedCards } from '../api/localGame';
import { getProgress } from '../api/progress';
import { advance, startLocalGame, markMemorySaved } from '../domain/localGame';
import {
  clearLocalGameState,
  loadLocalGameState,
  saveLocalGameState,
} from '../storage/localGameState';
import type { RootStackParamList } from '../navigation/types';
import type { Progress, Question } from '../domain/types';
import { pl } from '../i18n/pl';

jest.mock('../api/localGame', () => ({ reportPlayedCards: jest.fn() }));
jest.mock('../api/progress', () => ({ getProgress: jest.fn() }));

type Props = NativeStackScreenProps<RootStackParamList, 'LocalGameSummary'>;

const question = (n: number): Question => ({
  ulid: `Q${n}`,
  body: `Pytanie ${n}?`,
  type: 'session',
  category: null,
  tags: [],
  liked: false,
  isLocked: false,
});

const milestone = (threshold: number, unlocked: boolean) => ({
  slug: `m${threshold}`,
  name: `Kamień ${threshold}`,
  threshold,
  ordering: 1,
  unlocked,
  unlockedAt: unlocked ? '2026-08-05T18:00:00.000Z' : null,
});

const progressWith = (unlocked: boolean): Progress => ({
  totalPlayed: unlocked ? 10 : 4,
  nextThreshold: unlocked ? null : 10,
  milestones: [milestone(10, unlocked)],
});

const popTo = jest.fn();
const replace = jest.fn();

function makeProps(): Props {
  return {
    navigation: { popTo, replace, setOptions: jest.fn(), navigate: jest.fn() },
    route: { key: 'LocalGameSummary', name: 'LocalGameSummary', params: undefined },
  } as unknown as Props;
}

// A played-out session: three cards left behind, one challenge seen, one saved.
const playedOut = () => {
  let state = startLocalGame({
    player1: 'piotr_s',
    player2: 'Wiktoria',
    categorySlug: 'randka',
    questions: [question(1), question(2), question(3)],
    challenges: [{ id: 'c1', title: 'Wyzwanie', description: '...' }],
    interval: 2,
    startedAt: '2026-08-05T18:00:00.000Z',
  });
  state = markMemorySaved(state, 'Q1');
  // queue: q1 q2 C q3 — walk all four positions.
  for (let i = 0; i < 4; i++) {
    state = advance(state);
  }
  return state;
};

const renderScreen = () =>
  renderWithQueryClient(<LocalGameSummaryScreen {...makeProps()} />);

describe('LocalGameSummaryScreen', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await clearLocalGameState();
    jest
      .mocked(reportPlayedCards)
      .mockResolvedValue({ playedTotal: 3, newlyPlayed: 3 });
    jest.mocked(getProgress).mockResolvedValue(progressWith(false));
  });

  test('counts the cards, the challenges and the saved memories', async () => {
    await saveLocalGameState(playedOut());
    renderScreen();

    expect(
      await screen.findByTestId('local-game-summary-questions'),
    ).toHaveTextContent(pl.localGame.summaryQuestions(3));
    expect(screen.getByTestId('local-game-summary-challenges')).toHaveTextContent(
      pl.localGame.summaryChallenges(1),
    );
    expect(screen.getByTestId('local-game-summary-memories')).toHaveTextContent(
      pl.localGame.summaryMemories(1),
    );
  });

  test('reports the played cards once', async () => {
    await saveLocalGameState(playedOut());
    renderScreen();

    await waitFor(() =>
      expect(reportPlayedCards).toHaveBeenCalledWith(['Q1', 'Q2', 'Q3']),
    );
    expect(reportPlayedCards).toHaveBeenCalledTimes(1);
  });

  test('clears the session once the report has landed', async () => {
    await saveLocalGameState(playedOut());
    renderScreen();

    await waitFor(async () =>
      expect(await loadLocalGameState()).toBeNull(),
    );
  });

  // The buffer is the only thing the server still wants — losing it because one
  // request failed would cost the couple the whole session's progress.
  test('a failed report keeps the session for the setup screen to retry', async () => {
    jest.mocked(reportPlayedCards).mockRejectedValue(new Error('network'));
    await saveLocalGameState(playedOut());
    renderScreen();

    expect(
      await screen.findByTestId('local-game-report-pending'),
    ).toHaveTextContent(pl.localGame.reportPending);
    expect((await loadLocalGameState())?.playedUlids).toEqual([
      'Q1',
      'Q2',
      'Q3',
    ]);
  });

  // The ordering that makes the celebration possible at all: the milestone hook
  // needs a reading of the map from BEFORE the report moved it, or its first
  // reading is already the new one and nothing ever fires.
  test('waits for the progress baseline before reporting', async () => {
    let releaseProgress: (value: Progress) => void = () => {};
    jest
      .mocked(getProgress)
      .mockReturnValue(
        new Promise<Progress>(resolve => {
          releaseProgress = resolve;
        }),
      );
    await saveLocalGameState(playedOut());
    renderScreen();

    await screen.findByTestId('local-game-summary-questions');
    expect(reportPlayedCards).not.toHaveBeenCalled();

    releaseProgress(progressWith(false));

    await waitFor(() => expect(reportPlayedCards).toHaveBeenCalled());
  });

  test('celebrates a milestone the report just unlocked', async () => {
    jest
      .mocked(getProgress)
      .mockResolvedValueOnce(progressWith(false))
      .mockResolvedValue(progressWith(true));
    await saveLocalGameState(playedOut());
    renderScreen();

    expect(
      await screen.findByText(pl.celebration.milestoneTitle),
    ).toBeOnTheScreen();
  });

  // The report invalidates the map, so a fresh reading lands moments after the
  // session has been cleared from disk. Nothing about that second reading may
  // send the couple anywhere — they are looking at their summary, and the
  // celebration may not even be on screen yet.
  test('stays on the summary after the report refetches the map', async () => {
    jest
      .mocked(getProgress)
      .mockResolvedValueOnce(progressWith(false))
      .mockResolvedValue(progressWith(true));
    await saveLocalGameState(playedOut());
    renderScreen();

    // The session is gone and the refetch has landed (the celebration only
    // fires on the second reading).
    await waitFor(async () => expect(await loadLocalGameState()).toBeNull());
    await screen.findByText(pl.celebration.milestoneTitle);

    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByTestId('local-game-summary-questions')).toBeOnTheScreen();
  });

  // A map that is down must not strand the couple on a spinner, and must not
  // swallow their progress either.
  test('reports anyway when the progress map cannot be read', async () => {
    jest.mocked(getProgress).mockRejectedValue(new Error('network'));
    await saveLocalGameState(playedOut());
    renderScreen();

    await waitFor(() => expect(reportPlayedCards).toHaveBeenCalled());
  });

  test('with nothing stored it sends the couple back to the setup', async () => {
    renderScreen();

    await waitFor(() => expect(replace).toHaveBeenCalledWith('LocalGameSetup'));
  });
});
