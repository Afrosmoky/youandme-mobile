import { Platform } from 'react-native';
import appleAuth from '@invertase/react-native-apple-authentication';
import { deleteAccount, fetchMe } from '../api/profile';

// The couple closed Apple's sheet. Not a failure: nothing was deleted, and
// the screen says so and lets them try again.
export class AppleSheetCancelledError extends Error {
  constructor() {
    super('Apple sheet cancelled');
    this.name = 'AppleSheetCancelledError';
  }
}

export type AccountDeletionResult = {
  // Read from the same fresh /me as the Apple decision, so the Google revoke
  // afterwards does not depend on a user object that may be stale or missing.
  googleLinked: boolean;
};

function appleCodeOf(err: unknown): string | null {
  if (typeof err === 'object' && err !== null && 'code' in err) {
    const { code } = err as { code: unknown };
    return typeof code === 'string' ? code : null;
  }
  return null;
}

// A fresh one-time authorization code from Sign in with Apple. It lives about
// five minutes and can be exchanged once, which is why it is asked for here,
// right before the DELETE, and never earlier or cached. No scopes: only the
// code is needed, and the user's name and email are not.
async function freshAppleAuthorizationCode(): Promise<string> {
  let response;
  try {
    response = await appleAuth.performRequest({
      requestedOperation: appleAuth.Operation.LOGIN,
      requestedScopes: [],
    });
  } catch (err) {
    if (appleCodeOf(err) === appleAuth.Error.CANCELED) {
      throw new AppleSheetCancelledError();
    }
    throw err;
  }
  if (!response.authorizationCode) {
    throw new Error('Apple returned no authorization code');
  }
  return response.authorizationCode;
}

/**
 * Deletes the signed-in account.
 *
 * The linked providers come from a fresh GET /me rather than from the auth
 * context: after a cold start the cached user may be missing (Bootstrap's
 * refresh can fail) and an Apple-linked account deleted without its code is
 * one whose Apple tokens nobody revokes. If /me fails, nothing is deleted.
 *
 * An Apple-linked account signed in on Android is deleted without a code; the
 * backend handles that. Throws AppleSheetCancelledError when the sheet is
 * closed, before any DELETE is sent.
 */
export async function runAccountDeletion(): Promise<AccountDeletionResult> {
  const { user } = await fetchMe();
  const appleCode =
    user.appleLinked && Platform.OS === 'ios'
      ? await freshAppleAuthorizationCode()
      : undefined;
  await deleteAccount(appleCode);
  return { googleLinked: user.googleLinked };
}
