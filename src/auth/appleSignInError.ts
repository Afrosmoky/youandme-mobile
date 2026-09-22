import appleAuth from '@invertase/react-native-apple-authentication';
import { pl } from '../i18n/pl';

// The library rejects with an object carrying `code`, one of appleAuth.Error.
// The codes are read off the instance on purpose: the AppleError enum in the
// typings is a `declare enum` with nothing behind it at runtime, so importing it
// type-checks and is undefined on the device. Narrow to that shape rather than
// casting: the token exchange with our own backend throws through the same
// catch, and it has no code at all.
function codeOf(err: unknown): string | null {
  if (typeof err === 'object' && err !== null && 'code' in err) {
    const { code } = err as { code: unknown };
    return typeof code === 'string' ? code : null;
  }
  return null;
}

/**
 * What to tell the couple when Sign in with Apple did not go through.
 *
 * The same split as the Google mapper and for the same reason: one sentence for
 * every outcome is how a configuration problem hides behind a cancelled tap for
 * a whole beta. Apple names its codes, so unlike DEVELOPER_ERROR on Android
 * nothing has to be matched by a bare number.
 *
 * Pure and outside the screen, so it can be tested without the native module.
 */
export function describeAppleSignInError(err: unknown): string {
  switch (codeOf(err)) {
    case appleAuth.Error.CANCELED:
      return pl.auth.appleCancelled;
    // The request never reached Apple's sheet, or came back unusable. Both mean
    // the attempt did not happen rather than that it was refused, so the couple
    // is invited to try again rather than told something about their account.
    case appleAuth.Error.NOT_HANDLED:
    case appleAuth.Error.INVALID_RESPONSE:
      return pl.auth.appleSignInRetry;
    case appleAuth.Error.FAILED:
    case appleAuth.Error.UNKNOWN:
      return pl.auth.appleSignInError;
    default:
      // No Apple code: our own token exchange or the network failed.
      return pl.auth.appleSignInError;
  }
}
