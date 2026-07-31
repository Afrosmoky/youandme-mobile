import type { AxiosResponse } from 'axios';
import { getRewards } from './rewards';
import { apiClient } from './client';

jest.mock('./client', () => ({
  apiClient: { get: jest.fn() },
}));

const res = (data: unknown): AxiosResponse =>
  ({ data } as unknown as AxiosResponse);

describe('getRewards', () => {
  beforeEach(() => jest.clearAllMocks());

  test('GETs /rewards and maps snake_case to camelCase', async () => {
    jest.mocked(apiClient.get).mockResolvedValue(
      res({
        credits: 3,
        share_reward_claimed: true,
        rating_reward_claimed: false,
        ads: { remaining_today: 4, daily_cap: 5 },
      }),
    );

    const rewards = await getRewards();

    expect(apiClient.get).toHaveBeenCalledWith('/rewards');
    expect(rewards).toEqual({
      credits: 3,
      shareRewardClaimed: true,
      ratingRewardClaimed: false,
      ads: { remainingToday: 4, dailyCap: 5 },
    });
  });

  test('reads a zero balance without treating it as missing', async () => {
    jest.mocked(apiClient.get).mockResolvedValue(
      res({
        credits: 0,
        share_reward_claimed: false,
        rating_reward_claimed: false,
        ads: { remaining_today: 0, daily_cap: 5 },
      }),
    );

    const rewards = await getRewards();

    expect(rewards.credits).toBe(0);
    expect(rewards.ads.remainingToday).toBe(0);
  });
});
