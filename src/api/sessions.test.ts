import axios from 'axios';
import type { AxiosResponse } from 'axios';
import {
  startSession,
  getActiveSession,
  endSession,
  skipCurrentQuestion,
} from './sessions';
import { apiClient } from './client';

jest.mock('./client', () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), patch: jest.fn() },
}));

const res = (data: unknown): AxiosResponse =>
  ({ data } as unknown as AxiosResponse);

const rawSession = {
  ulid: 's_01',
  mode: 'local',
  category: { slug: 'na_poznanie', name: 'Na poznanie' },
  started_at: '2026-06-15T20:14:00Z',
  ended_at: null,
  current_index: 0,
  remaining_count: 20,
  cards_drawn_count: 0,
  cards_saved_count: 0,
};

const mappedSession = {
  ulid: 's_01',
  mode: 'local',
  category: { slug: 'na_poznanie', name: 'Na poznanie' },
  startedAt: '2026-06-15T20:14:00Z',
  endedAt: null,
  currentIndex: 0,
  remainingCount: 20,
  cardsDrawnCount: 0,
  cardsSavedCount: 0,
};

describe('sessions API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(axios.isAxiosError).mockReturnValue(false);
  });

  test('startSession posts the category slug and maps the session', async () => {
    jest.mocked(apiClient.post).mockResolvedValue(res({ session: rawSession }));

    const result = await startSession('na_poznanie');

    expect(apiClient.post).toHaveBeenCalledWith('/sessions/start', {
      category_slug: 'na_poznanie',
    });
    expect(result).toEqual(mappedSession);
  });

  test('startSession sends null for mix mode', async () => {
    jest.mocked(apiClient.post).mockResolvedValue(res({ session: rawSession }));

    await startSession(null);

    expect(apiClient.post).toHaveBeenCalledWith('/sessions/start', {
      category_slug: null,
    });
  });

  test('getActiveSession returns the mapped session on 200', async () => {
    jest.mocked(apiClient.get).mockResolvedValue(res({ session: rawSession }));

    const result = await getActiveSession();

    expect(apiClient.get).toHaveBeenCalledWith('/sessions/active');
    expect(result).toEqual(mappedSession);
  });

  test('getActiveSession returns null on 404', async () => {
    jest.mocked(apiClient.get).mockRejectedValue({ response: { status: 404 } });
    jest.mocked(axios.isAxiosError).mockReturnValue(true);

    expect(await getActiveSession()).toBeNull();
  });

  test('getActiveSession rethrows non-404 errors', async () => {
    const err = { response: { status: 500 } };
    jest.mocked(apiClient.get).mockRejectedValue(err);
    jest.mocked(axios.isAxiosError).mockReturnValue(true);

    await expect(getActiveSession()).rejects.toEqual(err);
  });

  test('endSession posts to the end endpoint', async () => {
    jest.mocked(apiClient.post).mockResolvedValue(res({}));

    await endSession('s_01');

    expect(apiClient.post).toHaveBeenCalledWith('/sessions/s_01/end');
  });

  test('skipCurrentQuestion posts and maps the advanced session', async () => {
    const advanced = { ...rawSession, current_index: 1, cards_drawn_count: 1 };
    jest.mocked(apiClient.post).mockResolvedValue(res({ session: advanced }));

    const result = await skipCurrentQuestion('s_01');

    expect(apiClient.post).toHaveBeenCalledWith('/sessions/s_01/skip-current');
    expect(result).toEqual({
      ...mappedSession,
      currentIndex: 1,
      cardsDrawnCount: 1,
    });
  });
});
