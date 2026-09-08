import { useCallback, useMemo } from 'react';
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
 * `succeeded` takes the RESULTING state rather than the direction of the tap, so
 * callers pass what the server said and not what they assumed.
 *
 * `failed` is the other half, and it is not symmetrical with the toast above: it
 * fires in BOTH directions, because a heart that will not save and a heart that
 * will not unsave are the same broken promise. Until now every failure rolled
 * the heart back and said nothing at all, which reads as a heart that does not
 * work — and the local game, the one mode designed to be played offline, is
 * where that happens routinely. There is nothing to invalidate on this path:
 * the server rejected the change, so the list is exactly as it was.
 */
export function useQuestionLikeFeedback() {
  const queryClient = useQueryClient();
  const { show } = useToast();

  const succeeded = useCallback(
    (liked: boolean) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.likedQuestions });
      if (liked) {
        show(pl.memories.likedToast);
      }
    },
    [queryClient, show],
  );

  const failed = useCallback(() => {
    show(pl.memories.likeError);
  }, [show]);

  return useMemo(() => ({ succeeded, failed }), [succeeded, failed]);
}
