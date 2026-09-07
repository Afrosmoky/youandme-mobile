import { kv } from './kv';

// The other player's name, remembered between games on this device.
//
// The setup screen used to ask for it every single time, which is the one thing
// a couple does before every session and the one thing that never changes. The
// web version keeps it in the browser and fills it in; this is the same idea.
//
// Device-local rather than account data on purpose. The couple already has a
// server-side `partner_name_local` (edited in the profile), and the two are
// allowed to differ: the profile field is a deliberate statement about the
// relationship, this is "what was typed into the game last time". Setup prefers
// this one because it is the more recent explicit act, and the profile screen
// overwrites it when the couple edits the field there — otherwise editing the
// profile would look like it had done nothing.
//
// Exported because deviceLocal.ts has to list it among the keys that die with
// the account. That is not optional: a remembered name outliving a sign-out
// would offer the next person on this phone the previous partner's name, which
// in THIS product is the worst thing a text field can do.
export const PARTNER_NAME_KEY = 'jaity.partner-name';

/** The remembered name, or null when nothing has been stored yet. */
export function loadPartnerName(): Promise<string | null> {
  return kv.get(PARTNER_NAME_KEY);
}

/**
 * Remembers a name for the next game.
 *
 * A blank name clears the entry rather than storing an empty string, so
 * "nothing remembered" has one representation instead of two.
 */
export async function savePartnerName(name: string): Promise<void> {
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    await kv.remove(PARTNER_NAME_KEY);
    return;
  }
  await kv.set(PARTNER_NAME_KEY, trimmed);
}
