// Central registry of TanStack Query keys. Keeping them in one place keeps
// cache invalidation in later slices consistent — a mutation invalidates
// `queryKeys.memories`, not a stray inline array that might drift out of sync.
export const queryKeys = {
  categories: ['categories'] as const,
  // P9 turned this into a PREFIX rather than a key of its own: the list now
  // comes in two variants (all / favourites only) and the card screen reads a
  // single memory. Everything below it starts with 'memories', so the
  // invalidations written in P4 and P8 (useSaveMemory, useAnswerDailyCard) keep
  // matching all of them — TanStack matches keys by prefix. Splitting the
  // favourites list off into a key of its own would break nothing loudly; it
  // would just quietly stop refreshing after a saved card.
  memories: ['memories'] as const,
  // Both list variants at once — what a memory edit or delete invalidates, since
  // it changes what the lists show without touching anything else.
  memoriesLists: ['memories', 'list'] as const,
  memoriesList: (favoritesOnly: boolean) =>
    ['memories', 'list', { favoritesOnly }] as const,
  memory: (ulid: string) => ['memories', 'detail', ulid] as const,
  verificationStatus: ['verification-status'] as const,
  dailyCard: ['daily-card'] as const,
  weeklyRitual: ['weekly-ritual'] as const,
  // P7. Deck and balance move together: unlocking spends a credit (rewards) and
  // opens a card (deck), so anything touching one touches the other.
  deck: ['deck'] as const,
  rewards: ['rewards'] as const,
  // P8. Moves whenever a card is played, so both save paths invalidate it.
  progress: ['progress'] as const,
};
