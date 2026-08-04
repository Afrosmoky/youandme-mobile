import { useInfiniteQuery } from '@tanstack/react-query';
import { listMemories } from '../api/memories';
import { queryKeys } from './queryKeys';

// Wraps the cursor-paginated memories list. `pageParam` is the cursor: undefined
// for the first page, then each page's `nextCursor` for the next. A null cursor
// (last page) becomes `undefined` so TanStack reports `hasNextPage === false`.
//
// P9: the favourites filter is part of the key, not a filter applied to one
// cached list. The server narrows the same list (same shape, same order, same
// cursor), and filtering client-side would break paging the moment a couple has
// more favourites than fit on the page they happen to have loaded.
export function useMemories(favoritesOnly: boolean = false) {
  return useInfiniteQuery({
    queryKey: queryKeys.memoriesList(favoritesOnly),
    queryFn: ({ pageParam }) =>
      listMemories({ cursor: pageParam, favoritesOnly }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: lastPage => lastPage.nextCursor ?? undefined,
  });
}
