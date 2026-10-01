import React, {ReactNode} from 'react';
import {Alert, Share} from 'react-native';
import {act, renderHook} from '@testing-library/react-native';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {useRateApp, useShareApp} from './useShareApp';
import {claimShareReward} from '../api/share';
import {claimRatingReward} from '../api/rating';
import {queryKeys} from './queryKeys';

jest.mock('../api/share', () => ({claimShareReward: jest.fn()}));
jest.mock('../api/rating', () => ({claimRatingReward: jest.fn()}));

const makeClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {retry: false, gcTime: Infinity},
      mutations: {retry: false, gcTime: Infinity},
    },
  });

const wrapperFor = (queryClient: QueryClient) =>
  function Wrapper({children}: {children: ReactNode}) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };

// Both rewards land on the couple's balance server-side. The screen showing it
// must re-read it, or the couple is thanked and sees the same number.
describe('earning by sharing and rating', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    jest.mocked(claimShareReward).mockResolvedValue({claimed: true});
    jest.mocked(claimRatingReward).mockResolvedValue({claimed: true});
  });

  test('a share re-reads the balance', async () => {
    jest
      .spyOn(Share, 'share')
      .mockResolvedValue({action: Share.sharedAction});
    const queryClient = makeClient();
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
    const {result} = renderHook(() => useShareApp(), {
      wrapper: wrapperFor(queryClient),
    });

    await act(() => result.current());

    expect(invalidate).toHaveBeenCalledWith({queryKey: queryKeys.rewards});
  });

  test('a dismissed share sheet re-reads nothing', async () => {
    jest
      .spyOn(Share, 'share')
      .mockResolvedValue({action: Share.dismissedAction});
    const queryClient = makeClient();
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
    const {result} = renderHook(() => useShareApp(), {
      wrapper: wrapperFor(queryClient),
    });

    await act(() => result.current());

    expect(claimShareReward).not.toHaveBeenCalled();
    expect(invalidate).not.toHaveBeenCalled();
  });

  test('a rating re-reads the balance', async () => {
    const queryClient = makeClient();
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
    const {result} = renderHook(() => useRateApp(), {
      wrapper: wrapperFor(queryClient),
    });

    await act(() => result.current());

    expect(invalidate).toHaveBeenCalledWith({queryKey: queryKeys.rewards});
  });
});
