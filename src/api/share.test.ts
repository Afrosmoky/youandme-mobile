import type { AxiosResponse } from 'axios';
import { claimShareReward } from './share';
import { apiClient } from './client';

jest.mock('./client', () => ({
  apiClient: { post: jest.fn() },
}));

const res = (data: unknown): AxiosResponse =>
  ({ data } as unknown as AxiosResponse);

describe('claimShareReward', () => {
  beforeEach(() => jest.clearAllMocks());

  test('POSTs to /share-reward and reads claimed', async () => {
    jest.mocked(apiClient.post).mockResolvedValue(res({ claimed: true }));

    const result = await claimShareReward();

    expect(apiClient.post).toHaveBeenCalledWith('/share-reward');
    expect(result.claimed).toBe(true);
  });
});
