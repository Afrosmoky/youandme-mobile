import React, {ReactNode} from 'react';
import {act, renderHook, waitFor} from '@testing-library/react-native';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {OwedReportError, useResetDeck} from './useResetDeck';
import {useReportPlayedCards} from './useReportPlayedCards';
import {reportPlayedCards, resetDeck} from '../api/localGame';
import {startLocalGame} from '../domain/localGame';
import type {LocalGameState} from '../domain/localGame';
import type {Question} from '../domain/types';
import {
  clearLocalGameState,
  loadLocalGameState,
  saveLocalGameState,
} from '../storage/localGameState';
import {loadPartnerName, savePartnerName} from '../storage/partnerName';
import {queryKeys} from './queryKeys';

jest.mock('../api/localGame', () => ({
  reportPlayedCards: jest.fn(),
  resetDeck: jest.fn(),
}));

const makeWrapper = (queryClient: QueryClient) =>
  function Wrapper({children}: {children: ReactNode}) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };

const makeClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {retry: false, gcTime: Infinity},
      mutations: {retry: false, gcTime: Infinity},
    },
  });

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

// A paused game, one card in, with that card still owed to the server.
const pausedOwing = (): LocalGameState => ({
  ...startLocalGame({
    player1: 'piotr_s',
    player2: 'Wiktoria',
    categorySlug: null,
    categoryName: null,
    questions: [question(1), question(2), question(3)],
    challenges: [],
    startedAt: '2026-09-29T18:00:00.000Z',
  }),
  cursor: 1,
  playedUlids: ['Q1'],
  pendingReport: ['Q1'],
});

const tooManyRequests = {
  isAxiosError: true,
  response: {status: 429, headers: {'retry-after': '30'}},
};

function renderReset(queryClient = makeClient()) {
  return renderHook(() => useResetDeck(), {
    wrapper: makeWrapper(queryClient),
  });
}

describe('useResetDeck', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await clearLocalGameState();
    await savePartnerName('Wiktoria');
    jest
      .mocked(reportPlayedCards)
      .mockResolvedValue({playedTotal: 1, newlyPlayed: 1});
    jest.mocked(resetDeck).mockResolvedValue(undefined);
  });

  // The order is the whole point: a report that lands after the reset counts
  // its cards as played in the new deck, and they drop out of the pool.
  test('reports what the game still owes, then resets', async () => {
    await saveLocalGameState(pausedOwing());
    const {result} = renderReset();

    await act(() => result.current.mutateAsync());

    expect(reportPlayedCards).toHaveBeenCalledWith(['Q1']);
    expect(
      jest.mocked(reportPlayedCards).mock.invocationCallOrder[0],
    ).toBeLessThan(jest.mocked(resetDeck).mock.invocationCallOrder[0]);
  });

  // Left on disk, a paused game would resume with a queue from the old deck.
  test('drops the stored game after the reset, and nothing else', async () => {
    await saveLocalGameState(pausedOwing());
    const {result} = renderReset();

    await act(() => result.current.mutateAsync());

    expect(await loadLocalGameState()).toBeNull();
    // The partner's name is not the deck's: only sign-out takes it.
    expect(await loadPartnerName()).toBe('Wiktoria');
  });

  test('with nothing stored it only resets', async () => {
    const {result} = renderReset();

    await act(() => result.current.mutateAsync());

    expect(reportPlayedCards).not.toHaveBeenCalled();
    expect(resetDeck).toHaveBeenCalledTimes(1);
  });

  test('a report that fails stops the reset and clears nothing', async () => {
    const owing = pausedOwing();
    await saveLocalGameState(owing);
    jest.mocked(reportPlayedCards).mockRejectedValue(new Error('offline'));
    const {result} = renderReset();

    await act(async () => {
      await expect(result.current.mutateAsync()).rejects.toBeInstanceOf(
        OwedReportError,
      );
    });

    expect(resetDeck).not.toHaveBeenCalled();
    expect(await loadLocalGameState()).toEqual(owing);
  });

  // A 429 is "not now", not "something is wrong with you": no clearing, no
  // sign-out, and the same reset goes through when tried again.
  test('a 429 clears nothing locally and can be tried again', async () => {
    await saveLocalGameState({...pausedOwing(), pendingReport: []});
    jest.mocked(resetDeck).mockRejectedValueOnce(tooManyRequests);
    const {result} = renderReset();

    await act(async () => {
      await expect(result.current.mutateAsync()).rejects.toBe(tooManyRequests);
    });

    expect(await loadLocalGameState()).not.toBeNull();
    expect(await loadPartnerName()).toBe('Wiktoria');

    await act(() => result.current.mutateAsync());

    expect(resetDeck).toHaveBeenCalledTimes(2);
    expect(await loadLocalGameState()).toBeNull();
  });

  // The cards that did go out before a failed reset are settled on disk, so a
  // retry does not owe them again.
  test('owed cards sent before a failed reset are no longer owed', async () => {
    await saveLocalGameState(pausedOwing());
    jest.mocked(resetDeck).mockRejectedValueOnce(tooManyRequests);
    const {result} = renderReset();

    await act(async () => {
      await expect(result.current.mutateAsync()).rejects.toBe(tooManyRequests);
    });

    expect((await loadLocalGameState())?.pendingReport).toEqual([]);
  });

  // The last card of a game is reported fired-and-forgotten, so it can still be
  // on its way when the couple taps "od nowa" on the summary.
  test('waits for a report already in flight before resetting', async () => {
    const queryClient = makeClient();
    let finish: () => void = () => {};
    jest.mocked(reportPlayedCards).mockReturnValueOnce(
      new Promise(resolve => {
        finish = () => resolve({playedTotal: 1, newlyPlayed: 1});
      }),
    );
    const live = renderHook(() => useReportPlayedCards(), {
      wrapper: makeWrapper(queryClient),
    });
    const {result} = renderReset(queryClient);

    act(() => {
      live.result.current.mutate(['Q9']);
    });
    await waitFor(() => expect(reportPlayedCards).toHaveBeenCalled());

    let done = false;
    act(() => {
      result.current.mutateAsync().then(() => {
        done = true;
      });
    });
    await new Promise(resolve => setImmediate(resolve));
    expect(resetDeck).not.toHaveBeenCalled();

    await act(async () => {
      finish();
    });

    await waitFor(() => expect(done).toBe(true));
    expect(resetDeck).toHaveBeenCalledTimes(1);
  });

  test('invalidates progress and the closed deck on success', async () => {
    const queryClient = makeClient();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    const {result} = renderReset(queryClient);

    await act(() => result.current.mutateAsync());

    expect(invalidateSpy).toHaveBeenCalledWith({queryKey: queryKeys.progress});
    expect(invalidateSpy).toHaveBeenCalledWith({queryKey: queryKeys.deck});
  });
});
