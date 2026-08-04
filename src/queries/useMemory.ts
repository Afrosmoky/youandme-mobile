import { useQuery } from '@tanstack/react-query';
import { getMemory } from '../api/memories';
import { queryKeys } from './queryKeys';

// One memory, for the card screen. A read of its own rather than a lookup in the
// list cache: the same screen opens from an anniversary push, where the memory
// is a year old and sits far past the first cursor page, so there is nothing to
// look up. Reached from the list it costs one request against a warm 30s
// staleTime — and it keeps the screen correct instead of correct-when-scrolled.
export function useMemory(ulid: string) {
  return useQuery({
    queryKey: queryKeys.memory(ulid),
    queryFn: () => getMemory(ulid),
  });
}
