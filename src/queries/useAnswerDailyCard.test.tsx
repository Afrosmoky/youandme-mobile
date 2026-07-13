import React, {ReactNode} from 'react';
import {renderHook, waitFor} from '@testing-library/react-native';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {useAnswerDailyCard} from './useAnswerDailyCard';
import {answerDailyCard, AnswerDailyCardResult} from '../api/dailyCard';
import {queryKeys} from './queryKeys';

jest.mock('../api/dailyCard', () => ({answerDailyCard: jest.fn()}));

const result = {memory: {}, couple: {}} as unknown as AnswerDailyCardResult;

describe('useAnswerDailyCard', () => {
  test('invalidates the daily card and memories on success', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {retry: false, gcTime: Infinity},
        mutations: {retry: false, gcTime: Infinity},
      },
    });
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    jest.mocked(answerDailyCard).mockResolvedValue(result);

    const wrapper = ({children}: {children: ReactNode}) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const {result: hook} = renderHook(() => useAnswerDailyCard(), {wrapper});

    await hook.current.mutateAsync({
      questionUlid: 'q_01',
      answerA: 'odpowiedź',
      answerB: null,
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: queryKeys.dailyCard,
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: queryKeys.memories,
      });
    });
  });
});
