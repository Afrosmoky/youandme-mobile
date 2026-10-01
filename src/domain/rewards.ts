import type { Deck, Rewards } from './types';

// What each way of earning gives, and what one card costs.
//
// These mirror PRIVATE constants of youandme-api; GET /rewards does not send them
// yet. They are written here so the earning actions can say "+5 kart" now, and a
// test (rewards.test.ts) pins every one of them — as one on the backend pins the
// PHP side, pointing back at this file — so a change on either side breaks a test
// on that side instead of passing quietly. Once GET /rewards carries the values,
// they come from there and this block goes.
//
//   SHARE_REWARD_CREDITS  app/Modules/Rewards/Actions/ClaimShareRewardAction.php
//                         ClaimShareRewardAction::SHARE_REWARD_CREDITS
//   RATING_REWARD_CREDITS app/Modules/Rewards/Actions/ClaimRatingRewardAction.php
//                         ClaimRatingRewardAction::RATING_REWARD_CREDITS
//   UNLOCK_COST           app/Http/Controllers/Api/V1/QuestionUnlockController.php
//                         QuestionUnlockController::UNLOCK_COST
export const SHARE_REWARD_CREDITS = 5;
export const RATING_REWARD_CREDITS = 5;
export const UNLOCK_COST = 1;

/** Credits as the couple sees them: cards they can unlock. */
export function creditsAsCards(credits: number): number {
  return Math.floor(credits / UNLOCK_COST);
}

/** Closed cards in the deck this couple does not own yet. */
export function lockedRemaining(deck: Deck): number {
  return Math.max(0, deck.lockedTotal - deck.unlockedCount);
}

/**
 * What one way of earning would bring, as the couple is told it.
 *
 *   cards   — "+N kart": what the action would add AND the couple could use
 *   claimed — taken already; the server gives nothing a second time
 *   none    — nothing to promise: the closed cards that are left are already
 *             covered by what the couple holds
 */
export type EarnGain =
  | { kind: 'cards'; count: number }
  | { kind: 'claimed' }
  | { kind: 'none' };

export type EarnOffer = {
  share: EarnGain;
  rating: EarnGain;
  // Cards the couple can unlock right now: what they hold, capped by what is
  // left to unlock. Zero hides the way to the deck.
  unlockable: number;
};

/**
 * What the earning actions say, from the balance and the closed deck.
 *
 * Both are needed. A balance alone would promise "+5 kart" to a couple with
 * nothing left to unlock, and offer to unlock cards that do not exist — the same
 * kind of untrue line as the one the summary just lost.
 */
export function earnOffer(rewards: Rewards, deck: Deck): EarnOffer {
  const remaining = lockedRemaining(deck);
  const held = creditsAsCards(rewards.credits);
  // Room for more: closed cards the balance does not already cover.
  const room = Math.max(0, remaining - held);

  const gain = (claimed: boolean, credits: number): EarnGain => {
    if (claimed) {
      return { kind: 'claimed' };
    }
    const count = Math.min(creditsAsCards(credits), room);
    return count > 0 ? { kind: 'cards', count } : { kind: 'none' };
  };

  return {
    share: gain(rewards.shareRewardClaimed, SHARE_REWARD_CREDITS),
    rating: gain(rewards.ratingRewardClaimed, RATING_REWARD_CREDITS),
    unlockable: Math.min(held, remaining),
  };
}
