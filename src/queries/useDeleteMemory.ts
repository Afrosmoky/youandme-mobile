import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteMemory } from '../api/memories';
import { queryKeys } from './queryKeys';

// Removes a memory (P9). Soft delete server-side: it leaves every list, but the
// progress map keeps counting it (the backend counts withTrashed, so milestones
// are monotonic by design) — which is why nothing here touches
// queryKeys.progress. Deleting a memory must never take a milestone back.
export function useDeleteMemory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ulid: string) => deleteMemory(ulid),
    onSuccess: (_result, ulid) => {
      // Drop the detail query rather than invalidate it: the memory is gone, and
      // a refetch would only earn a 404. The screen navigates away on success.
      queryClient.removeQueries({ queryKey: queryKeys.memory(ulid) });
      queryClient.invalidateQueries({ queryKey: queryKeys.memoriesLists });
    },
  });
}
