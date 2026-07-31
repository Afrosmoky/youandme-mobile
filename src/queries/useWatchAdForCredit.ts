import { useMutation, useQueryClient } from '@tanstack/react-query';
import { requestAdRewardNonce } from '../api/ads';
import { showRewardedAd, RewardedAdOutcome } from '../ads/rewardedAd';
import { queryKeys } from './queryKeys';

// Orchestrates one rewarded-ad attempt: ask the server for a nonce, show the ad
// with it, and report what the user did.
//
// Note what this hook does NOT do: pay. In P6 the equivalent flow called the
// backend after EARNED_REWARD and the credit appeared immediately. From P7 the
// credit is granted by the SSV webhook, asynchronously, some time after the ad
// ends — so the honest thing for the client to do on 'earned' is refresh the
// balance and admit it may not have arrived yet.
//
// The nonce is fetched BEFORE the ad rather than after: it has to travel with
// the ad request as customData, and a failure to obtain one should cost the
// user nothing more than a message — not a watched ad that can never be paid.
export function useWatchAdForCredit() {
  const queryClient = useQueryClient();
  return useMutation<RewardedAdOutcome, unknown, void>({
    mutationFn: async () => {
      const nonce = await requestAdRewardNonce();
      return showRewardedAd(nonce);
    },
    onSuccess: outcome => {
      // Only a completed view can produce a callback. Refetching after a
      // dismissal would just be noise.
      if (outcome === 'earned') {
        queryClient.invalidateQueries({ queryKey: queryKeys.rewards });
      }
    },
  });
}
