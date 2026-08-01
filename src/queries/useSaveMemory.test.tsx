import React, {ReactNode} from 'react';
import {renderHook, waitFor} from '@testing-library/react-native';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {useSaveMemory} from './useSaveMemory';
import {createMemory} from '../api/memories';
import {queryKeys} from './queryKeys';

jest.mock('../api/memories', () => ({createMemory: jest.fn()}));

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

const input = {
  questionUlid: 'q_01',
  answerA: 'odpowiedź',
  answerB: null,
  answeredAt: '2026-08-01T10:00:00.000Z',
};

describe('useSaveMemory', () => {
  beforeEach(() => jest.clearAllMocks());

  test('invalidates the memories list and the progress map on success', async () => {
    const queryClient = makeClient();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    jest.mocked(createMemory).mockResolvedValue({} as never);

    const {result} = renderHook(() => useSaveMemory(), {
      wrapper: makeWrapper(queryClient),
    });

    await result.current.mutateAsync(input);

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: queryKeys.memories,
      });
      // A saved memory is a played card, and played cards unlock milestones.
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: queryKeys.progress,
      });
    });
  });

  test('invalidates nothing when the save fails', async () => {
    const queryClient = makeClient();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    jest.mocked(createMemory).mockRejectedValue({response: {status: 422}});

    const {result} = renderHook(() => useSaveMemory(), {
      wrapper: makeWrapper(queryClient),
    });

    await expect(result.current.mutateAsync(input)).rejects.toBeDefined();

    expect(invalidateSpy).not.toHaveBeenCalled();
  });
});
