import React, {ReactNode} from 'react';
import {AppState, AppStateStatus} from 'react-native';
import {act, renderHook, waitFor} from '@testing-library/react-native';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import notifee from '@notifee/react-native';
import {useMilestoneCelebration} from './useMilestoneCelebration';
import {getProgress} from '../api/progress';
import {queryKeys} from './queryKeys';
import {Milestone, Progress} from '../domain/types';

jest.mock('../api/progress', () => ({getProgress: jest.fn()}));

const makeClient = () =>
  new QueryClient({
    defaultOptions: {queries: {retry: false, gcTime: Infinity}},
  });

const makeWrapper = (queryClient: QueryClient) =>
  function Wrapper({children}: {children: ReactNode}) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };

// TanStack notifies its observers off a timer, so a resolved fetch is not yet a
// rendered one: without a macrotask turn the hook has not seen the data and has
// not run its diff. Every step here waits for the render, not for the request —
// asserting on getProgress alone would let the second reading arrive before the
// first was ever observed, and the baseline would silently swallow it.
const settle = () => act(async () => {
  await new Promise(resolve => setTimeout(resolve, 0));
});

// AppState.currentState is a plain property on the RN mock (not a getter), so it
// is written, not spied.
const setAppState = (state: AppStateStatus) => {
  (AppState as {currentState: AppStateStatus}).currentState = state;
};

const milestone = (ordering: number, unlocked: boolean): Milestone => ({
  slug: `m${ordering}`,
  name: `Kamień ${ordering}`,
  threshold: ordering * 50,
  ordering,
  unlocked,
  unlockedAt: unlocked ? '2026-07-20T18:30:00.000Z' : null,
});

// Two milestones behind them, the third still ahead.
const before: Progress = {
  totalPlayed: 120,
  nextThreshold: 150,
  milestones: [milestone(1, true), milestone(2, true), milestone(3, false)],
};

// What the refetch after a saved card brings back: the third crossed over.
const after: Progress = {
  ...before,
  totalPlayed: 150,
  nextThreshold: null,
  milestones: [milestone(1, true), milestone(2, true), milestone(3, true)],
};

describe('useMilestoneCelebration', () => {
  const initialAppState = AppState.currentState;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getProgress).mockResolvedValue(before);
    setAppState('active');
  });

  afterAll(() => setAppState(initialAppState));

  // The one thing that must never happen: opening a screen with milestones
  // already behind you and being congratulated for them.
  test('the first reading only seeds the baseline, however much is unlocked', async () => {
    const {result} = renderHook(() => useMilestoneCelebration(), {
      wrapper: makeWrapper(makeClient()),
    });

    await settle();

    expect(result.current.milestone).toBeNull();
    expect(notifee.displayNotification).not.toHaveBeenCalled();
  });

  test('celebrates a milestone that crosses over after the baseline', async () => {
    const queryClient = makeClient();
    const {result} = renderHook(() => useMilestoneCelebration(), {
      wrapper: makeWrapper(queryClient),
    });
    await settle();

    // What a saved card does: the mutation invalidates the key and the refetch
    // brings the unlock (see useSaveMemory / useAnswerDailyCard).
    jest.mocked(getProgress).mockResolvedValue(after);
    await act(async () => {
      await queryClient.invalidateQueries({queryKey: queryKeys.progress});
    });
    await settle();

    expect(result.current.milestone?.slug).toBe('m3');
    expect(result.current.milestone?.name).toBe('Kamień 3');
  });

  test('a refetch that changes nothing celebrates nothing', async () => {
    const queryClient = makeClient();
    const {result} = renderHook(() => useMilestoneCelebration(), {
      wrapper: makeWrapper(queryClient),
    });
    await settle();

    await act(async () => {
      await queryClient.invalidateQueries({queryKey: queryKeys.progress});
    });
    await settle();

    expect(result.current.milestone).toBeNull();
    expect(notifee.displayNotification).not.toHaveBeenCalled();
  });

  // A couple resuming a screen mid-journey: the data arrives already carrying
  // the unlock, and there is no earlier reading to have missed it.
  test('a baseline that already holds everything never fires', async () => {
    jest.mocked(getProgress).mockResolvedValue(after);
    const queryClient = makeClient();
    const {result} = renderHook(() => useMilestoneCelebration(), {
      wrapper: makeWrapper(queryClient),
    });
    await settle();

    await act(async () => {
      await queryClient.invalidateQueries({queryKey: queryKeys.progress});
    });
    await settle();

    expect(result.current.milestone).toBeNull();
  });

  test('dismiss closes the celebration and it does not come back', async () => {
    const queryClient = makeClient();
    const {result} = renderHook(() => useMilestoneCelebration(), {
      wrapper: makeWrapper(queryClient),
    });
    await settle();
    jest.mocked(getProgress).mockResolvedValue(after);
    await act(async () => {
      await queryClient.invalidateQueries({queryKey: queryKeys.progress});
    });
    await settle();
    expect(result.current.milestone).not.toBeNull();

    act(() => result.current.dismiss());
    expect(result.current.milestone).toBeNull();

    // The unlock is part of the baseline now, so a later refetch of the same
    // state stays quiet instead of celebrating it a second time.
    await act(async () => {
      await queryClient.invalidateQueries({queryKey: queryKeys.progress});
    });
    await settle();
    expect(result.current.milestone).toBeNull();
  });

  test('pushes the milestone when the app is in the background', async () => {
    setAppState('background');
    const queryClient = makeClient();
    renderHook(() => useMilestoneCelebration(), {
      wrapper: makeWrapper(queryClient),
    });
    await settle();

    jest.mocked(getProgress).mockResolvedValue(after);
    await act(async () => {
      await queryClient.invalidateQueries({queryKey: queryKeys.progress});
    });
    await settle();

    await waitFor(() =>
      expect(notifee.displayNotification).toHaveBeenCalledWith(
        expect.objectContaining({body: expect.stringContaining('Kamień 3')}),
      ),
    );
    // Its own channel: muting the daily-card nudge must not mute this too.
    expect(notifee.createChannel).toHaveBeenCalledWith(
      expect.objectContaining({id: 'progress-milestones'}),
    );
  });

  // In the foreground the modal is the celebration; a push on top of it would be
  // the same news twice (the P4 rule for streaks).
  test('does not push while the app is in the foreground', async () => {
    const queryClient = makeClient();
    const {result} = renderHook(() => useMilestoneCelebration(), {
      wrapper: makeWrapper(queryClient),
    });
    await settle();

    jest.mocked(getProgress).mockResolvedValue(after);
    await act(async () => {
      await queryClient.invalidateQueries({queryKey: queryKeys.progress});
    });
    await settle();

    expect(result.current.milestone?.slug).toBe('m3');
    expect(notifee.displayNotification).not.toHaveBeenCalled();
  });
});
