import type { AxiosResponse } from 'axios';
import {
  createMemory,
  deleteMemory,
  getMemory,
  listMemories,
  setMemoryFavorite,
  updateMemory,
} from './memories';
import { apiClient } from './client';

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
  is_favorite: false,
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
    // Embedded questions carry no `liked` — it defaults to false rather than
    // failing to parse (P5 Slice 1b, rawQuestionSchema.liked is optional).
    expect(result.memory.question.liked).toBe(false);
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

  test('listMemories asks for the favourites-only list when filtered', async () => {
    jest.mocked(apiClient.get).mockResolvedValue(
      res({ data: [], meta: { next_cursor: null, prev_cursor: null, per_page: 20 } }),
    );

    await listMemories({ favoritesOnly: true });

    expect(apiClient.get).toHaveBeenCalledWith('/memories', {
      params: expect.objectContaining({ favorites: 1 }),
    });
  });

  // The unfiltered request has to stay exactly what it was before P9 — the
  // backend reads any `favorites` value as a filter, including a falsy one.
  test('listMemories omits the flag entirely when unfiltered', async () => {
    jest.mocked(apiClient.get).mockResolvedValue(
      res({ data: [], meta: { next_cursor: null, prev_cursor: null, per_page: 20 } }),
    );

    await listMemories({ cursor: 'cur_2' });

    expect(apiClient.get).toHaveBeenCalledWith('/memories', {
      params: { cursor: 'cur_2', per_page: 20 },
    });
  });

  test('getMemory reads one memory by ulid', async () => {
    jest.mocked(apiClient.get).mockResolvedValue(res({ memory: rawMemory }));

    const memory = await getMemory('m_01');

    expect(apiClient.get).toHaveBeenCalledWith('/memories/m_01');
    expect(memory.answerA).toBe('Placek zamiast chleba.');
    expect(memory.isFavorite).toBe(false);
  });

  // Two idempotent verbs, not one toggle: PUT hearts, DELETE unhearts.
  test('setMemoryFavorite PUTs to heart and DELETEs to unheart', async () => {
    jest
      .mocked(apiClient.put)
      .mockResolvedValue(res({ memory: { ...rawMemory, is_favorite: true } }));
    jest
      .mocked(apiClient.delete)
      .mockResolvedValue(res({ memory: { ...rawMemory, is_favorite: false } }));

    expect((await setMemoryFavorite('m_01', true)).isFavorite).toBe(true);
    expect(apiClient.put).toHaveBeenCalledWith('/memories/m_01/favorite');

    expect((await setMemoryFavorite('m_01', false)).isFavorite).toBe(false);
    expect(apiClient.delete).toHaveBeenCalledWith('/memories/m_01/favorite');
  });

  test('updateMemory sends both answers', async () => {
    jest.mocked(apiClient.patch).mockResolvedValue(res({ memory: rawMemory }));

    await updateMemory('m_01', { answerA: 'Nowa.', answerB: 'Druga.' });

    expect(apiClient.patch).toHaveBeenCalledWith('/memories/m_01', {
      answer_a: 'Nowa.',
      answer_b: 'Druga.',
    });
  });

  // The contract is a full replacement: a cleared partner answer must travel as
  // an explicit null, not as a missing key.
  test('updateMemory sends a cleared partner answer as null', async () => {
    jest.mocked(apiClient.patch).mockResolvedValue(res({ memory: rawMemory }));

    await updateMemory('m_01', { answerA: 'Nowa.', answerB: null });

    expect(apiClient.patch).toHaveBeenCalledWith('/memories/m_01', {
      answer_a: 'Nowa.',
      answer_b: null,
    });
  });

  test('deleteMemory calls the endpoint and returns nothing', async () => {
    jest.mocked(apiClient.delete).mockResolvedValue(res(undefined));

    await expect(deleteMemory('m_01')).resolves.toBeUndefined();
    expect(apiClient.delete).toHaveBeenCalledWith('/memories/m_01');
  });
});
