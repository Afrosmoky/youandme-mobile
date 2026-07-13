import type {AxiosResponse} from 'axios';
import {getWeeklyRitual} from './rituals';
import {apiClient} from './client';

jest.mock('./client', () => ({
  apiClient: {get: jest.fn(), post: jest.fn(), patch: jest.fn()},
}));

const res = (data: unknown): AxiosResponse =>
  ({data} as unknown as AxiosResponse);

describe('getWeeklyRitual', () => {
  beforeEach(() => jest.clearAllMocks());

  test('GETs /weekly-ritual and maps to camelCase', async () => {
    jest.mocked(apiClient.get).mockResolvedValue(
      res({
        ritual: {
          ulid: 'r_01',
          title: 'Tydzień intymności',
          body: 'Usiądźcie naprzeciw siebie...',
        },
        started_on: '2026-07-12',
        day_of_week: 3,
      }),
    );

    const result = await getWeeklyRitual();

    expect(apiClient.get).toHaveBeenCalledWith('/weekly-ritual');
    expect(result).toEqual({
      ritual: {
        ulid: 'r_01',
        title: 'Tydzień intymności',
        body: 'Usiądźcie naprzeciw siebie...',
      },
      startedOn: '2026-07-12',
      dayOfWeek: 3,
    });
  });
});
