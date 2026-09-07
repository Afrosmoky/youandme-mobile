import { useInfiniteQuery } from '@tanstack/react-query';
import { listLikedQuestions } from '../api/questions';
import { queryKeys } from './queryKeys';

// Wraps the cursor-paginated liked-questions list (3B), on the same shape as
// useMemories: `pageParam` is the cursor, undefined for the first page, and a
// null cursor from the last page becomes undefined so TanStack reports
// hasNextPage === false.
//
// No placeholderData here, unlike useMemories. That one needs it because its
// favourites filter switches between two cache entries and the list would blink
// through its empty state on every toggle; this list has one variant, so there
// is nothing to hold on to while something else loads.
export function useLikedQuestions() {
  return useInfiniteQuery({
    queryKey: queryKeys.likedQuestions,
    queryFn: ({ pageParam }) => listLikedQuestions(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: lastPage => lastPage.nextCursor ?? undefined,
  });
}
