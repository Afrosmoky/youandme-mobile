import type { AxiosResponse } from 'axios';
import { getProgress } from './progress';
import { apiClient } from './client';

jest.mock('./client', () => ({
  apiClient: { get: jest.fn() },
}));

const res = (data: unknown): AxiosResponse =>
  ({ data } as unknown as AxiosResponse);

const rawMilestone = {
  slug: 'pierwsze_kroki',
  name: 'Pierwsze kroki',
  threshold: 10,
  ordering: 1,
  unlocked: true,
  unlocked_at: '2026-07-20T18:30:00.000Z',
};

describe('getProgress', () => {
  beforeEach(() => jest.clearAllMocks());

  test('GETs /progress and maps snake_case to camelCase', async () => {
    jest.mocked(apiClient.get).mockResolvedValue(
      res({
        total_played: 24,
        next_threshold: 50,
        milestones: [rawMilestone],
      }),
    );

    const progress = await getProgress();

    expect(apiClient.get).toHaveBeenCalledWith('/progress');
    expect(progress.totalPlayed).toBe(24);
    expect(progress.nextThreshold).toBe(50);
    expect(progress.milestones[0]).toEqual({
      slug: 'pierwsze_kroki',
      name: 'Pierwsze kroki',
      threshold: 10,
      ordering: 1,
      unlocked: true,
      unlockedAt: '2026-07-20T18:30:00.000Z',
    });
  });

  // Every milestone unlocked: there is no next threshold to count towards, and
  // null is the contract's way of saying so — not a missing field.
  test('reads a null next_threshold on a complete map', async () => {
    jest.mocked(apiClient.get).mockResolvedValue(
      res({
        total_played: 500,
        next_threshold: null,
        milestones: [rawMilestone],
      }),
    );

    const progress = await getProgress();

    expect(progress.nextThreshold).toBeNull();
  });

  // A locked milestone still carries its name — the map is meant to show what
  // is ahead, so the copy is never withheld.
  test('keeps the name and null unlocked_at of a locked milestone', async () => {
    jest.mocked(apiClient.get).mockResolvedValue(
      res({
        total_played: 0,
        next_threshold: 10,
        milestones: [
          { ...rawMilestone, unlocked: false, unlocked_at: null },
        ],
      }),
    );

    const progress = await getProgress();

    expect(progress.milestones[0].name).toBe('Pierwsze kroki');
    expect(progress.milestones[0].unlocked).toBe(false);
    expect(progress.milestones[0].unlockedAt).toBeNull();
  });

  test('reads a fresh couple with nothing played', async () => {
    jest.mocked(apiClient.get).mockResolvedValue(
      res({ total_played: 0, next_threshold: 10, milestones: [] }),
    );

    const progress = await getProgress();

    expect(progress.totalPlayed).toBe(0);
    expect(progress.milestones).toEqual([]);
  });
});
