import type { AxiosResponse } from 'axios';
import { fetchNextQuestion, listLikedQuestions } from './questions';
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

describe('listLikedQuestions', () => {
  beforeEach(() => jest.clearAllMocks());

  test('maps the page and its cursors', async () => {
    jest.mocked(apiClient.get).mockResolvedValue(
      res({
        data: [rawQuestion],
        meta: { next_cursor: 'cur_2', prev_cursor: null, per_page: 20 },
      }),
    );

    const page = await listLikedQuestions();

    expect(page.questions[0].body).toBe('Co cię ostatnio rozśmieszyło?');
    expect(page.nextCursor).toBe('cur_2');
    expect(page.prevCursor).toBeNull();
  });

  test('passes the cursor through and asks for one page, not the lot', async () => {
    jest.mocked(apiClient.get).mockResolvedValue(
      res({
        data: [],
        meta: { next_cursor: null, prev_cursor: null, per_page: 20 },
      }),
    );

    await listLikedQuestions('cur_2');

    expect(apiClient.get).toHaveBeenCalledWith('/questions/liked', {
      params: { cursor: 'cur_2', per_page: 20 },
    });
  });

  // The card comes off the same builder as /questions/next, so is_locked and
  // options ride along. is_locked here means "a paid card you own" — the backend
  // drops cards the couple has not unlocked before it pages — so the screen
  // renders it as the unlocked badge, never as something withheld.
  test('carries is_locked and options off the shared card shape', async () => {
    jest.mocked(apiClient.get).mockResolvedValue(
      res({
        data: [
          {
            ...rawQuestion,
            liked: true,
            is_locked: true,
            options: { items: ['Tak', 'Nie'], multiple: false },
          },
        ],
        meta: { next_cursor: null, prev_cursor: null, per_page: 20 },
      }),
    );

    const page = await listLikedQuestions();

    expect(page.questions[0].isLocked).toBe(true);
    expect(page.questions[0].liked).toBe(true);
    expect(page.questions[0].options?.items).toEqual(['Tak', 'Nie']);
  });
});
