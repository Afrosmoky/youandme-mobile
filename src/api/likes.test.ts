import type { AxiosResponse } from 'axios';
import { likeQuestion, unlikeQuestion } from './likes';
import { apiClient } from './client';

jest.mock('./client', () => ({
  apiClient: { post: jest.fn(), delete: jest.fn() },
}));

const res = (data: unknown): AxiosResponse =>
  ({ data } as unknown as AxiosResponse);

describe('likes API', () => {
  beforeEach(() => jest.clearAllMocks());

  test('likeQuestion POSTs to the like endpoint and reads liked', async () => {
    jest.mocked(apiClient.post).mockResolvedValue(res({ liked: true }));

    const result = await likeQuestion('q_01');

    expect(apiClient.post).toHaveBeenCalledWith('/questions/q_01/like');
    expect(result.liked).toBe(true);
  });

  test('unlikeQuestion DELETEs the like endpoint and reads liked', async () => {
    jest.mocked(apiClient.delete).mockResolvedValue(res({ liked: false }));

    const result = await unlikeQuestion('q_01');

    expect(apiClient.delete).toHaveBeenCalledWith('/questions/q_01/like');
    expect(result.liked).toBe(false);
  });
});
