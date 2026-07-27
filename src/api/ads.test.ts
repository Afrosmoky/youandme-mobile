import type { AxiosResponse } from 'axios';
import { claimAdReward } from './ads';
import { apiClient } from './client';

jest.mock('./client', () => ({
  apiClient: { post: jest.fn() },
}));

const res = (data: unknown): AxiosResponse =>
  ({ data } as unknown as AxiosResponse);

describe('claimAdReward', () => {
  beforeEach(() => jest.clearAllMocks());

  test('POSTs to /ad-reward and maps snake_case to camelCase', async () => {
    jest.mocked(apiClient.post).mockResolvedValue(
      res({ granted: true, credits_awarded: 1, remaining_today: 4 }),
    );

    const result = await claimAdReward();

    expect(apiClient.post).toHaveBeenCalledWith('/ad-reward');
    expect(result).toEqual({
      granted: true,
      creditsAwarded: 1,
      remainingToday: 4,
    });
  });

  test('reads a refusal once the daily cap is reached', async () => {
    jest.mocked(apiClient.post).mockResolvedValue(
      res({ granted: false, credits_awarded: 0, remaining_today: 0 }),
    );

    const result = await claimAdReward();

    expect(result.granted).toBe(false);
    expect(result.remainingToday).toBe(0);
  });
});
