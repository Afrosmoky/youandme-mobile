import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createMemory, CreateMemoryInput } from '../api/memories';
import { queryKeys } from './queryKeys';

// Wraps POST /memories. Unlike the other flows, saving a memory DOES touch a
// query cache: it invalidates the memories list so MemoriesScreen (staleTime
// 30s) shows the new entry immediately instead of a stale page.
//
// invalidateQueries lives in the hook's onSuccess (not per-mutate): it must run
// regardless of whether the caller is still mounted. queryClient comes from
// useQueryClient() so the mutation and its invalidation act on the same client
// (the app singleton in prod, the per-test client under renderWithQueryClient).
//
// mutationFn maps variables explicitly (TanStack calls mutationFn(variables,
// context)); forwarding the context object into the transport layer is leaky.
export function useSaveMemory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateMemoryInput) => createMemory(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.memories });
      // P8: a saved memory is a played card, and the backend counts cards to
      // unlock milestones. The map may have moved.
      queryClient.invalidateQueries({ queryKey: queryKeys.progress });
    },
  });
}
