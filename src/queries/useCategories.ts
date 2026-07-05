import { useQuery } from '@tanstack/react-query';
import { listCategories } from '../api/categories';
import { Category } from '../domain/types';
import { queryKeys } from './queryKeys';

// Defensive sort: the backend already orders by `ordering`, but the screen must
// not rely on transport order. Runs in `select`, so consumers get sorted data.
function sortByOrdering(categories: Category[]): Category[] {
  return [...categories].sort((a, b) => a.ordering - b.ordering);
}

// Wraps the categories list endpoint. The API function stays a plain transport
// call; TanStack owns loading/error/caching.
export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories,
    queryFn: listCategories,
    select: sortByOrdering,
  });
}
