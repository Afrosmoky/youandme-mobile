import { pl } from '../i18n/pl';

// Apple's "Hide My Email" hands out a forwarding address on this domain instead
// of the real one. It is not a fact about the user's account so much as about
// what the account was created under, which is why the notice below has to
// treat it as its own case.
const APPLE_PRIVATE_RELAY = '@privaterelay.appleid.com';

/**
 * What to say when a social sign-in CREATED an account rather than finding one.
 *
 * Two versions, because naming the address is the whole mechanism of the message
 * and there is one address that must not be named. A relay address is a string
 * of random characters: shown literally it reads as a bug, and the couple most
 * likely to see it is exactly the one this message exists to turn back — the one
 * who already has an account under their real address and has just landed on an
 * empty one. So that case names the CAUSE ("you signed in with a hidden
 * address") instead of the address.
 *
 * Everywhere else the address is the useful part: seeing an address they do not
 * recognise is how somebody realises they picked the wrong Google account, and
 * seeing the right one is how a genuinely new couple reads it as a welcome.
 *
 * Case-insensitive, because an address is.
 */
export function newAccountNotice(email: string): string {
  return email.toLowerCase().endsWith(APPLE_PRIVATE_RELAY)
    ? pl.auth.socialNewAccountHidden
    : pl.auth.socialNewAccount(email);
}
