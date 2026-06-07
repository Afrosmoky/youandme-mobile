import type { AxiosResponse } from 'axios';
import { createMemory, listMemories } from './memories';
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
  tags: [],
};

const rawMemory = {
  ulid: 'm_01',
  question: rawQuestion,
  answer_a: 'Placek zamiast chleba.',
  answer_b: null,
  player_a_name: 'ola',
  player_b_name: 'Tomek',
  origin: 'session',
  answered_at: '2026-06-15T20:18:00Z',
};

const rawSession = {
  ulid: 's_01',
  mode: 'local',
  category: { slug: 'na_poznanie', name: 'Na poznanie' },
  started_at: '2026-06-15T20:14:00Z',
  ended_at: null,
  current_index: 6,
  remaining_count: 20,
  cards_drawn_count: 6,
  cards_saved_count: 3,
};

describe('memories API', () => {
  beforeEach(() => jest.clearAllMocks());

  test('createMemory sends snake_case answer_a/answer_b and maps the result', async () => {
    jest.mocked(apiClient.post).mockResolvedValue(
      res({ memory: rawMemory, session: rawSession }),
    );

    const result = await createMemory({
      questionUlid: 'q_01',
      answerA: 'Placek zamiast chleba.',
      answerB: null,
      answeredAt: '2026-06-15T20:18:00Z',
    });

    expect(apiClient.post).toHaveBeenCalledWith('/memories', {
      question_ulid: 'q_01',
      answer_a: 'Placek zamiast chleba.',
      answer_b: null,
      answered_at: '2026-06-15T20:18:00Z',
    });
    expect(result.memory.answerA).toBe('Placek zamiast chleba.');
    expect(result.memory.playerBName).toBe('Tomek');
    expect(result.memory.question.tags).toEqual([]);
    expect(result.session.cardsSavedCount).toBe(3);
  });

  test('createMemory defaults answer_b to null when omitted', async () => {
    jest.mocked(apiClient.post).mockResolvedValue(
      res({ memory: rawMemory, session: rawSession }),
    );

    await createMemory({
      questionUlid: 'q_01',
      answerA: 'Placek zamiast chleba.',
      answeredAt: '2026-06-15T20:18:00Z',
    });

    expect(apiClient.post).toHaveBeenCalledWith(
      '/memories',
      expect.objectContaining({ answer_b: null }),
    );
  });

  test('listMemories maps the page and cursors', async () => {
    jest.mocked(apiClient.get).mockResolvedValue(
      res({
        data: [rawMemory],
        meta: { next_cursor: 'cur_2', prev_cursor: null, per_page: 20 },
      }),
    );

    const page = await listMemories();

    expect(page.memories[0].answerA).toBe('Placek zamiast chleba.');
    expect(page.nextCursor).toBe('cur_2');
    expect(page.prevCursor).toBeNull();
  });
});
