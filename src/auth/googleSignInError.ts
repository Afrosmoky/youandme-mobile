import {
  isErrorWithCode,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { pl } from '../i18n/pl';

/**
 * Google Play Services' CommonStatusCodes.DEVELOPER_ERROR.
 *
 * The library does not put this one in `statusCodes`, so it has to be named
 * here. The value is not a guess: RNGoogleSigninModule.java rejects with
 * `String.valueOf(CommonStatusCodes.DEVELOPER_ERROR)` when it sees that status,
 * and that constant is 10.
 *
 * It means Google Play Services could not match the calling app against any
 * OAuth client in the project — the package name plus the SHA-1 of the
 * certificate the installed APK is actually signed with. It is therefore a
 * BUILD problem, never something the couple did, and it is the reason Google
 * sign-in can work in debug and fail from the store: Play App Signing signs the
 * store build with Google's key, not the upload key and not the debug key.
 */
const DEVELOPER_ERROR = '10';

/**
 * What to tell the couple when Google sign-in did not go through.
 *
 * Until now every outcome produced the same sentence, so "I cancelled it", "my
 * Play Services are ancient" and "this build was never registered" were
 * indistinguishable — which is exactly how a configuration bug survived a beta
 * without anyone being able to report it as one.
 *
 * Pure, and separate from the screen, so the mapping can be tested without the
 * native module: fabricate an error, assert the sentence.
 */
export function describeGoogleSignInError(err: unknown): string {
  if (!isErrorWithCode(err)) {
    // Not the sign-in library's error at all — the token exchange with our own
    // backend failed, or the network did. No code to show.
    return pl.auth.googleSignInError;
  }

  switch (err.code) {
    case statusCodes.SIGN_IN_CANCELLED:
      return pl.auth.googleCancelled;
    case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
      return pl.auth.googlePlayServices;
    case DEVELOPER_ERROR:
      return pl.auth.googleConfigError(DEVELOPER_ERROR);
    default:
      // Everything else carries its code, so the next report is a fact rather
      // than "it does not work".
      return pl.auth.googleSignInErrorCode(String(err.code));
  }
}
