import type { AxiosResponse } from 'axios';
import { getDailyCard } from './dailyCard';
import { apiClient } from './client';

jest.mock('./client', () => ({
  apiClient: { get: jest.fn(), post: jest.fn() },
}));

const res = (data: unknown): AxiosResponse =>
  ({ data } as unknown as AxiosResponse);

const rawQuestion = {
  ulid: 'q_01',
  body: 'Pytanie dnia?',
  type: 'daily',
  category: null,
  tags: [],
};

describe('getDailyCard', () => {
  beforeEach(() => jest.clearAllMocks());

  test('folds the top-level liked flag into question.liked', async () => {
    // Backend serves `liked` at the top level here (beside `question`), not
    // inside the question — mapRawDailyCard normalizes it onto question.liked.
    jest.mocked(apiClient.get).mockResolvedValue(
      res({
        question: rawQuestion,
        liked: true,
        answered_today: false,
        streak_current: 5,
        streak_longest: 12,
        daily_push_hour: 20,
      }),
    );

    const card = await getDailyCard();

    expect(apiClient.get).toHaveBeenCalledWith('/daily-card');
    expect(card.question.liked).toBe(true);
    expect(card.answeredToday).toBe(false);
    expect(card.streakCurrent).toBe(5);
  });

  test('maps liked=false when the couple has not liked the question', async () => {
    jest.mocked(apiClient.get).mockResolvedValue(
      res({
        question: rawQuestion,
        liked: false,
        answered_today: true,
        streak_current: 0,
        streak_longest: 12,
        daily_push_hour: 20,
      }),
    );

    const card = await getDailyCard();

    expect(card.question.liked).toBe(false);
  });
});
