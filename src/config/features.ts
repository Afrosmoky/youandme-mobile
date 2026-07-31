// Build-time feature gates. Plain constants, not runtime config: these are
// decisions about what this build is allowed to show, not settings a user or a
// server changes.

/**
 * Whether to offer "watch an ad for a credit".
 *
 * OFF until AdMob's Server-Side Verification is live, which needs a publicly
 * reachable APP_URL for Google to call back to, plus a real AdMob account. From
 * P7 the client no longer grants the credit itself — the server pays only when
 * that callback arrives. Without it the flow is not merely untestable, it is
 * dead: the user watches an ad, sees "credit on its way", and the credit never
 * comes.
 *
 * Everything behind this flag is written, tested and ready. Flip it to true once
 * BOTH hold:
 *   - the backend is reachable from the internet at the URL registered as the
 *     SSV callback in the AdMob console, and
 *   - the app runs against a real AdMob account rather than the test ad units
 *     (see AD_UNIT_ID in src/ads/rewardedAd.ts and the sample App IDs in
 *     app.json).
 */
export const AD_REWARD_ENABLED = false;
