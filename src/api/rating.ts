import { z } from 'zod';
import { apiClient } from './client';

// P6 rating reward. POST /rating-reward grants the one-time bonus for asking
// the user to rate the app, server-side. Idempotent: a repeat call is a no-op
// (no double bonus), so the client can fire it without tracking a "claimed"
// flag. The reward itself is invisible in P6 (the deck is closed until P7).
//
// Twin of share.ts by design: a native mechanism on the device plus a thin
// server-side grant. What we reward is the gesture of prompting, not the
// review — In-App Review gives no callback telling us whether the prompt was
// shown or whether the user rated anything.
const ratingRewardSchema = z.object({
  claimed: z.boolean(),
});

export type RatingRewardResult = {
  claimed: boolean;
};

export async function claimRatingReward(): Promise<RatingRewardResult> {
  const res = await apiClient.post('/rating-reward');
  return ratingRewardSchema.parse(res.data);
}
