import { QueryClient, useMutation, useQueryClient } from '@tanstack/react-query';
import { reportPlayedCards, resetDeck } from '../api/localGame';
import { confirmReported, reportBatches } from '../domain/localGame';
import {
  clearLocalGameState,
  loadLocalGameState,
  saveLocalGameState,
} from '../storage/localGameState';
import { reportPlayedCardsKey } from './useReportPlayedCards';
import { queryKeys } from './queryKeys';

/**
 * The cards this phone played could not be reported, so the reset was not sent.
 *
 * Its own type because the couple needs a different sentence for it: nothing
 * was reset, and the reason is the connection, not the reset.
 */
export class OwedReportError extends Error {
  constructor() {
    super('Played cards could not be reported before the deck reset');
    this.name = 'OwedReportError';
  }
}

// Resolves once no report is in flight. The live report is fired and not awaited
// (LocalGameScreen), so the last card of a game can still be on its way while
// the couple is already on the summary tapping "od nowa".
function reportsSettled(queryClient: QueryClient): Promise<void> {
  const busy = () =>
    queryClient.isMutating({ mutationKey: reportPlayedCardsKey }) > 0;
  if (!busy()) {
    return Promise.resolve();
  }
  return new Promise(resolve => {
    const unsubscribe = queryClient.getMutationCache().subscribe(() => {
      if (!busy()) {
        unsubscribe();
        resolve();
      }
    });
  });
}

/**
 * Resets the couple's deck, in the only order that loses nothing.
 *
 *   1. Wait out any report already in flight.
 *   2. Send what the stored game still owes. The disk is the source: a report
 *      that answered after its screen was gone never confirmed its cards there,
 *      so they are resent — harmless, the report is a set.
 *   3. Reset. Only now: a report landing after it would count its cards as
 *      played in the NEW deck, and they would drop out of the pool.
 *   4. Drop the stored game. Left behind, a paused game would resume with a
 *      queue dealt from the old deck. clearLocalGameState and not
 *      clearDeviceLocalGameData: the partner's name has nothing to do with the
 *      deck, and sign-out is what that one is for.
 *
 * Any failure stops the run where it is, with nothing cleared: a failed report
 * throws OwedReportError before the reset is sent, and a failed reset (a 429
 * included) leaves the game on disk, so the whole thing can simply be tried
 * again.
 *
 * Invalidates progress and the closed deck. Neither should change — the map
 * ignores the reset and unlocked cards stay unlocked — but both are cheap to
 * re-read and no screen should be left showing numbers from before.
 */
export function useResetDeck() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await reportsSettled(queryClient);

      const stored = await loadLocalGameState();
      if (stored !== null && stored.pendingReport.length > 0) {
        try {
          for (const batch of reportBatches(stored.pendingReport)) {
            await reportPlayedCards(batch);
          }
        } catch {
          throw new OwedReportError();
        }
        // The map moved whether or not the reset below goes through.
        queryClient.invalidateQueries({ queryKey: queryKeys.progress });
        // Settled on disk too, so a reset that fails next does not leave these
        // cards owed twice over.
        await saveLocalGameState(
          confirmReported(stored, stored.pendingReport),
        );
      }

      await resetDeck();
      await clearLocalGameState();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.progress });
      queryClient.invalidateQueries({ queryKey: queryKeys.deck });
    },
  });
}
