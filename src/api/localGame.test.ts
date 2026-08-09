import type { AxiosResponse } from 'axios';
import { fetchGameDeck, reportPlayedCards } from './localGame';
import { apiClient } from './client';

jest.mock('./client', () => ({
  apiClient: { get: jest.fn(), post: jest.fn() },
}));

const res = (data: unknown): AxiosResponse =>
  ({ data } as unknown as AxiosResponse);

const rawQuestion = (ulid: string, liked: boolean) => ({
  ulid,
  body: `Pytanie ${ulid}?`,
  type: 'session',
  category: { slug: 'randka', name: 'Randka' },
  tags: ['bliskosc'],
  liked,
  is_locked: false,
});

describe('fetchGameDeck', () => {
  beforeEach(() => jest.clearAllMocks());

  test('GETs the deck for one category and maps the cards', async () => {
    jest
      .mocked(apiClient.get)
      .mockResolvedValue(res({ questions: [rawQuestion('Q1', false)] }));

    const questions = await fetchGameDeck('randka');

    expect(apiClient.get).toHaveBeenCalledWith('/questions/deck', {
      params: { category_slug: 'randka' },
    });
    expect(questions[0]).toEqual(
      expect.objectContaining({ ulid: 'Q1', isLocked: false, options: null }),
    );
  });

  test('a mix asks for no category at all', async () => {
    jest.mocked(apiClient.get).mockResolvedValue(res({ questions: [] }));

    await fetchGameDeck(null);

    expect(apiClient.get).toHaveBeenCalledWith('/questions/deck', {
      params: {},
    });
  });

  // S3a put `liked` on this endpoint; S3b's heart on the game card reads it off
  // the frozen queue, so the value has to arrive here rather than fall back to
  // the schema's default.
  test('the like the couple already gave arrives with the card', async () => {
    jest.mocked(apiClient.get).mockResolvedValue(
      res({
        questions: [rawQuestion('Q1', true), rawQuestion('Q2', false)],
      }),
    );

    const questions = await fetchGameDeck('randka');

    expect(questions.map(q => q.liked)).toEqual([true, false]);
  });

  // The default is still what a payload predating S3a needs — the same reason
  // rawQuestionSchema declares the field optional.
  test('a card without the field reads as unliked', async () => {
    const { liked, ...withoutLiked } = rawQuestion('Q1', true);
    jest.mocked(apiClient.get).mockResolvedValue(res({ questions: [withoutLiked] }));

    const questions = await fetchGameDeck(null);

    expect(liked).toBe(true);
    expect(questions[0].liked).toBe(false);
  });
});

describe('reportPlayedCards', () => {
  beforeEach(() => jest.clearAllMocks());

  test('POSTs the batch and reads the counters back', async () => {
    jest
      .mocked(apiClient.post)
      .mockResolvedValue(res({ played_total: 12, newly_played: 3 }));

    const result = await reportPlayedCards(['Q1', 'Q2', 'Q3']);

    expect(apiClient.post).toHaveBeenCalledWith('/game/local/report', {
      question_ulids: ['Q1', 'Q2', 'Q3'],
    });
    expect(result).toEqual({ playedTotal: 12, newlyPlayed: 3 });
  });
});
