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
// rendered one: until the hook has seen the data it has not run its diff. This
// used to be waited out with a single macrotask turn, which held right up until
// new suites changed how Jest schedules its workers — under load one turn is not
// enough, and the block below started failing about one full run in three.
//
// So nothing here waits for a tick any more; every step waits for the thing it
// is about to assert on.
//
// `seenMilestones()` is that signal for a reading with nothing to celebrate: it
// is undefined until one has landed (the test at the bottom pins that down), so
// it says "the data arrived AND the hook rendered its diff" without depending on
// what the diff found. A bare waitFor on a negative assertion would be no wait
// at all — it passes on the first try, before the query resolves, and the test
// would be green whatever the hook did.
type Celebration = ReturnType<typeof useMilestoneCelebration>;

const readingLanded = (result: {current: Celebration}) =>
  waitFor(() => expect(result.current.seenMilestones()).toBeDefined());

// For a refetch that changes nothing there is no rendered state to watch, so the
// call count is the anchor. Weaker than the above on purpose: getting here early
// can only make an assertion pass that would have passed anyway, never fail one
// that should not.
const refetched = (times: number) =>
  waitFor(() => expect(getProgress).toHaveBeenCalledTimes(times));

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

    await readingLanded(result);

    expect(result.current.milestone).toBeNull();
    expect(notifee.displayNotification).not.toHaveBeenCalled();
  });

  test('celebrates a milestone that crosses over after the baseline', async () => {
    const queryClient = makeClient();
    const {result} = renderHook(() => useMilestoneCelebration(), {
      wrapper: makeWrapper(queryClient),
    });
    await readingLanded(result);

    // What a saved card does: the mutation invalidates the key and the refetch
    // brings the unlock (see useSaveMemory / useAnswerDailyCard).
    jest.mocked(getProgress).mockResolvedValue(after);
    await act(async () => {
      await queryClient.invalidateQueries({queryKey: queryKeys.progress});
    });

    await waitFor(() => expect(result.current.milestone?.slug).toBe('m3'));
    expect(result.current.milestone?.name).toBe('Kamień 3');
  });

  test('a refetch that changes nothing celebrates nothing', async () => {
    const queryClient = makeClient();
    const {result} = renderHook(() => useMilestoneCelebration(), {
      wrapper: makeWrapper(queryClient),
    });
    await readingLanded(result);

    await act(async () => {
      await queryClient.invalidateQueries({queryKey: queryKeys.progress});
    });
    await refetched(2);

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
    await readingLanded(result);

    await act(async () => {
      await queryClient.invalidateQueries({queryKey: queryKeys.progress});
    });
    await refetched(2);

    expect(result.current.milestone).toBeNull();
  });

  test('dismiss closes the celebration and it does not come back', async () => {
    const queryClient = makeClient();
    const {result} = renderHook(() => useMilestoneCelebration(), {
      wrapper: makeWrapper(queryClient),
    });
    await readingLanded(result);
    jest.mocked(getProgress).mockResolvedValue(after);
    await act(async () => {
      await queryClient.invalidateQueries({queryKey: queryKeys.progress});
    });
    await waitFor(() => expect(result.current.milestone).not.toBeNull());

    act(() => result.current.dismiss());
    expect(result.current.milestone).toBeNull();

    // The unlock is part of the baseline now, so a later refetch of the same
    // state stays quiet instead of celebrating it a second time.
    await act(async () => {
      await queryClient.invalidateQueries({queryKey: queryKeys.progress});
    });
    await refetched(3);
    expect(result.current.milestone).toBeNull();
  });

  // S3d: a screen that takes over mid-watch says what it already knows, and the
  // first reading here becomes a real diff instead of a seed. This is the whole
  // mechanism behind celebrating a milestone earned by the last card of a local
  // session, whose report only comes back after the couple has been moved on.
  describe('with a baseline handed over by another screen', () => {
    test('the first reading is a diff, not a seed', async () => {
      jest.mocked(getProgress).mockResolvedValue(after);
      const {result} = renderHook(
        () => useMilestoneCelebration(['m1', 'm2']),
        {wrapper: makeWrapper(makeClient())},
      );

      await waitFor(() => expect(result.current.milestone?.slug).toBe('m3'));
    });

    // The other half of the deal: whatever the previous screen celebrated is in
    // the set it hands over, so it cannot be celebrated a second time here.
    test('nothing in the handed-over set can fire', async () => {
      jest.mocked(getProgress).mockResolvedValue(after);
      const {result} = renderHook(
        () => useMilestoneCelebration(['m1', 'm2', 'm3']),
        {wrapper: makeWrapper(makeClient())},
      );

      await readingLanded(result);

      expect(result.current.milestone).toBeNull();
      expect(notifee.displayNotification).not.toHaveBeenCalled();
    });

    // "The other screen saw the map and nothing was unlocked" is a baseline, and
    // an empty array must not read as "no baseline was passed".
    test('an empty baseline is a baseline, not an absence', async () => {
      const {result} = renderHook(() => useMilestoneCelebration([]), {
        wrapper: makeWrapper(makeClient()),
      });

      // `before` has two unlocked; the furthest one wins.
      await waitFor(() => expect(result.current.milestone?.slug).toBe('m2'));
    });

    test('a re-render cannot reseed the baseline and re-arm the modal', async () => {
      const queryClient = makeClient();
      const {result, rerender} = renderHook(
        () => useMilestoneCelebration(['m1', 'm2']),
        {wrapper: makeWrapper(queryClient)},
      );
      await readingLanded(result);
      jest.mocked(getProgress).mockResolvedValue(after);
      await act(async () => {
        await queryClient.invalidateQueries({queryKey: queryKeys.progress});
      });
      await waitFor(() => expect(result.current.milestone).not.toBeNull());
      act(() => result.current.dismiss());

      // rerender is act-wrapped, so the effects it triggers have already run by
      // the time it returns; there is no request to wait for here.
      rerender(undefined);

      expect(result.current.milestone).toBeNull();
    });
  });

  // What a screen hands on when it navigates: everything it started with plus
  // everything it has celebrated since.
  describe('seenMilestones', () => {
    test('is undefined until a reading has landed', () => {
      const {result} = renderHook(() => useMilestoneCelebration(), {
        wrapper: makeWrapper(makeClient()),
      });

      expect(result.current.seenMilestones()).toBeUndefined();
    });

    test('is the whole unlocked set once the map has been read', async () => {
      const {result} = renderHook(() => useMilestoneCelebration(), {
        wrapper: makeWrapper(makeClient()),
      });
      await readingLanded(result);

      expect(result.current.seenMilestones()).toEqual(['m1', 'm2']);
    });

    test('grows with what was celebrated, so the next screen skips it', async () => {
      const queryClient = makeClient();
      const {result} = renderHook(() => useMilestoneCelebration(), {
        wrapper: makeWrapper(queryClient),
      });
      await readingLanded(result);
      jest.mocked(getProgress).mockResolvedValue(after);
      await act(async () => {
        await queryClient.invalidateQueries({queryKey: queryKeys.progress});
      });
      await waitFor(() => expect(result.current.milestone?.slug).toBe('m3'));

      expect(result.current.seenMilestones()).toEqual(['m1', 'm2', 'm3']);
    });
  });

  test('pushes the milestone when the app is in the background', async () => {
    setAppState('background');
    const queryClient = makeClient();
    const {result} = renderHook(() => useMilestoneCelebration(), {
      wrapper: makeWrapper(queryClient),
    });
    await readingLanded(result);

    jest.mocked(getProgress).mockResolvedValue(after);
    await act(async () => {
      await queryClient.invalidateQueries({queryKey: queryKeys.progress});
    });

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
    await readingLanded(result);

    jest.mocked(getProgress).mockResolvedValue(after);
    await act(async () => {
      await queryClient.invalidateQueries({queryKey: queryKeys.progress});
    });

    await waitFor(() => expect(result.current.milestone?.slug).toBe('m3'));
    expect(notifee.displayNotification).not.toHaveBeenCalled();
  });
});
