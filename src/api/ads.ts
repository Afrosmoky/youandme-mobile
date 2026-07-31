import { z } from 'zod';
import { apiClient } from './client';

// P7 rewarded-ad flow, nonce-first. This file used to hold the P6 grant call,
// where the CLIENT told the server "I watched an ad, pay me". That path is gone,
// deliberately and permanently: it was trivially spoofable, and P7 makes credits
// buy real cards. See ads.guard.test.ts, which fails if it ever comes back —
// including if this comment starts naming the old function again, since the
// guard allows itself no exceptions.
//
// The server now pays only on the AdMob SSV webhook. The client's job shrinks
// to asking for a nonce beforehand and handing it to the ad.
const nonceSchema = z.object({
  nonce: z.string(),
});

// POST /ad-reward/nonce — a one-shot token that authorises ONE ad view for this
// couple. It authorises; it does not pay.
//
// The nonce is what binds the later webhook to a couple. Google's signature only
// proves "this ad was really watched", not "by whom" — the client-supplied
// customData could otherwise name someone else's couple, and a single signed
// callback could be replayed for repeated grants. The server issues the nonce
// against the auth token, so the couple is resolved server-side, and burns it on
// first use.
export async function requestAdRewardNonce(): Promise<string> {
  const res = await apiClient.post('/ad-reward/nonce');
  return nonceSchema.parse(res.data).nonce;
}
