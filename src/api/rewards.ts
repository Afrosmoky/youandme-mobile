import { apiClient } from './client';
import { Rewards, mapRawRewards, rawRewardsSchema } from '../domain/types';

// GET /rewards — the couple's credit balance plus the state of each earner.
// P7 is where credits stop being invisible: they were accumulating silently
// from P5 (share, referral) and P6 (rating, ads), and this is the first read
// that puts them in front of the user.
export async function getRewards(): Promise<Rewards> {
  const res = await apiClient.get('/rewards');
  return mapRawRewards(rawRewardsSchema.parse(res.data));
}
