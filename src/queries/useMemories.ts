import { useInfiniteQuery } from '@tanstack/react-query';
import { listMemories } from '../api/memories';
import { queryKeys } from './queryKeys';

// Wraps the cursor-paginated memories list. `pageParam` is the cursor: undefined
// for the first page, then each page's `nextCursor` for the next. A null cursor
// (last page) becomes `undefined` so TanStack reports `hasNextPage === false`.
export function useMemories() {
  return useInfiniteQuery({
    queryKey: queryKeys.memories,
    queryFn: ({ pageParam }) => listMemories(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: lastPage => lastPage.nextCursor ?? undefined,
  });
}
