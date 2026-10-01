import {
  RATING_REWARD_CREDITS,
  SHARE_REWARD_CREDITS,
  UNLOCK_COST,
  creditsAsCards,
  earnOffer,
} from './rewards';
import type { Deck, Rewards } from './types';

// These three mirror private constants in youandme-api (paths in rewards.ts).
// The backend has a test pinning the same values and pointing here. If this one
// fails, the number changed on purpose on one side: change it on the other side
// too, and both tests with it — the app is otherwise promising "+5 kart" for a
// reward the server no longer gives.
describe('reward values mirrored from the backend', () => {
  test('sharing gives 5 credits', () => {
    expect(SHARE_REWARD_CREDITS).toBe(5);
  });

  test('rating gives 5 credits', () => {
    expect(RATING_REWARD_CREDITS).toBe(5);
  });

  test('unlocking a card costs 1 credit', () => {
    expect(UNLOCK_COST).toBe(1);
  });
});

const rewards = (overrides: Partial<Rewards> = {}): Rewards => ({
  credits: 0,
  shareRewardClaimed: false,
  ratingRewardClaimed: false,
  ads: { remainingToday: 0, dailyCap: 0 },
  ...overrides,
});

const deck = (lockedTotal: number, unlockedCount: number): Deck => ({
  lockedTotal,
  unlockedCount,
  complete: unlockedCount >= lockedTotal,
  cards: [],
});

describe('earnOffer', () => {
  test('a couple with nothing yet is offered the full reward for each', () => {
    const offer = earnOffer(rewards(), deck(40, 0));

    expect(offer.share).toEqual({ kind: 'cards', count: 5 });
    expect(offer.rating).toEqual({ kind: 'cards', count: 5 });
    expect(offer.unlockable).toBe(0);
  });

  test('a reward already taken says so instead of promising it again', () => {
    const offer = earnOffer(
      rewards({ shareRewardClaimed: true, credits: 5 }),
      deck(40, 0),
    );

    expect(offer.share).toEqual({ kind: 'claimed' });
    expect(offer.rating).toEqual({ kind: 'cards', count: 5 });
  });

  test('the balance shows as cards the couple can unlock now', () => {
    expect(earnOffer(rewards({ credits: 7 }), deck(40, 0)).unlockable).toBe(7);
  });

  // The closed deck caps everything: no promise of cards that are not there.
  test('a balance larger than the closed cards left unlocks only those', () => {
    const offer = earnOffer(rewards({ credits: 10 }), deck(40, 37));

    expect(offer.unlockable).toBe(3);
    expect(offer.share).toEqual({ kind: 'none' });
  });

  test('a reward is promised only up to the room left in the deck', () => {
    const offer = earnOffer(rewards({ credits: 1 }), deck(40, 37));

    expect(offer.share).toEqual({ kind: 'cards', count: 2 });
  });

  test('a fully unlocked deck promises nothing and offers no way in', () => {
    const offer = earnOffer(rewards({ credits: 5 }), deck(40, 40));

    expect(offer.share).toEqual({ kind: 'none' });
    expect(offer.rating).toEqual({ kind: 'none' });
    expect(offer.unlockable).toBe(0);
  });

  test('credits become cards at the unlock cost', () => {
    expect(creditsAsCards(5)).toBe(5 / UNLOCK_COST);
  });
});
