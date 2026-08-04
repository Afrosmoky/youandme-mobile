import React, {ReactNode} from 'react';
import {renderHook, waitFor} from '@testing-library/react-native';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {useDeleteMemory} from './useDeleteMemory';
import {deleteMemory} from '../api/memories';
import {queryKeys} from './queryKeys';
import {Memory} from '../domain/types';

jest.mock('../api/memories', () => ({deleteMemory: jest.fn()}));

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

describe('useDeleteMemory', () => {
  beforeEach(() => jest.clearAllMocks());

  // Soft delete server-side: the memory leaves the lists, but the progress map
  // counts it withTrashed, so a deleted memory must never take a milestone back.
  test('refreshes the lists and never the progress map', async () => {
    const queryClient = makeClient();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    jest.mocked(deleteMemory).mockResolvedValue(undefined);

    const {result} = renderHook(() => useDeleteMemory(), {
      wrapper: makeWrapper(queryClient),
    });
    await result.current.mutateAsync('m_01');

    await waitFor(() =>
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: queryKeys.memoriesLists,
      }),
    );
    expect(invalidateSpy).not.toHaveBeenCalledWith({
      queryKey: queryKeys.progress,
    });
  });

  // Dropped, not invalidated: a refetch of a deleted memory would only earn a
  // 404 for a screen that is on its way out anyway.
  test('drops the card query instead of refetching it', async () => {
    const queryClient = makeClient();
    queryClient.setQueryData(queryKeys.memory('m_01'), {
      ulid: 'm_01',
    } as unknown as Memory);
    jest.mocked(deleteMemory).mockResolvedValue(undefined);

    const {result} = renderHook(() => useDeleteMemory(), {
      wrapper: makeWrapper(queryClient),
    });
    await result.current.mutateAsync('m_01');

    await waitFor(() =>
      expect(queryClient.getQueryData(queryKeys.memory('m_01'))).toBeUndefined(),
    );
  });

  test('invalidates nothing when the delete fails', async () => {
    const queryClient = makeClient();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    jest.mocked(deleteMemory).mockRejectedValue({response: {status: 403}});

    const {result} = renderHook(() => useDeleteMemory(), {
      wrapper: makeWrapper(queryClient),
    });

    await expect(result.current.mutateAsync('m_01')).rejects.toBeDefined();
    expect(invalidateSpy).not.toHaveBeenCalled();
  });
});
