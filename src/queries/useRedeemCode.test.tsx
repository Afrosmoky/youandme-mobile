import React, {ReactNode} from 'react';
import {renderHook, waitFor} from '@testing-library/react-native';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {useRedeemCode} from './useRedeemCode';
import {redeemCode} from '../api/premium';
import {queryKeys} from './queryKeys';

jest.mock('../api/premium', () => ({redeemCode: jest.fn()}));

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

describe('useRedeemCode', () => {
  beforeEach(() => jest.clearAllMocks());

  // Redeem answers with nothing the client can rely on, so a refetch of both
  // keys is the only honest way to learn what the code opened.
  test('invalidates the deck and the balance on success', async () => {
    const queryClient = makeClient();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    jest.mocked(redeemCode).mockResolvedValue(undefined);

    const {result} = renderHook(() => useRedeemCode(), {
      wrapper: makeWrapper(queryClient),
    });

    await result.current.mutateAsync('JAITY-TEST');

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({queryKey: queryKeys.deck});
      expect(invalidateSpy).toHaveBeenCalledWith({queryKey: queryKeys.rewards});
    });
  });

  test('passes the code straight through to the transport', async () => {
    const queryClient = makeClient();
    jest.mocked(redeemCode).mockResolvedValue(undefined);

    const {result} = renderHook(() => useRedeemCode(), {
      wrapper: makeWrapper(queryClient),
    });

    await result.current.mutateAsync('JAITY-TEST');

    // Explicitly the code alone: TanStack calls mutationFn(variables, context),
    // and letting that second argument reach the transport would be leaky.
    expect(redeemCode).toHaveBeenCalledWith('JAITY-TEST');
  });

  test('invalidates nothing when the code is rejected', async () => {
    const queryClient = makeClient();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    jest.mocked(redeemCode).mockRejectedValue({response: {status: 422}});

    const {result} = renderHook(() => useRedeemCode(), {
      wrapper: makeWrapper(queryClient),
    });

    await expect(result.current.mutateAsync('NOPE')).rejects.toBeDefined();

    expect(invalidateSpy).not.toHaveBeenCalled();
  });
});
