import { apiClient } from './client';
import {
  AdRewardResult,
  mapRawAdReward,
  rawAdRewardSchema,
} from '../domain/types';

// P6 rewarded-ad grant. POST /ad-reward adds credits for a watched rewarded
// video. Unlike the share and rating rewards this one is repeatable, so there
// is no one-time flag: the daily cap (5/day per couple) is enforced server-side
// and reported back as `remaining_today`. Over the cap the call still returns
// 200 with `granted: false` — a refusal, not an error.
//
// The client is trusted here: P6 ships without Server-Side Verification (see
// the P6 analysis, §5 and §8). Nothing is exploitable while credits stay
// invisible, but SSV has to land before P7 opens the deck.
export async function claimAdReward(): Promise<AdRewardResult> {
  const res = await apiClient.post('/ad-reward');
  return mapRawAdReward(rawAdRewardSchema.parse(res.data));
}
