import { useQuery } from '@tanstack/react-query';
import { getDeck } from '../api/deck';
import { queryKeys } from './queryKeys';

// The closed deck. Keeps the global 30s staleTime: the deck only changes when
// this couple unlocks something, and those paths write the cache themselves
// (see useUnlockQuestion) rather than waiting for a refetch.
export function useDeck() {
  return useQuery({
    queryKey: queryKeys.deck,
    queryFn: () => getDeck(),
  });
}
