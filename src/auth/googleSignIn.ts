import { GoogleSignin } from '@react-native-google-signin/google-signin';

// OAuth client IDs. webClientId is the backend's audience; iosClientId is
// CLIENT_ID from GoogleService-Info.plist and has to follow the Bundle ID
// (see CLAUDE.md, the four things that change with it).
export const GOOGLE_WEB_CLIENT_ID =
  '1050573934208-6s4a631jirskdjgpmlt5pbmu4sa9fnn5.apps.googleusercontent.com';
export const GOOGLE_IOS_CLIENT_ID =
  '1050573934208-9bkc5dv1jedoin87p8l5k281e343i2o1.apps.googleusercontent.com';

let configured = false;

/**
 * Configures the Google Sign-In SDK once per process.
 *
 * It used to be configured in AuthScreen's effect, which is fine for signing
 * in and wrong for anything else: after a cold start with a stored token that
 * screen never mounts, so a revokeAccess from the profile would throw "not
 * configured" and be swallowed as a best-effort failure. Everything that
 * touches GoogleSignin calls this first.
 */
export function ensureGoogleConfigured(): void {
  if (configured) {
    return;
  }
  GoogleSignin.configure({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID,
    offlineAccess: false,
  });
  configured = true;
}

/**
 * Revokes the app's Google access and signs the SDK out, after the account
 * has been deleted. Best-effort by contract: the account is already gone, and
 * the SDK may not remember a signed-in user at all (e.g. after a reinstall),
 * in which case there is nothing to revoke. Never throws.
 */
export async function revokeGoogleAccess(): Promise<void> {
  try {
    ensureGoogleConfigured();
    await GoogleSignin.revokeAccess();
  } catch {
    // Nothing to revoke, or Google unreachable — the deletion stands.
  }
  try {
    await GoogleSignin.signOut();
  } catch {
    // Same.
  }
}
