import { kv } from './kv';
import { LOCAL_GAME_STATE_KEY } from './localGameState';
import { PARTNER_NAME_KEY } from './partnerName';

// Device-local data that belongs to whoever is signed in.
//
// The local game (P10) is played on one phone and stored on it: player two's
// name, both typed answers, what the session still owes the server. None of it
// is scoped to an account, so left alone it outlives the account that created
// it — sign out, sign in as somebody else, and the setup screen offers that
// stranger a resume card reading "gra z Wiktorią". That is a leak of one
// account's data to another on a shared device before it is a confusing resume,
// which is why the clearing lives here rather than in the game screens.
//
// Every device-local key the game writes belongs in this list. The drafted
// answers and the pending report are fields inside the stored state rather than
// keys of their own, so the list is shorter than the data it covers — it exists
// so a key added later has an obvious place to be added, instead of quietly
// surviving sign-out.
const GAME_DATA_KEYS = [LOCAL_GAME_STATE_KEY, PARTNER_NAME_KEY];

// Who the device was last signed in as. Not a secret — the token stays in the
// keychain (src/auth/storage.ts) — just a ulid, enough for the login barrier to
// tell "the same person coming back" from "somebody else".
export const LAST_ACCOUNT_KEY = 'jaity.last-account';

// And which couple that account was in. A second barrier, for the case the first
// one cannot see: the same person signing back into the same account, but paired
// with somebody else since. The account ulid is unchanged, so LAST_ACCOUNT_KEY
// alone would hand the new relationship the previous partner's name on the
// screen where a game starts. Rare, and the worst possible thing to get wrong in
// this particular product.
export const LAST_COUPLE_KEY = 'jaity.last-couple';

/**
 * Drops everything the local game keeps on this device.
 *
 * Called on sign-out. Safe to call when there is nothing stored.
 */
export async function clearDeviceLocalGameData(): Promise<void> {
  await Promise.all(GAME_DATA_KEYS.map(key => kv.remove(key)));
}

/**
 * Records the account and couple now signed in, clearing device-local game data
 * first when the device was last used by anyone else — a different account, or
 * the same account in a different couple.
 *
 * The second barrier behind sign-out, for the paths where sign-out never got to
 * run: the app killed mid-logout, storage failing on the way out, a session
 * ended somewhere other than this phone. Sign-out stays the first barrier —
 * this one only has to catch what it missed.
 *
 * Keyed on the ulids rather than clearing on every sign-in on purpose: the same
 * account signing back in (an expired session, a reinstall over kept data) gets
 * its paused game back, which is the whole reason the state is persisted.
 *
 * Nothing recorded counts as somebody else. A device that upgrades into this
 * build carries no record of an owner, and the game sitting on it may well be
 * the leaked one this module is here to remove; the cost of being wrong is one
 * resumable game lost once, and only for a device that was signed out with a
 * game left behind. A device upgrading from the build before the couple barrier
 * has an account on record but no couple, and pays that cost once for the same
 * reason.
 *
 * Only ever called where both ulids are known — the auth response carries a
 * couple for every account — so "no couple" never has to mean "we cannot tell".
 */
export async function bindDeviceToAccount(
  userUlid: string,
  coupleUlid: string,
): Promise<void> {
  const [previousUser, previousCouple] = await Promise.all([
    kv.get(LAST_ACCOUNT_KEY),
    kv.get(LAST_COUPLE_KEY),
  ]);
  if (previousUser !== userUlid || previousCouple !== coupleUlid) {
    await clearDeviceLocalGameData();
  }
  await Promise.all([
    kv.set(LAST_ACCOUNT_KEY, userUlid),
    kv.set(LAST_COUPLE_KEY, coupleUlid),
  ]);
}
