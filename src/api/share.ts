import { z } from 'zod';
import { apiClient } from './client';

// P5 share reward. POST /share-reward grants the referral bonus once,
// server-side. Idempotent: a repeat call is a no-op (no double bonus), so the
// client can fire it without tracking a "claimed" flag. The reward itself is
// invisible in P5 (the deck is closed until P7).
const shareRewardSchema = z.object({
  claimed: z.boolean(),
});

export type ShareRewardResult = {
  claimed: boolean;
};

export async function claimShareReward(): Promise<ShareRewardResult> {
  const res = await apiClient.post('/share-reward');
  return shareRewardSchema.parse(res.data);
}
