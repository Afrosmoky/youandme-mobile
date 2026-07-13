// Streak milestones celebrated in the UI (and by a local notification). Pure
// presentation: the reward (a card pack) arrives in P7. The backend knows
// nothing about these — streakCurrent already comes effective from the API.
export const STREAK_MILESTONES = [7, 30, 100] as const;

// True when a streak value lands exactly on a milestone (e.g. 7, not 8).
export function isStreakMilestone(streak: number): boolean {
  return (STREAK_MILESTONES as readonly number[]).includes(streak);
}
