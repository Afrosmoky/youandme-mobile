import React, {ReactNode} from 'react';
import axios from 'axios';
import {renderHook, waitFor} from '@testing-library/react-native';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {useSetRitualCompleted} from './useSetRitualCompleted';
import {setWeeklyRitualCompleted} from '../api/rituals';
import {queryKeys} from './queryKeys';
import {WeeklyRitual} from '../domain/types';

jest.mock('../api/rituals', () => ({
  setWeeklyRitualCompleted: jest.fn(),
  // The predicate is the real one: what counts as "the week moved on" is the
  // endpoint's contract, and a mocked version of it would only ever confirm
  // that the mock agrees with itself.
  isRitualWeekRolledOver: jest.requireActual('../api/rituals')
    .isRitualWeekRolledOver,
}));

// axios is mocked app-wide in jest.setup.js, so isAxiosError has to be told what
// to say — the same thing parseApiError's own tests do. Both fixtures below are
// axios-shaped, so `true` is the honest answer and what is left under test is
// the part that matters: 404 read differently from everything else.

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

const ritual: WeeklyRitual = {
  ritual: {ulid: 'r_01', title: 'Tydzień intymności', body: 'Usiądźcie...'},
  startedOn: '2026-07-12',
  dayOfWeek: 3,
  completed: false,
};

// An axios-shaped rejection, which is what the predicate reads.
const httpError = (status: number) => ({
  isAxiosError: true,
  response: {status, data: {}},
});

const renderIt = (queryClient: QueryClient) =>
  renderHook(() => useSetRitualCompleted(), {
    wrapper: makeWrapper(queryClient),
  });

describe('useSetRitualCompleted', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(axios.isAxiosError).mockReturnValue(true);
  });

  test('marks it done in the cache before the server answers', async () => {
    const queryClient = makeClient();
    queryClient.setQueryData(queryKeys.weeklyRitual, ritual);
    let resolve: (value: boolean) => void = () => {};
    jest
      .mocked(setWeeklyRitualCompleted)
      .mockReturnValue(new Promise(r => (resolve = r)));

    const {result} = renderIt(queryClient);
    result.current.mutate(true);

    await waitFor(() =>
      expect(
        queryClient.getQueryData<WeeklyRitual>(queryKeys.weeklyRitual)
          ?.completed,
      ).toBe(true),
    );
    expect(setWeeklyRitualCompleted).toHaveBeenCalledWith(true);
    resolve(true);
  });

  test('takes the mark back through the same hook', async () => {
    const queryClient = makeClient();
    queryClient.setQueryData(queryKeys.weeklyRitual, {
      ...ritual,
      completed: true,
    });
    jest.mocked(setWeeklyRitualCompleted).mockResolvedValue(false);

    const {result} = renderIt(queryClient);
    result.current.mutate(false);

    await waitFor(() =>
      expect(
        queryClient.getQueryData<WeeklyRitual>(queryKeys.weeklyRitual)
          ?.completed,
      ).toBe(false),
    );
    expect(setWeeklyRitualCompleted).toHaveBeenCalledWith(false);
  });

  test('puts the button back when the call genuinely fails', async () => {
    const queryClient = makeClient();
    queryClient.setQueryData(queryKeys.weeklyRitual, ritual);
    jest.mocked(setWeeklyRitualCompleted).mockRejectedValue(httpError(500));

    const {result} = renderIt(queryClient);
    result.current.mutate(true);

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(
      queryClient.getQueryData<WeeklyRitual>(queryKeys.weeklyRitual)?.completed,
    ).toBe(false);
  });

  // The contract that matters: the app sat open across midnight into a new week,
  // so the ritual on screen is no longer the current one. Not a failure — the
  // client re-reads and shows the new ritual instead of saying anything.
  test('a rolled-over week refetches instead of rolling back', async () => {
    const queryClient = makeClient();
    queryClient.setQueryData(queryKeys.weeklyRitual, ritual);
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
    jest.mocked(setWeeklyRitualCompleted).mockRejectedValue(httpError(404));

    const {result} = renderIt(queryClient);
    result.current.mutate(true);

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: queryKeys.weeklyRitual,
    });
  });

  // Rolling back on a 404 would restore the button state of a ritual that is
  // being replaced anyway, so the optimistic value is deliberately left alone
  // for the refetch to overwrite.
  test('a rolled-over week does not restore the previous state itself', async () => {
    const queryClient = makeClient();
    queryClient.setQueryData(queryKeys.weeklyRitual, ritual);
    jest.mocked(setWeeklyRitualCompleted).mockRejectedValue(httpError(404));

    const {result} = renderIt(queryClient);
    result.current.mutate(true);

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(
      queryClient.getQueryData<WeeklyRitual>(queryKeys.weeklyRitual)?.completed,
    ).toBe(true);
  });

  // Something that is not an HTTP answer at all — the phone was offline, say.
  // Not a rolled-over week, so the button goes back.
  test('a failure that is not an HTTP answer rolls back too', async () => {
    jest.mocked(axios.isAxiosError).mockReturnValue(false);
    const queryClient = makeClient();
    queryClient.setQueryData(queryKeys.weeklyRitual, ritual);
    jest
      .mocked(setWeeklyRitualCompleted)
      .mockRejectedValue(new Error('Network Error'));

    const {result} = renderIt(queryClient);
    result.current.mutate(true);

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(
      queryClient.getQueryData<WeeklyRitual>(queryKeys.weeklyRitual)?.completed,
    ).toBe(false);
  });

  // Nothing hangs off the mark: no reward, no streak, no milestone. If this ever
  // starts touching progress, the slice has left its scope.
  test('touches nothing but the ritual', async () => {
    const queryClient = makeClient();
    queryClient.setQueryData(queryKeys.weeklyRitual, ritual);
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
    jest.mocked(setWeeklyRitualCompleted).mockResolvedValue(true);

    const {result} = renderIt(queryClient);
    result.current.mutate(true);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidate).not.toHaveBeenCalled();
    expect(queryClient.getQueryData(queryKeys.progress)).toBeUndefined();
  });
});
