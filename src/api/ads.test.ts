import type { AxiosResponse } from 'axios';
import { requestAdRewardNonce } from './ads';
import { apiClient } from './client';

jest.mock('./client', () => ({
  apiClient: { post: jest.fn() },
}));

const res = (data: unknown): AxiosResponse =>
  ({ data } as unknown as AxiosResponse);

describe('requestAdRewardNonce', () => {
  beforeEach(() => jest.clearAllMocks());

  test('POSTs to the nonce endpoint and returns the nonce', async () => {
    jest.mocked(apiClient.post).mockResolvedValue(res({ nonce: 'n_abc123' }));

    const nonce = await requestAdRewardNonce();

    expect(apiClient.post).toHaveBeenCalledWith('/ad-reward/nonce');
    expect(nonce).toBe('n_abc123');
  });

  // The request carries no body: the couple is resolved server-side from the
  // auth token, never named by the client. That is the whole point of binding
  // the reward to a nonce instead of to client-supplied data.
  test('sends no payload', async () => {
    jest.mocked(apiClient.post).mockResolvedValue(res({ nonce: 'n_abc123' }));

    await requestAdRewardNonce();

    expect(apiClient.post).toHaveBeenCalledWith('/ad-reward/nonce');
    expect(jest.mocked(apiClient.post).mock.calls[0]).toHaveLength(1);
  });

  test('rejects a response without a nonce rather than showing an ad', async () => {
    jest.mocked(apiClient.post).mockResolvedValue(res({}));

    await expect(requestAdRewardNonce()).rejects.toBeDefined();
  });
});
