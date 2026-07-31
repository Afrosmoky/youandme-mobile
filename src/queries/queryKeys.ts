// Central registry of TanStack Query keys. Keeping them in one place keeps
// cache invalidation in later slices consistent — a mutation invalidates
// `queryKeys.memories`, not a stray inline array that might drift out of sync.
export const queryKeys = {
  categories: ['categories'] as const,
  memories: ['memories'] as const,
  verificationStatus: ['verification-status'] as const,
  dailyCard: ['daily-card'] as const,
  weeklyRitual: ['weekly-ritual'] as const,
  // P7. Deck and balance move together: unlocking spends a credit (rewards) and
  // opens a card (deck), so anything touching one touches the other.
  deck: ['deck'] as const,
  rewards: ['rewards'] as const,
};
