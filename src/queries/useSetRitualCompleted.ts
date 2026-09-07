import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  isRitualWeekRolledOver,
  setWeeklyRitualCompleted,
} from '../api/rituals';
import { WeeklyRitual } from '../domain/types';
import { queryKeys } from './queryKeys';

// "We did it", and taking it back (3B).
//
// `completed` is the state we want, not a flip — the API is two idempotent
// verbs, so the caller names the destination and a retry cannot undo itself.
// The same shape as useSetMemoryFavorite and, before it, the P5 likes.
//
// Optimistic, because reacting instantly is the entire value of this button:
// nothing hangs off the mark (no reward, no streak, no milestone), so a
// round-trip's worth of waiting would be all cost and no meaning.
type CompletedContext = {
  previous: WeeklyRitual | undefined;
};

export function useSetRitualCompleted() {
  const queryClient = useQueryClient();

  const write = (completed: boolean) =>
    queryClient.setQueryData<WeeklyRitual>(
      queryKeys.weeklyRitual,
      current => current && { ...current, completed },
    );

  return useMutation({
    mutationFn: (completed: boolean) => setWeeklyRitualCompleted(completed),
    onMutate: async (completed): Promise<CompletedContext> => {
      await queryClient.cancelQueries({ queryKey: queryKeys.weeklyRitual });
      const previous = queryClient.getQueryData<WeeklyRitual>(
        queryKeys.weeklyRitual,
      );
      write(completed);
      return { previous };
    },
    onError: (err, _completed, context) => {
      // A 404 is not a failure, it is a stale week: the app sat open across
      // midnight into a new week and the ritual on screen is no longer the
      // current one. Rolling back would be doubly wrong — it would restore the
      // button state of a ritual that is about to be replaced anyway. Refetch
      // instead and let the fresh answer speak for itself, which is the same
      // move P4 made for the daily card's 409: reload, do not read the message.
      if (isRitualWeekRolledOver(err)) {
        queryClient.invalidateQueries({ queryKey: queryKeys.weeklyRitual });
        return;
      }
      // Anything else really did fail, so the button goes back to where it was
      // and the screen says so.
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.weeklyRitual, context.previous);
      }
    },
    onSuccess: completed => {
      // Reconcile with what the server says. Identical to the optimistic value
      // in the happy path, so nothing flickers.
      write(completed);
    },
  });
}
