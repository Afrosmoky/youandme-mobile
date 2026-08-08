import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createLocalMemory, CreateLocalMemoryInput } from '../api/memories';
import { queryKeys } from './queryKeys';

// Wraps POST /memories/local — a card written down during a local game (P10).
//
// Invalidates the memories lists and NOTHING ELSE. Unlike useSaveMemory, it does
// not touch queryKeys.progress, and that is the point of P10's progress change:
// the map counts cards PLAYED, which the batch report says at the end of the
// session, not cards saved. Invalidating progress here would refetch a number
// that cannot have moved, and would quietly suggest the two paths are the same.
//
// queryKeys.memories is a prefix, so this reaches both list variants (all and
// favourites) as well as any open card — the same invalidation P9 relies on.
export function useSaveLocalMemory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateLocalMemoryInput) => createLocalMemory(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.memories });
    },
  });
}
