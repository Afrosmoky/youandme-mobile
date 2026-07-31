import { useMutation, useQueryClient } from '@tanstack/react-query';
import { redeemCode } from '../api/premium';
import { queryKeys } from './queryKeys';

// Redeems a promo code, which unlocks the whole locked deck at once.
//
// Invalidates rather than writing the cache directly — the opposite of
// useUnlockQuestion, and for a concrete reason: unlock answers with the new
// balance and the new deck, redeem answers with nothing we can rely on. With no
// trustworthy new state in hand, a refetch is the only honest way to learn what
// changed.
//
// Both keys are invalidated even though redeem spends no credits: the deck
// obviously changes, and the balance screen renders next to it, so refreshing
// them apart would let the two disagree on screen.
//
// Invalidation lives in the hook (not the screen) so it survives the screen
// unmounting mid-request; the UX around the call stays in the screen.
export function useRedeemCode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => redeemCode(code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.deck });
      queryClient.invalidateQueries({ queryKey: queryKeys.rewards });
    },
  });
}
