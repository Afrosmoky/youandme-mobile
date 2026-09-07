import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '../components/Toast';
import { queryKeys } from './queryKeys';
import { pl } from '../i18n/pl';

/**
 * What happens after a question's heart has actually landed on the server.
 *
 * Two things, and they belong together because they answer the same event from
 * the same three places — the daily card, the served question and the local
 * game, which are the only screens carrying a question heart.
 *
 * The invalidation is NOT optional. The default staleTime is 30 seconds, so
 * without it a couple can tap the heart, read "you will find it in your
 * history", walk straight there and be shown a list that does not include what
 * they just hearted — the exact complaint this whole slice exists to fix, only
 * harder to spot. It runs in both directions: unhearting changes the list's
 * membership just as much as hearting does.
 *
 * The toast runs in one direction only. "Added to favourites" over an unheart
 * would be a lie, and there is nothing to announce about taking something back.
 *
 * Takes the RESULTING state rather than the direction of the tap, so callers
 * pass what the server said and not what they assumed.
 */
export function useQuestionLikeFeedback() {
  const queryClient = useQueryClient();
  const { show } = useToast();

  return useCallback(
    (liked: boolean) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.likedQuestions });
      if (liked) {
        show(pl.memories.likedToast);
      }
    },
    [queryClient, show],
  );
}
