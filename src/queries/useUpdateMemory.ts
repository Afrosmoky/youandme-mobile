import { useMutation, useQueryClient } from '@tanstack/react-query';
import { UpdateMemoryInput, updateMemory } from '../api/memories';
import { queryKeys } from './queryKeys';

type UpdateVariables = UpdateMemoryInput & { ulid: string };

// Edits a memory's answers (P9). Both answers travel every time — the backend
// reads a missing answer_b as "the partner said nothing" and clears it, so the
// edit screen holds the whole card and this hook passes it through as-is.
//
// Invalidates the lists (they show the answers) but NOT queryKeys.progress: the
// progress map counts cards played, and rewriting an answer plays nothing. The
// backend agrees — editing emits no event.
export function useUpdateMemory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ulid, answerA, answerB }: UpdateVariables) =>
      updateMemory(ulid, { answerA, answerB }),
    onSuccess: memory => {
      // The response is the fresh memory, so the card screen is written straight
      // from it; only the lists have to go and look again.
      queryClient.setQueryData(queryKeys.memory(memory.ulid), memory);
      queryClient.invalidateQueries({ queryKey: queryKeys.memoriesLists });
    },
  });
}
