import type { AxiosResponse } from 'axios';
import { claimRatingReward } from './rating';
import { apiClient } from './client';

jest.mock('./client', () => ({
  apiClient: { post: jest.fn() },
}));

const res = (data: unknown): AxiosResponse =>
  ({ data } as unknown as AxiosResponse);

describe('claimRatingReward', () => {
  beforeEach(() => jest.clearAllMocks());

  test('POSTs to /rating-reward and reads claimed', async () => {
    jest.mocked(apiClient.post).mockResolvedValue(res({ claimed: true }));

    const result = await claimRatingReward();

    expect(apiClient.post).toHaveBeenCalledWith('/rating-reward');
    expect(result.claimed).toBe(true);
  });

  test('reads claimed=false on a repeat claim', async () => {
    jest.mocked(apiClient.post).mockResolvedValue(res({ claimed: false }));

    const result = await claimRatingReward();

    expect(result.claimed).toBe(false);
  });
});
