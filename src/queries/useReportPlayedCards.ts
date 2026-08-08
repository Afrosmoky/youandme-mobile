import { useMutation, useQueryClient } from '@tanstack/react-query';
import { reportPlayedCards } from '../api/localGame';
import { reportBatches } from '../domain/localGame';
import { queryKeys } from './queryKeys';

// Wraps POST /game/local/report: the played cards of a local session, handed to
// the server in one go once the couple is done.
//
// Batches go out one after another rather than in parallel. The endpoint is
// throttled (20/minute) and each call recomputes the couple's milestones, so
// there is nothing to win by racing them — and a serial loop means a failure
// stops the run instead of leaving an unknown subset applied. It does not need
// to leave a clean slate behind, because the report is a set: whatever landed
// stays landed, and the caller resends the whole buffer next time.
//
// Invalidates progress, and only progress. Since P10 this is THE path by which
// the map moves; the memories a couple may also have saved travel their own way
// (useSaveLocalMemory) and touch nothing here.
export function useReportPlayedCards() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (playedUlids: string[]) => {
      for (const batch of reportBatches(playedUlids)) {
        await reportPlayedCards(batch);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.progress });
    },
  });
}
