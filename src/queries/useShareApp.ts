import { useCallback } from 'react';
import { Alert, Share } from 'react-native';
import * as StoreReview from 'react-native-store-review';
import { claimShareReward } from '../api/share';
import { claimRatingReward } from '../api/rating';
import { pl } from '../i18n/pl';

// P5 share target. Landing page placeholder until store links exist (P12). The
// URL is embedded in the message rather than passed as Share's separate `url`:
// some iOS targets (e.g. Reminders) take only the message and drop `url`, and
// the app link is the whole point of the share. We accept losing the iOS
// rich-preview (irrelevant in MVP) to guarantee the link always travels.
const SHARE_URL = 'https://jaity.app';

/**
 * Telling somebody about the app, and being thanked for it.
 *
 * Lifted out of ProfileScreen unchanged. It moved because 3D points the
 * deck-exhaustion funnel at the same two rewards: when a couple runs out of
 * cards, "tell a friend" and "rate us" are the two things they can do that
 * actually give them more, and both existed since P5 and P6 with no way in from
 * that moment. Two call sites means it stops being a screen's private function.
 */
export function useShareApp() {
  // Opens the native share sheet. Claims the reward only when the user actually
  // picks a target (sharedAction) — dismissing withdraws the gesture. The claim
  // is best-effort and idempotent server-side, so any failure stays silent (the
  // bonus is granted server-side; there is nothing local to correct).
  return useCallback(async () => {
    try {
      const result = await Share.share({
        message: `${pl.share.message} ${SHARE_URL}`,
      });
      if (result.action === Share.sharedAction) {
        await claimShareReward();
        Alert.alert(pl.appTitle, pl.share.thanksToast);
      }
    } catch {
      // Share sheet failed to open, or the claim call failed — nothing to
      // recover here; the reward is idempotent and server-owned.
    }
  }, []);
}

/**
 * Asking for a store review, and being thanked for asking.
 *
 * Also lifted unchanged, for the same reason.
 */
export function useRateApp() {
  // Unlike the share above, the claim is unconditional: In-App Review has no
  // callback, so there is no signal saying whether the prompt appeared or
  // whether the user rated. We reward the gesture of asking, which is why the
  // two steps sit in separate try blocks — a throwing requestReview() must not
  // skip the claim.
  //
  // Note: Apple and Google both discourage triggering the review flow from a
  // button (it is meant to fire at a natural moment in the journey), so the
  // prompt will often silently not show. The grant works either way.
  return useCallback(async () => {
    try {
      StoreReview.requestReview();
    } catch {
      // Native module missing, or no foreground scene to present in.
    }
    try {
      await claimRatingReward();
      Alert.alert(pl.appTitle, pl.rating.thanksToast);
    } catch {
      // Best-effort and idempotent server-side; nothing local to correct.
    }
  }, []);
}
