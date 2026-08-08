import React, { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useReportPlayedCards } from './useReportPlayedCards';
import { useSaveLocalMemory } from './useSaveLocalMemory';
import { reportPlayedCards } from '../api/localGame';
import { createLocalMemory } from '../api/memories';
import { queryKeys } from './queryKeys';

jest.mock('../api/localGame', () => ({ reportPlayedCards: jest.fn() }));
jest.mock('../api/memories', () => ({ createLocalMemory: jest.fn() }));

const makeClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  });

const makeWrapper = (queryClient: QueryClient) =>
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };

const ulids = (count: number) =>
  Array.from({ length: count }, (_, i) => `Q${i + 1}`);

describe('useReportPlayedCards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .mocked(reportPlayedCards)
      .mockResolvedValue({ playedTotal: 0, newlyPlayed: 0 });
  });

  test('sends the whole buffer in one call when it fits', async () => {
    const { result } = renderHook(() => useReportPlayedCards(), {
      wrapper: makeWrapper(makeClient()),
    });

    await result.current.mutateAsync(['Q1', 'Q2']);

    expect(reportPlayedCards).toHaveBeenCalledTimes(1);
    expect(reportPlayedCards).toHaveBeenCalledWith(['Q1', 'Q2']);
  });

  // The endpoint 422s a batch over the cap, and a 422 would lose the whole
  // session's progress rather than one card.
  test('splits a buffer past the hundred-card cap', async () => {
    const { result } = renderHook(() => useReportPlayedCards(), {
      wrapper: makeWrapper(makeClient()),
    });

    await result.current.mutateAsync(ulids(150));

    expect(reportPlayedCards).toHaveBeenCalledTimes(2);
    expect(jest.mocked(reportPlayedCards).mock.calls[0][0]).toHaveLength(100);
    expect(jest.mocked(reportPlayedCards).mock.calls[1][0]).toHaveLength(50);
  });

  // Also a 422, and also fatal to the whole batch.
  test('never sends the same ulid twice in one call', async () => {
    const { result } = renderHook(() => useReportPlayedCards(), {
      wrapper: makeWrapper(makeClient()),
    });

    await result.current.mutateAsync(['Q1', 'Q2', 'Q1']);

    expect(reportPlayedCards).toHaveBeenCalledWith(['Q1', 'Q2']);
  });

  test('an empty buffer sends nothing at all', async () => {
    const { result } = renderHook(() => useReportPlayedCards(), {
      wrapper: makeWrapper(makeClient()),
    });

    await result.current.mutateAsync([]);

    expect(reportPlayedCards).not.toHaveBeenCalled();
  });

  test('moves the progress map on success', async () => {
    const queryClient = makeClient();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useReportPlayedCards(), {
      wrapper: makeWrapper(queryClient),
    });

    await result.current.mutateAsync(['Q1']);

    await waitFor(() =>
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: queryKeys.progress,
      }),
    );
  });

  test('invalidates nothing when a batch fails', async () => {
    const queryClient = makeClient();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    jest.mocked(reportPlayedCards).mockRejectedValue(new Error('network'));
    const { result } = renderHook(() => useReportPlayedCards(), {
      wrapper: makeWrapper(queryClient),
    });

    await expect(result.current.mutateAsync(['Q1'])).rejects.toThrow();

    expect(invalidateSpy).not.toHaveBeenCalled();
  });
});

describe('useSaveLocalMemory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(createLocalMemory).mockResolvedValue({} as never);
  });

  const input = {
    questionUlid: 'q_01',
    answerA: 'moja',
    answerB: 'jej',
    playerBName: 'Wiktoria',
    answeredAt: '2026-08-05T18:00:00.000Z',
  };

  test('refreshes the memories lists', async () => {
    const queryClient = makeClient();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useSaveLocalMemory(), {
      wrapper: makeWrapper(queryClient),
    });

    await result.current.mutateAsync(input);

    await waitFor(() =>
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: queryKeys.memories,
      }),
    );
  });

  // The P10 progress rule, asserted rather than assumed: the map counts cards
  // played, which the report says at the end of the session. A memory saved
  // mid-game moves nothing on it.
  test('leaves the progress map alone', async () => {
    const queryClient = makeClient();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useSaveLocalMemory(), {
      wrapper: makeWrapper(queryClient),
    });

    await result.current.mutateAsync(input);

    expect(invalidateSpy).not.toHaveBeenCalledWith({
      queryKey: queryKeys.progress,
    });
  });
});
