import React, {ReactNode} from 'react';
import {renderHook, screen} from '@testing-library/react-native';
import {act} from 'react-test-renderer';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {useQuestionLikeFeedback} from './useQuestionLikeFeedback';
import {queryKeys} from './queryKeys';
import {ToastProvider} from '../components/Toast';
import {ThemeProvider} from '../theme';
import {pl} from '../i18n/pl';

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
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <ToastProvider>{children}</ToastProvider>
        </QueryClientProvider>
      </ThemeProvider>
    );
  };

const renderIt = (queryClient: QueryClient) =>
  renderHook(() => useQuestionLikeFeedback(), {
    wrapper: makeWrapper(queryClient),
  });

describe('useQuestionLikeFeedback', () => {
  // The reason this hook exists at all. The default staleTime is 30 seconds, so
  // without an invalidation a couple can heart a card, read "you will find it in
  // your history", walk straight there inside those 30 seconds and be shown a
  // list that does not contain it — the very complaint 3B is fixing, only harder
  // to notice.
  test('refreshes the liked list when a card is hearted', () => {
    const queryClient = makeClient();
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
    const {result} = renderIt(queryClient);

    act(() => result.current.succeeded(true));

    expect(invalidate).toHaveBeenCalledWith({
      queryKey: queryKeys.likedQuestions,
    });
  });

  // Unhearting changes what is on the list just as much as hearting does.
  test('refreshes it when a card is unhearted too', () => {
    const queryClient = makeClient();
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
    const {result} = renderIt(queryClient);

    act(() => result.current.succeeded(false));

    expect(invalidate).toHaveBeenCalledWith({
      queryKey: queryKeys.likedQuestions,
    });
  });

  test('says so, once, on a heart', () => {
    const {result} = renderIt(makeClient());

    act(() => result.current.succeeded(true));

    expect(screen.getByTestId('toast')).toHaveTextContent(
      pl.memories.likedToast,
    );
  });

  // "Added to favourites" over an unheart would be a lie, and there is nothing
  // worth announcing about taking something back.
  test('says nothing when a card is unhearted', () => {
    const {result} = renderIt(makeClient());

    act(() => result.current.succeeded(false));

    expect(screen.queryByTestId('toast')).toBeNull();
  });

  // Until now a failed heart rolled itself back and said nothing, which reads
  // as a heart that does not work. The local game is the mode designed to be
  // played offline, so that is where it happened routinely — and since 3B it
  // would happen next to a favourites tab that stayed empty.
  test('a failed heart says so', () => {
    const {result} = renderIt(makeClient());

    act(() => result.current.failed());

    expect(screen.getByTestId('toast')).toHaveTextContent(pl.memories.likeError);
  });

  // Both directions: a heart that will not save and a heart that will not
  // unsave are the same broken promise.
  test('it says the same thing whichever way the tap went', () => {
    const {result} = renderIt(makeClient());

    act(() => result.current.failed());

    expect(screen.getByTestId('toast')).toHaveTextContent(pl.memories.likeError);
    expect(screen.queryByText(pl.memories.likedToast)).toBeNull();
  });

  // Nothing changed on the server, so there is nothing on the list to refresh.
  test('a failure refreshes nothing', () => {
    const queryClient = makeClient();
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
    const {result} = renderIt(queryClient);

    act(() => result.current.failed());

    expect(invalidate).not.toHaveBeenCalled();
  });
});
