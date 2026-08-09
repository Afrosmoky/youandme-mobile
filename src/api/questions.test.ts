import type { AxiosResponse } from 'axios';
import { fetchNextQuestion } from './questions';
import { apiClient } from './client';

jest.mock('./client', () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), patch: jest.fn() },
}));

const res = (data: unknown): AxiosResponse =>
  ({ data } as unknown as AxiosResponse);

const rawQuestion = {
  ulid: 'q_01',
  body: 'Co cię ostatnio rozśmieszyło?',
  type: 'session',
  category: { slug: 'na_poznanie', name: 'Na poznanie' },
  tags: ['niespodzianki'],
};

const rawSession = {
  ulid: 's_01',
  mode: 'local',
  category: { slug: 'na_poznanie', name: 'Na poznanie' },
  started_at: '2026-06-15T20:14:00Z',
  ended_at: null,
  current_index: 5,
  remaining_count: 20,
  cards_drawn_count: 5,
  cards_saved_count: 2,
};

describe('fetchNextQuestion', () => {
  beforeEach(() => jest.clearAllMocks());

  test('maps the question, session and sessionComplete flag', async () => {
    jest.mocked(apiClient.get).mockResolvedValue(
      res({ question: rawQuestion, session: rawSession, session_complete: false }),
    );

    const result = await fetchNextQuestion();

    expect(apiClient.get).toHaveBeenCalledWith('/questions/next');
    expect(result.question).toEqual({
      ulid: 'q_01',
      body: 'Co cię ostatnio rozśmieszyło?',
      type: 'session',
      category: { slug: 'na_poznanie', name: 'Na poznanie' },
      tags: ['niespodzianki'],
      // Same story again for `options` (S2): absent means an open question.
      options: null,
      // No `liked` in the payload → defaults to false (P5 Slice 1b).
      liked: false,
      // Same for `is_locked` (P7): absent means a free question.
      isLocked: false,
    });
    expect(result.session?.currentIndex).toBe(5);
    expect(result.sessionComplete).toBe(false);
  });

  test('reads liked from inside the question object', async () => {
    jest.mocked(apiClient.get).mockResolvedValue(
      res({
        question: { ...rawQuestion, liked: true },
        session: rawSession,
        session_complete: false,
      }),
    );

    const result = await fetchNextQuestion();

    expect(result.question?.liked).toBe(true);
  });

  test('maps is_locked to isLocked for an unlocked deck card', async () => {
    jest.mocked(apiClient.get).mockResolvedValue(
      res({
        question: { ...rawQuestion, is_locked: true },
        session: rawSession,
        session_complete: false,
      }),
    );

    const result = await fetchNextQuestion();

    expect(result.question?.isLocked).toBe(true);
  });

  test('carries the options envelope through as the backend sends it', async () => {
    jest.mocked(apiClient.get).mockResolvedValue(
      res({
        question: {
          ...rawQuestion,
          options: { items: ['Rada', 'Przytulenie'], multiple: true },
        },
        session: rawSession,
        session_complete: false,
      }),
    );

    const result = await fetchNextQuestion();

    expect(result.question?.options).toEqual({
      items: ['Rada', 'Przytulenie'],
      multiple: true,
    });
  });

  test('returns a null question when the session is complete', async () => {
    jest.mocked(apiClient.get).mockResolvedValue(
      res({ question: null, session: rawSession, session_complete: true }),
    );

    const result = await fetchNextQuestion();

    expect(result.question).toBeNull();
    expect(result.sessionComplete).toBe(true);
  });
});
