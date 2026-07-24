import { useMutation, useQueryClient } from '@tanstack/react-query';
import { likeQuestion, unlikeQuestion } from '../api/likes';
import { DailyCard } from '../domain/types';
import { queryKeys } from './queryKeys';

// P5 Slice 1b: toggle the like on the daily card's question. The like state
// rides along inside the daily card (queryKeys.dailyCard), so there is no
// separate cache key — the mutation flips question.liked in that cache.
//
// `liked` in the variables is the CURRENT state: liked=true means "currently
// liked, so unlike"; liked=false means "like". mutationFn maps explicitly with
// an arrow (TanStack calls mutationFn(variables, context)).
//
// Optimistic flip in onMutate, rollback in onError, and reconcile with the
// server's returned `liked` in onSuccess (one setQueryData, no refetch — so the
// staleTime:0 reload problem never resurfaces, and any drift self-heals). We do
// NOT invalidate: invalidation would refetch and reload the whole card.
type LikeVariables = {
  ulid: string;
  liked: boolean;
};

type LikeContext = {
  previous: DailyCard | undefined;
};

// Writes question.liked into the cached daily card, if present.
function setLikedInCache(
  queryClient: ReturnType<typeof useQueryClient>,
  liked: boolean,
) {
  queryClient.setQueryData<DailyCard>(queryKeys.dailyCard, current =>
    current
      ? { ...current, question: { ...current.question, liked } }
      : current,
  );
}

export function useLikeQuestion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ulid, liked }: LikeVariables) =>
      liked ? unlikeQuestion(ulid) : likeQuestion(ulid),
    onMutate: async ({ liked }): Promise<LikeContext> => {
      // Stop in-flight refetches from clobbering our optimistic write.
      await queryClient.cancelQueries({ queryKey: queryKeys.dailyCard });
      const previous = queryClient.getQueryData<DailyCard>(queryKeys.dailyCard);
      setLikedInCache(queryClient, !liked);
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.dailyCard, context.previous);
      }
    },
    onSuccess: result => {
      // Reconcile with server truth. In the happy path this equals the
      // optimistic value, so nothing flickers.
      setLikedInCache(queryClient, result.liked);
    },
  });
}
