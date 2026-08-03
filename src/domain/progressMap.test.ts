import { cardsToNext, mapNodes, segmentStates } from './progressMap';
import { Milestone, Progress } from './types';

const milestone = (
  ordering: number,
  threshold: number,
  unlocked: boolean,
): Milestone => ({
  slug: `m${ordering}`,
  name: `Kamień ${ordering}`,
  threshold,
  ordering,
  unlocked,
  unlockedAt: unlocked ? '2026-07-20T18:30:00.000Z' : null,
});

// Four unlocked, the fifth in progress, two ahead — the state the artwork was
// drawn in.
const progress: Progress = {
  totalPlayed: 120,
  nextThreshold: 150,
  milestones: [
    milestone(1, 10, true),
    milestone(2, 30, true),
    milestone(3, 60, true),
    milestone(4, 100, true),
    milestone(5, 150, false),
    milestone(6, 250, false),
    milestone(7, 400, false),
  ],
};

describe('mapNodes', () => {
  test('marks unlocked, current and locked from the payload', () => {
    const nodes = mapNodes(progress);

    expect(nodes.map(n => n.state)).toEqual([
      'unlocked',
      'unlocked',
      'unlocked',
      'unlocked',
      'current',
      'locked',
      'locked',
    ]);
  });

  test('orders by ordering, not by the order the payload happened to arrive', () => {
    const shuffled: Progress = {
      ...progress,
      milestones: [
        progress.milestones[4],
        progress.milestones[0],
        progress.milestones[6],
        progress.milestones[2],
        progress.milestones[1],
        progress.milestones[5],
        progress.milestones[3],
      ],
    };

    expect(mapNodes(shuffled).map(n => n.milestone.ordering)).toEqual([
      1, 2, 3, 4, 5, 6, 7,
    ]);
  });

  // The artwork has seven nodes and that number is baked into its geometry. A
  // seed change must degrade to a partial map, never to a blank screen.
  test('renders the first seven and ignores a surplus', () => {
    const overfull: Progress = {
      ...progress,
      milestones: [
        ...progress.milestones,
        milestone(8, 600, false),
        milestone(9, 900, false),
      ],
    };

    const nodes = mapNodes(overfull);

    expect(nodes).toHaveLength(7);
    expect(nodes[6].milestone.ordering).toBe(7);
  });

  test('copes with fewer milestones than nodes', () => {
    const sparse: Progress = {
      totalPlayed: 5,
      nextThreshold: 10,
      milestones: [milestone(1, 10, false), milestone(2, 30, false)],
    };

    expect(mapNodes(sparse)).toHaveLength(2);
  });

  test('copes with no milestones at all', () => {
    const empty: Progress = {
      totalPlayed: 0,
      nextThreshold: null,
      milestones: [],
    };

    expect(mapNodes(empty)).toEqual([]);
  });

  test('a fresh couple has everything locked and the first as current', () => {
    const fresh: Progress = {
      ...progress,
      totalPlayed: 0,
      nextThreshold: 10,
      milestones: progress.milestones.map(m => ({
        ...m,
        unlocked: false,
        unlockedAt: null,
      })),
    };

    expect(mapNodes(fresh).map(n => n.state)).toEqual([
      'current',
      'locked',
      'locked',
      'locked',
      'locked',
      'locked',
      'locked',
    ]);
  });

  test('a complete map has no current node', () => {
    const complete: Progress = {
      ...progress,
      totalPlayed: 500,
      nextThreshold: null,
      milestones: progress.milestones.map(m => ({...m, unlocked: true})),
    };

    expect(mapNodes(complete).every(n => n.state === 'unlocked')).toBe(true);
  });
});

describe('segmentStates', () => {
  test('walks done up to the last unlocked, active into the current, todo after', () => {
    expect(segmentStates(mapNodes(progress))).toEqual([
      'done',
      'done',
      'done',
      'active',
      'todo',
      'todo',
    ]);
  });

  test('produces one fewer segment than nodes', () => {
    expect(segmentStates(mapNodes(progress))).toHaveLength(6);
  });

  test('produces no segments for a single node', () => {
    const single: Progress = {
      totalPlayed: 0,
      nextThreshold: 10,
      milestones: [
        {
          slug: 'm1',
          name: 'Kamień 1',
          threshold: 10,
          ordering: 1,
          unlocked: false,
          unlockedAt: null,
        },
      ],
    };

    expect(segmentStates(mapNodes(single))).toEqual([]);
  });
});

describe('cardsToNext', () => {
  test('counts the gap to the next threshold', () => {
    expect(cardsToNext(progress)).toBe(30);
  });

  test('is null on a complete map', () => {
    expect(cardsToNext({...progress, nextThreshold: null})).toBeNull();
  });

  // The counter can sit past the threshold between the card landing and the
  // backend unlocking; "jeszcze -3 karty" would be nonsense.
  test('never goes negative', () => {
    expect(cardsToNext({...progress, totalPlayed: 160})).toBe(0);
  });
});
