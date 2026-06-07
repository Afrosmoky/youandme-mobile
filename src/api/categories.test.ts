import type { AxiosResponse } from 'axios';
import { listCategories } from './categories';
import { apiClient } from './client';

jest.mock('./client', () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), patch: jest.fn() },
}));

const res = (data: unknown): AxiosResponse =>
  ({ data } as unknown as AxiosResponse);

describe('listCategories', () => {
  beforeEach(() => jest.clearAllMocks());

  test('GETs /categories and maps each row to camelCase', async () => {
    jest.mocked(apiClient.get).mockResolvedValue(
      res({
        data: [
          {
            slug: 'na_poznanie',
            name: 'Na poznanie',
            description: null,
            tone: null,
            premium_only: false,
            ordering: 1,
          },
          {
            slug: 'intymnosc',
            name: 'Intymność',
            description: 'opis',
            tone: 'głęboko',
            premium_only: true,
            ordering: 2,
          },
        ],
      }),
    );

    const result = await listCategories();

    expect(apiClient.get).toHaveBeenCalledWith('/categories');
    expect(result).toEqual([
      {
        slug: 'na_poznanie',
        name: 'Na poznanie',
        description: null,
        tone: null,
        premiumOnly: false,
        ordering: 1,
      },
      {
        slug: 'intymnosc',
        name: 'Intymność',
        description: 'opis',
        tone: 'głęboko',
        premiumOnly: true,
        ordering: 2,
      },
    ]);
  });
});
