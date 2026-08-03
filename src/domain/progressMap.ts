import { Milestone, Progress } from './types';

// Pure geometry-free logic behind the progress map: which visual state each
// node and each trail segment is in. Kept out of the component so it can be
// tested directly, the way src/domain/streak.ts holds the streak thresholds.

// The map artwork has exactly seven nodes, baked into its geometry. The backend
// seeds seven milestones today, but a seed change must not blank the screen —
// so we render the first seven by ordering and ignore any surplus.
export const MAP_NODE_COUNT = 7;

export type NodeState = 'unlocked' | 'current' | 'locked';
export type SegmentState = 'done' | 'active' | 'todo';

export type MapNode = {
  milestone: Milestone;
  state: NodeState;
};

// Sorts by `ordering` and truncates to what the artwork can show. Sorting is not
// defensive dressing: `ordering` is the contract's sequence, and relying on
// array order would put a milestone under the wrong node the day the backend
// returns them differently.
export function mapNodes(progress: Progress): MapNode[] {
  return [...progress.milestones]
    .sort((a, b) => a.ordering - b.ordering)
    .slice(0, MAP_NODE_COUNT)
    .map(milestone => ({
      milestone,
      state: nodeState(milestone, progress.nextThreshold),
    }));
}

// `current` is the milestone the couple is working towards — matched on
// threshold against next_threshold rather than on "first not unlocked", because
// that is how the backend defines it (min(threshold > total)) and the two only
// agree while ordering and threshold agree.
function nodeState(
  milestone: Milestone,
  nextThreshold: number | null,
): NodeState {
  if (milestone.unlocked) {
    return 'unlocked';
  }
  return milestone.threshold === nextThreshold ? 'current' : 'locked';
}

// Segment i joins node i to node i+1, and takes its state from where it leads:
// reaching an unlocked node means the stretch is walked, reaching the current
// one means it is being walked now, anything further is untrodden.
export function segmentStates(nodes: MapNode[]): SegmentState[] {
  return nodes.slice(1).map(target => {
    if (target.state === 'unlocked') {
      return 'done';
    }
    return target.state === 'current' ? 'active' : 'todo';
  });
}

// How many cards remain to the next milestone. Null once there is nothing left
// to count towards, which is also how the contract signals a complete map.
export function cardsToNext(progress: Progress): number | null {
  if (progress.nextThreshold === null) {
    return null;
  }
  return Math.max(0, progress.nextThreshold - progress.totalPlayed);
}

// Slugs of everything already unlocked — the whole state the celebration
// detector has to remember between two readings of GET /progress. Slugs, not
// the milestones themselves: `unlocked_at` and even `name` may be rewritten
// server-side (the copy is still Wiktoria's to finish), and a changed word must
// not read as a new milestone.
export function unlockedSlugs(progress: Progress): string[] {
  return progress.milestones.filter(m => m.unlocked).map(m => m.slug);
}

// The milestone worth celebrating in `progress` given what was already unlocked
// in `previous`, or null when nothing crossed over.
//
// NOT truncated to MAP_NODE_COUNT: the map can only draw seven nodes, but an
// eighth unlock is still real and its name still reads fine in a modal. Better
// to celebrate something the artwork cannot show than to swallow it silently.
//
// With several at once — one card crossing two thresholds, or a backend that
// backfills — the furthest by `ordering` wins: it is the one that says how far
// the couple has actually come, and the earlier ones are implied by it.
export function newlyUnlockedMilestone(
  previous: ReadonlySet<string>,
  progress: Progress,
): Milestone | null {
  const fresh = progress.milestones.filter(
    m => m.unlocked && !previous.has(m.slug),
  );
  if (fresh.length === 0) {
    return null;
  }
  return fresh.reduce((furthest, m) =>
    m.ordering > furthest.ordering ? m : furthest,
  );
}
