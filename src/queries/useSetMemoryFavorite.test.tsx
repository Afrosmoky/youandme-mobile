import React, {ReactNode} from 'react';
import {act, renderHook, waitFor} from '@testing-library/react-native';
import {
  InfiniteData,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import {useSetMemoryFavorite} from './useSetMemoryFavorite';
import {MemoriesPage, setMemoryFavorite} from '../api/memories';
import {queryKeys} from './queryKeys';
import {Memory} from '../domain/types';

jest.mock('../api/memories', () => ({setMemoryFavorite: jest.fn()}));

const makeClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {retry: false, gcTime: Infinity},
      mutations: {retry: false, gcTime: Infinity},
    },
  });

const makeWrapper = (queryClient: QueryClient) =>
  function Wrapper({children}: {children: ReactNode}) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };

const memory: Memory = {
  ulid: 'm_01',
  question: {
    ulid: 'q_01',
    body: 'Co Cię dziś rozśmieszyło?',
    type: 'session',
    category: null,
    tags: [],
    options: null,
    liked: false,
    isLocked: false,
  },
  answerA: 'Świetny żart.',
  answerB: null,
  isFavorite: false,
  playerAName: 'ola',
  playerBName: null,
  origin: 'session',
  answeredAt: '2026-06-02T10:00:00.000Z',
};

const page = (item: Memory): InfiniteData<MemoriesPage> => ({
  pages: [{memories: [item], nextCursor: null, prevCursor: null}],
  pageParams: [undefined],
});

// Seeds the caches a real screen would have open: the unfiltered list and the
// card screen's own read.
const seed = (queryClient: QueryClient) => {
  queryClient.setQueryData(queryKeys.memoriesList(false), page(memory));
  queryClient.setQueryData(queryKeys.memory(memory.ulid), memory);
};

const cachedInList = (queryClient: QueryClient) =>
  queryClient.getQueryData<InfiniteData<MemoriesPage>>(
    queryKeys.memoriesList(false),
  )?.pages[0].memories[0];

describe('useSetMemoryFavorite', () => {
  beforeEach(() => jest.clearAllMocks());

  test('flips the heart in the list and the card before the request settles', async () => {
    const queryClient = makeClient();
    seed(queryClient);
    // Never resolves during the assertion: the optimistic write is the point.
    jest.mocked(setMemoryFavorite).mockReturnValue(new Promise(() => {}));

    const {result} = renderHook(() => useSetMemoryFavorite(), {
      wrapper: makeWrapper(queryClient),
    });
    act(() => result.current.mutate({ulid: 'm_01', favorite: true}));

    await waitFor(() => expect(cachedInList(queryClient)?.isFavorite).toBe(true));
    expect(
      queryClient.getQueryData<Memory>(queryKeys.memory('m_01'))?.isFavorite,
    ).toBe(true);
  });

  test('rolls the heart back when the request fails', async () => {
    const queryClient = makeClient();
    seed(queryClient);
    jest.mocked(setMemoryFavorite).mockRejectedValue(new Error('network'));

    const {result} = renderHook(() => useSetMemoryFavorite(), {
      wrapper: makeWrapper(queryClient),
    });
    act(() => result.current.mutate({ulid: 'm_01', favorite: true}));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(cachedInList(queryClient)?.isFavorite).toBe(false);
    expect(
      queryClient.getQueryData<Memory>(queryKeys.memory('m_01'))?.isFavorite,
    ).toBe(false);
  });

  // Only the favourites list changed membership; the unfiltered list shows the
  // same memories it did a moment ago, and refetching every loaded page of it
  // would be a request that brings nothing new.
  test('refreshes the favourites list only, and never the progress map', async () => {
    const queryClient = makeClient();
    seed(queryClient);
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    jest
      .mocked(setMemoryFavorite)
      .mockResolvedValue({...memory, isFavorite: true});

    const {result} = renderHook(() => useSetMemoryFavorite(), {
      wrapper: makeWrapper(queryClient),
    });
    await act(async () => {
      await result.current.mutateAsync({ulid: 'm_01', favorite: true});
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.memoriesList(true),
    });
    expect(invalidateSpy).not.toHaveBeenCalledWith({
      queryKey: queryKeys.progress,
    });
  });

  test('reconciles with the memory the server returns', async () => {
    const queryClient = makeClient();
    seed(queryClient);
    // Server disagrees with the optimistic guess (e.g. a stale list).
    jest
      .mocked(setMemoryFavorite)
      .mockResolvedValue({...memory, isFavorite: false});

    const {result} = renderHook(() => useSetMemoryFavorite(), {
      wrapper: makeWrapper(queryClient),
    });
    await act(async () => {
      await result.current.mutateAsync({ulid: 'm_01', favorite: true});
    });

    expect(cachedInList(queryClient)?.isFavorite).toBe(false);
  });
});
