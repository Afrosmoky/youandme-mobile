import { useMutation, useQueryClient } from '@tanstack/react-query';
import { answerDailyCard, AnswerDailyCardInput } from '../api/dailyCard';
import { queryKeys } from './queryKeys';

// Wraps POST /daily-card/answer. onSuccess invalidates TWO keys: the daily card
// (answeredToday + streak change) and the memories list (a new memory with
// origin=daily was created). Same pattern as useSaveMemory — queryClient from
// useQueryClient() so mutation and invalidation share one client.
//
// mutationFn maps variables explicitly (TanStack calls mutationFn(variables,
// context)); forwarding the context object into the transport layer is leaky.
export function useAnswerDailyCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AnswerDailyCardInput) => answerDailyCard(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.dailyCard });
      queryClient.invalidateQueries({ queryKey: queryKeys.memories });
      // P8: the daily card counts towards the progress map too. The backend
      // listens for "memory created", and answering the daily card creates one
      // (origin=daily) exactly as a session answer does — so both save paths
      // move the map, and both have to invalidate it.
      queryClient.invalidateQueries({ queryKey: queryKeys.progress });
    },
  });
}
