import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderWithQueryClient } from '../test/renderWithQueryClient';
import { LocalGameSummaryScreen } from './LocalGameSummaryScreen';
import { reportPlayedCards } from '../api/localGame';
import { getProgress } from '../api/progress';
import {
  advance,
  confirmReported,
  startLocalGame,
  markMemorySaved,
} from '../domain/localGame';
import {
  clearLocalGameState,
  loadLocalGameState,
  saveLocalGameState,
} from '../storage/localGameState';
import { queryKeys } from '../queries/queryKeys';
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
  options: null,
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

function makeProps(params?: { seenMilestones?: string[] }): Props {
  return {
    navigation: { popTo, replace, setOptions: jest.fn(), navigate: jest.fn() },
    route: { key: 'LocalGameSummary', name: 'LocalGameSummary', params },
  } as unknown as Props;
}

// A played-out session, the way S3c leaves one: three cards left behind, one
// challenge seen, one saved — and nothing owed, because the game screen settled
// up on every transition.
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
  return confirmReported(state, state.pendingReport);
};

const renderScreen = (params?: { seenMilestones?: string[] }) =>
  renderWithQueryClient(<LocalGameSummaryScreen {...makeProps(params)} />);

// S3c turned this screen into a read. The report moved onto every transition,
// the celebration onto the card that earned it, and the clearing of the state
// onto the setup screen — so the ordering puzzle P10 had here is gone, and what
// these tests guard is that none of it came back.
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

  test('reports nothing — the cards went out as they were played', async () => {
    await saveLocalGameState(playedOut());
    renderScreen();

    await screen.findByTestId('local-game-summary-questions');
    expect(reportPlayedCards).not.toHaveBeenCalled();
  });

  // Anything the live path could not finish is the setup screen's job. This
  // screen must not send it, and must not clear the state that carries it.
  test('leaves an unsettled session alone for the setup screen', async () => {
    const owing = { ...playedOut(), pendingReport: ['Q3'] };
    await saveLocalGameState(owing);
    renderScreen();

    await screen.findByTestId('local-game-summary-questions');
    expect(reportPlayedCards).not.toHaveBeenCalled();
    expect((await loadLocalGameState())?.pendingReport).toEqual(['Q3']);
  });

  // P10 read the state twice — once for the counters, once from the effect that
  // reported — and the second read landed after the session had been cleared,
  // which bounced the couple off their own summary. Nothing clears the state
  // here any more, and the read is still mount-only.
  test('stays put; nothing sends the couple away or clears the session', async () => {
    await saveLocalGameState(playedOut());
    renderScreen();

    await screen.findByTestId('local-game-summary-questions');
    await waitFor(async () => expect(await loadLocalGameState()).not.toBeNull());

    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByTestId('local-game-summary-questions')).toBeOnTheScreen();
  });

  test('with nothing stored it sends the couple back to the setup', async () => {
    renderScreen();

    await waitFor(() => expect(replace).toHaveBeenCalledWith('LocalGameSetup'));
  });
});

// S3d: the one milestone the game screen cannot celebrate is the one earned by
// the LAST card — its report is still in flight when the couple is moved here.
// This screen finishes that case, and the baseline in the route params is what
// keeps it from finishing any of the others a second time.
describe('LocalGameSummaryScreen — the milestone of the last card', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await clearLocalGameState();
    jest
      .mocked(reportPlayedCards)
      .mockResolvedValue({ playedTotal: 10, newlyPlayed: 1 });
    jest.mocked(getProgress).mockResolvedValue(progressWith(false));
    await saveLocalGameState(playedOut());
  });

  // The unlock is already in the map by the time this screen reads it — the
  // report answered while the navigator was still swapping the screens.
  test('celebrates an unlock the game screen never saw', async () => {
    jest.mocked(getProgress).mockResolvedValue(progressWith(true));
    renderScreen({ seenMilestones: [] });

    expect(
      await screen.findByText(pl.celebration.milestoneTitle),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(pl.celebration.milestoneBody('Kamień 10')),
    ).toBeOnTheScreen();
  });

  // The usual case, and the reason the hook is mounted before the counters are
  // read: the map only moves once the last report has come back, which is after
  // the couple is already looking at their summary.
  test('celebrates an unlock that arrives after the screen is up', async () => {
    const { queryClient } = renderScreen({ seenMilestones: [] });
    await screen.findByTestId('local-game-summary-questions');
    expect(screen.queryByText(pl.celebration.milestoneTitle)).toBeNull();

    // What the report does when it answers: useReportPlayedCards invalidates
    // progress, and the refetch brings the unlock.
    jest.mocked(getProgress).mockResolvedValue(progressWith(true));
    await act(async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.progress });
    });

    expect(
      await screen.findByText(pl.celebration.milestoneTitle),
    ).toBeOnTheScreen();
  });

  // The invariant this whole slice is balanced on: a milestone the game screen
  // already put a modal on is in the set it hands over, and must not appear
  // again — the couple would be congratulated twice for one card.
  test('does not celebrate what the game screen already celebrated', async () => {
    jest.mocked(getProgress).mockResolvedValue(progressWith(true));
    renderScreen({ seenMilestones: ['m10'] });

    await screen.findByTestId('local-game-summary-questions');
    await waitFor(() => expect(getProgress).toHaveBeenCalled());
    expect(screen.queryByText(pl.celebration.milestoneTitle)).toBeNull();
  });

  // Reached without a game screen to hand anything over (a finished session
  // found on disk): there is no way to tell an unlock earned five minutes ago
  // from one earned last month, so nothing is celebrated.
  test('with no baseline it celebrates nothing, however full the map', async () => {
    jest.mocked(getProgress).mockResolvedValue(progressWith(true));
    renderScreen();

    await screen.findByTestId('local-game-summary-questions');
    await waitFor(() => expect(getProgress).toHaveBeenCalled());
    expect(screen.queryByText(pl.celebration.milestoneTitle)).toBeNull();
  });

  test('the modal closes onto the summary and stays closed', async () => {
    const { queryClient } = renderScreen({ seenMilestones: [] });
    // The first reading has to land before the report's invalidation, or the
    // two collapse into one in-flight fetch and the unlock is never asked for.
    await screen.findByTestId('local-game-summary-questions');
    jest.mocked(getProgress).mockResolvedValue(progressWith(true));
    await act(async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.progress });
    });
    await screen.findByText(pl.celebration.milestoneTitle);

    fireEvent.press(screen.getByTestId('celebration-dismiss'));

    await waitFor(() =>
      expect(screen.queryByText(pl.celebration.milestoneTitle)).toBeNull(),
    );
    expect(screen.getByTestId('local-game-summary-questions')).toBeOnTheScreen();

    // A later reading of the same map is not a second unlock.
    await act(async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.progress });
    });
    expect(screen.queryByText(pl.celebration.milestoneTitle)).toBeNull();
  });

  // Celebrating is watching, not playing: this screen still sends nothing.
  test('watching the map does not make this screen report', async () => {
    jest.mocked(getProgress).mockResolvedValue(progressWith(true));
    renderScreen({ seenMilestones: [] });

    await screen.findByText(pl.celebration.milestoneTitle);
    expect(reportPlayedCards).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });
});
