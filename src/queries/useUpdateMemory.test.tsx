import React, {ReactNode} from 'react';
import {renderHook, waitFor} from '@testing-library/react-native';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {useUpdateMemory} from './useUpdateMemory';
import {updateMemory} from '../api/memories';
import {queryKeys} from './queryKeys';
import {Memory} from '../domain/types';

jest.mock('../api/memories', () => ({updateMemory: jest.fn()}));

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

const edited = {
  ulid: 'm_01',
  answerA: 'Poprawiona odpowiedź.',
  answerB: null,
} as unknown as Memory;

describe('useUpdateMemory', () => {
  beforeEach(() => jest.clearAllMocks());

  test('passes both answers through to the transport', async () => {
    const queryClient = makeClient();
    jest.mocked(updateMemory).mockResolvedValue(edited);

    const {result} = renderHook(() => useUpdateMemory(), {
      wrapper: makeWrapper(queryClient),
    });
    await result.current.mutateAsync({
      ulid: 'm_01',
      answerA: 'Poprawiona odpowiedź.',
      answerB: null,
    });

    expect(updateMemory).toHaveBeenCalledWith('m_01', {
      answerA: 'Poprawiona odpowiedź.',
      answerB: null,
    });
  });

  // The lists show the answers, so they go and look again. The card screen is
  // written straight from the response, and the progress map is not touched at
  // all — rewriting an answer plays no card.
  test('writes the card cache, refreshes the lists, leaves progress alone', async () => {
    const queryClient = makeClient();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    jest.mocked(updateMemory).mockResolvedValue(edited);

    const {result} = renderHook(() => useUpdateMemory(), {
      wrapper: makeWrapper(queryClient),
    });
    await result.current.mutateAsync({
      ulid: 'm_01',
      answerA: 'Poprawiona odpowiedź.',
      answerB: null,
    });

    await waitFor(() =>
      expect(queryClient.getQueryData<Memory>(queryKeys.memory('m_01'))).toEqual(
        edited,
      ),
    );
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.memoriesLists,
    });
    expect(invalidateSpy).not.toHaveBeenCalledWith({
      queryKey: queryKeys.progress,
    });
  });

  test('invalidates nothing when the save fails', async () => {
    const queryClient = makeClient();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    jest.mocked(updateMemory).mockRejectedValue({response: {status: 422}});

    const {result} = renderHook(() => useUpdateMemory(), {
      wrapper: makeWrapper(queryClient),
    });

    await expect(
      result.current.mutateAsync({ulid: 'm_01', answerA: '', answerB: null}),
    ).rejects.toBeDefined();
    expect(invalidateSpy).not.toHaveBeenCalled();
  });
});
