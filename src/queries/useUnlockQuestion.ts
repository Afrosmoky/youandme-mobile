import { useMutation, useQueryClient } from '@tanstack/react-query';
import { unlockQuestion } from '../api/deck';
import { Deck, Rewards } from '../domain/types';
import { queryKeys } from './queryKeys';

// Spends one credit on one card. The server answers with the fresh balance AND
// the fresh deck, so this writes both caches directly instead of invalidating
// them — no round trip, and the list cannot flicker through a loading state
// between the tap and the refetch.
//
// That is a deliberate departure from the usual mutation canon (invalidate in
// the hook's onSuccess). The canon applies when the mutation response does not
// describe the new state; here it describes it completely. Same reasoning as
// useLikeQuestion, which reconciles with setQueryData rather than refetching.
//
// mutationFn maps with an arrow: TanStack calls mutationFn(variables, context),
// and passing that second argument through to the transport would be leaky.
export function useUnlockQuestion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ulid: string) => unlockQuestion(ulid),
    onSuccess: result => {
      queryClient.setQueryData<Deck>(queryKeys.deck, result.deck);
      // The balance response carries only `credits`; the rest of the rewards
      // payload (earner flags, ad counters) is untouched by an unlock, so patch
      // the cached object rather than replacing it. Nothing cached yet (deck
      // opened before rewards) means nothing to patch — the next read fetches
      // the whole thing anyway.
      queryClient.setQueryData<Rewards>(queryKeys.rewards, current =>
        current ? { ...current, credits: result.credits } : current,
      );
    },
  });
}
