import type { AxiosResponse } from 'axios';
import { redeemCode } from './premium';
import { apiClient } from './client';

jest.mock('./client', () => ({
  apiClient: { post: jest.fn() },
}));

const res = (data: unknown): AxiosResponse =>
  ({ data } as unknown as AxiosResponse);

describe('redeemCode', () => {
  beforeEach(() => jest.clearAllMocks());

  test('POSTs the code to /redeem', async () => {
    jest.mocked(apiClient.post).mockResolvedValue(res({}));

    await redeemCode('JAITY-TEST');

    expect(apiClient.post).toHaveBeenCalledWith('/redeem', {
      code: 'JAITY-TEST',
    });
  });

  // The success payload is not part of the fixed contract, so redeeming must
  // not depend on its shape — a body we did not expect cannot be allowed to
  // fail a redeem that actually worked.
  test('succeeds whatever the response body carries', async () => {
    jest
      .mocked(apiClient.post)
      .mockResolvedValue(res({ unlocked: 40, something_new: true }));

    await expect(redeemCode('JAITY-TEST')).resolves.toBeUndefined();
  });

  test('propagates a rejected code to the caller', async () => {
    jest
      .mocked(apiClient.post)
      .mockRejectedValue({ response: { status: 422 } });

    await expect(redeemCode('NOPE')).rejects.toBeDefined();
  });
});
