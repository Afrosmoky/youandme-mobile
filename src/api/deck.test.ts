import type { AxiosResponse } from 'axios';
import { getDeck, unlockQuestion } from './deck';
import { apiClient } from './client';

jest.mock('./client', () => ({
  apiClient: { get: jest.fn(), post: jest.fn() },
}));

const res = (data: unknown): AxiosResponse =>
  ({ data } as unknown as AxiosResponse);

const rawDeck = {
  locked_total: 40,
  unlocked_count: 1,
  complete: false,
  cards: [
    {
      ulid: 'q_01',
      category: { slug: 'na_poznanie', name: 'Na poznanie' },
      unlocked: true,
    },
    { ulid: 'q_02', category: null, unlocked: false },
  ],
};

describe('getDeck', () => {
  beforeEach(() => jest.clearAllMocks());

  test('GETs /deck and maps snake_case to camelCase', async () => {
    jest.mocked(apiClient.get).mockResolvedValue(res(rawDeck));

    const deck = await getDeck();

    expect(apiClient.get).toHaveBeenCalledWith('/deck');
    expect(deck.lockedTotal).toBe(40);
    expect(deck.unlockedCount).toBe(1);
    expect(deck.complete).toBe(false);
    expect(deck.cards).toHaveLength(2);
    expect(deck.cards[0]).toEqual({
      ulid: 'q_01',
      category: { slug: 'na_poznanie', name: 'Na poznanie' },
      unlocked: true,
    });
  });

  // A locked card must not carry its text — parsing has to survive its absence
  // rather than quietly expecting a body that will never come.
  test('accepts cards without a body and with no category', async () => {
    jest.mocked(apiClient.get).mockResolvedValue(res(rawDeck));

    const deck = await getDeck();

    expect(deck.cards[1]).toEqual({
      ulid: 'q_02',
      category: null,
      unlocked: false,
    });
    expect(deck.cards[1]).not.toHaveProperty('body');
  });
});

describe('unlockQuestion', () => {
  beforeEach(() => jest.clearAllMocks());

  test('POSTs to the unlock endpoint and returns balance plus deck', async () => {
    jest
      .mocked(apiClient.post)
      .mockResolvedValue(res({ credits: 2, deck: rawDeck }));

    const result = await unlockQuestion('q_02');

    expect(apiClient.post).toHaveBeenCalledWith('/questions/q_02/unlock');
    expect(result.credits).toBe(2);
    expect(result.deck.unlockedCount).toBe(1);
  });
});
