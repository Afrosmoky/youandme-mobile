import { apiClient } from './client';

// POST /redeem — trades a promo code for the whole locked deck (P7). "Premium"
// here means outside store billing: MVP measures purchase intent with a code,
// real IAP is stage II.
//
// The couple is resolved server-side from the token, never sent by the client.
//
// Deliberately returns void rather than parsing a body. The contract fixes the
// error cases (422 invalid/expired/used, 409 already redeemed on this account)
// but does not pin down the success payload, and demanding a shape we are not
// sure of would turn a SUCCESSFUL redeem into a zod failure — the worst way to
// be wrong here. The caller invalidates the deck and the balance instead and
// lets the refreshed state speak for itself.
export async function redeemCode(code: string): Promise<void> {
  await apiClient.post('/redeem', { code });
}
