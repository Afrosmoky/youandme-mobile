import type {AxiosResponse} from 'axios';
import {getWeeklyRitual, setWeeklyRitualCompleted} from './rituals';
import {apiClient} from './client';

jest.mock('./client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

const res = (data: unknown): AxiosResponse =>
  ({data} as unknown as AxiosResponse);

describe('getWeeklyRitual', () => {
  beforeEach(() => jest.clearAllMocks());

  // A backend that predates the completion feature sends no `completed` key.
  // The schema defaults it to false rather than failing, so an app that reaches
  // an older deployment shows a ritual with an untouched button instead of a
  // screen that spins forever.
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
      completed: false,
    });
  });

  test('reads completed when the backend sends it', async () => {
    jest.mocked(apiClient.get).mockResolvedValue(
      res({
        ritual: {ulid: 'r_01', title: 'T', body: 'B'},
        started_on: '2026-07-12',
        day_of_week: 3,
        completed: true,
      }),
    );

    expect((await getWeeklyRitual()).completed).toBe(true);
  });
});

// Two verbs naming a destination, not one endpoint flipping a flag: a retry
// cannot undo what the first request did.
describe('setWeeklyRitualCompleted', () => {
  beforeEach(() => jest.clearAllMocks());

  test('PUTs to mark it done', async () => {
    jest.mocked(apiClient.put).mockResolvedValue(res({completed: true}));

    expect(await setWeeklyRitualCompleted(true)).toBe(true);
    expect(apiClient.put).toHaveBeenCalledWith('/weekly-ritual/completed');
    expect(apiClient.delete).not.toHaveBeenCalled();
  });

  test('DELETEs to take it back', async () => {
    jest.mocked(apiClient.delete).mockResolvedValue(res({completed: false}));

    expect(await setWeeklyRitualCompleted(false)).toBe(false);
    expect(apiClient.delete).toHaveBeenCalledWith('/weekly-ritual/completed');
    expect(apiClient.put).not.toHaveBeenCalled();
  });

  // Neither verb may carry an identifier: the couple comes from the token and
  // the week from the server clock. Sending one would be inventing a contract.
  test('sends no identifier in either direction', async () => {
    jest.mocked(apiClient.put).mockResolvedValue(res({completed: true}));

    await setWeeklyRitualCompleted(true);

    expect(jest.mocked(apiClient.put).mock.calls[0]).toHaveLength(1);
  });
});
