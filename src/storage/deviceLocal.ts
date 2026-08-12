import { kv } from './kv';
import { LOCAL_GAME_STATE_KEY } from './localGameState';

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
// keys of their own, so today the list has one entry — the list exists so a key
// added later has an obvious place to be added, instead of quietly surviving
// sign-out.
const GAME_DATA_KEYS = [LOCAL_GAME_STATE_KEY];

// Who the device was last signed in as. Not a secret — the token stays in the
// keychain (src/auth/storage.ts) — just a ulid, enough for the login barrier to
// tell "the same person coming back" from "somebody else".
export const LAST_ACCOUNT_KEY = 'jaity.last-account';

/**
 * Drops everything the local game keeps on this device.
 *
 * Called on sign-out. Safe to call when there is nothing stored.
 */
export async function clearDeviceLocalGameData(): Promise<void> {
  await Promise.all(GAME_DATA_KEYS.map(key => kv.remove(key)));
}

/**
 * Records the account now signed in, clearing device-local game data first when
 * the device was last used by anyone else.
 *
 * The second barrier behind sign-out, for the paths where sign-out never got to
 * run: the app killed mid-logout, storage failing on the way out, a session
 * ended somewhere other than this phone. Sign-out stays the first barrier —
 * this one only has to catch what it missed.
 *
 * Keyed on the ulid rather than clearing on every sign-in on purpose: the same
 * account signing back in (an expired session, a reinstall over kept data) gets
 * its paused game back, which is the whole reason the state is persisted.
 *
 * Nothing recorded counts as somebody else. A device that upgrades into this
 * build carries no record of an owner, and the game sitting on it may well be
 * the leaked one this module is here to remove; the cost of being wrong is one
 * resumable game lost once, and only for a device that was signed out with a
 * game left behind.
 */
export async function bindDeviceToAccount(userUlid: string): Promise<void> {
  const previous = await kv.get(LAST_ACCOUNT_KEY);
  if (previous !== userUlid) {
    await clearDeviceLocalGameData();
  }
  await kv.set(LAST_ACCOUNT_KEY, userUlid);
}
