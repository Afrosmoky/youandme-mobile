import {
  AdEventType,
  RewardedAd,
  RewardedAdEventType,
  TestIds,
} from 'react-native-google-mobile-ads';

// All AdMob interaction lives here, the way src/notifications/notifee.ts owns
// notifee: screens call one function and the native lifecycle stays mockable in
// one place.

// P6 runs on Google's test ad unit (TestIds picks the right one per platform),
// paired with the sample App IDs in app.json. Real AdMob account and unit IDs
// land at launch, together with the real bundle ID.
const AD_UNIT_ID = TestIds.REWARDED;

// Non-personalized ads only: this sidesteps ATT (iOS) and UMP consent, which is
// a separate piece of work for launch. No consent flow ships in P6.
//
// Built per call rather than held as a module constant, because from P7 every
// request carries its own nonce.
const requestOptions = (nonce: string) => ({
  requestNonPersonalizedAdsOnly: true,
  // AdMob echoes customData back to our SSV webhook, which is how the server
  // learns which couple watched. Only the server can mint a nonce and it burns
  // on first use, so a tampered client cannot credit someone else's couple and
  // a replayed callback cannot pay twice.
  serverSideVerificationOptions: { customData: nonce },
});

// A silent ad network would otherwise leave the button spinning forever. AdMob
// does emit ERROR on no-fill, so this is a backstop, not the usual path.
const LOAD_TIMEOUT_MS = 15_000;

export type RewardedAdOutcome =
  // The user watched far enough to earn the reward. From P7 this means only
  // "the ad completed" — no credit is granted here; the server pays when the
  // SSV callback carrying our nonce reaches it.
  | 'earned'
  // The ad showed but the user closed it early — no reward.
  | 'dismissed'
  // No ad to show: no fill, network error, or load timeout.
  | 'unavailable';

/**
 * Loads and shows a rewarded video, resolving with what the user did.
 *
 * Loads on tap rather than preloading: the profile screen is opened mostly for
 * other reasons, and a preloaded ad expires within the hour, so preloading
 * would spend an ad request per visit to save a couple of seconds on the rare
 * visit that ends in a tap.
 *
 * Resolves on EARNED_REWARD rather than on CLOSED. The reward fires before the
 * user dismisses the ad, and the relative order of the two events differs
 * between iOS and Android — keying off CLOSED would make the outcome depend on
 * that ordering.
 *
 * The nonce must come from the server (see requestAdRewardNonce); it travels
 * with the ad request and comes back to our backend in the SSV callback. An ad
 * shown without one would be unattributable and would never be paid for.
 */
export function showRewardedAd(nonce: string): Promise<RewardedAdOutcome> {
  return new Promise(resolve => {
    const ad = RewardedAd.createForAdRequest(AD_UNIT_ID, requestOptions(nonce));

    const unsubscribes: Array<() => void> = [];
    let settled = false;

    // Every path funnels through here: the ad emits more events after the
    // outcome is known (CLOSED after EARNED_REWARD), and a promise can only
    // settle once.
    const settle = (outcome: RewardedAdOutcome) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeout);
      unsubscribes.forEach(unsubscribe => unsubscribe());
      resolve(outcome);
    };

    const timeout = setTimeout(() => settle('unavailable'), LOAD_TIMEOUT_MS);

    unsubscribes.push(
      ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
        // show() both throws synchronously (ad not loaded) and returns a
        // promise that can reject (native presentation failed) — neither must
        // escape as an unhandled rejection.
        try {
          ad.show().catch(() => settle('unavailable'));
        } catch {
          settle('unavailable');
        }
      }),
      ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
        settle('earned');
      }),
      ad.addAdEventListener(AdEventType.CLOSED, () => {
        settle('dismissed');
      }),
      ad.addAdEventListener(AdEventType.ERROR, () => {
        settle('unavailable');
      }),
    );

    ad.load();
  });
}
