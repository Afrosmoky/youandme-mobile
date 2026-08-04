import { Platform } from 'react-native';
import {
  AuthorizationStatus,
  getMessaging,
  getToken,
  onTokenRefresh,
  requestPermission,
} from '@react-native-firebase/messaging';
import { registerDeviceToken } from '../api/devices';

// Owner of the FCM registration token, the way notifee.ts owns notifee: every
// call into the messaging SDK for the token lives here, so screens never touch
// it and one jest mock covers the lot.
//
// Nothing in here throws. On iOS getToken needs an APNs token, which needs an
// Apple account and a push certificate we do not have until T11 — so the whole
// flow is expected to fail there, and it has to fail quietly. The rest of the
// app must not care whether pushes work.

function currentPlatform(): 'android' | 'ios' {
  return Platform.OS === 'ios' ? 'ios' : 'android';
}

// Asks for permission, reads the token and tells the backend where to find this
// device. Safe to call again — the endpoint upserts on the token.
export async function registerForPush(): Promise<void> {
  try {
    const messaging = getMessaging();
    const status = await requestPermission(messaging);
    // PROVISIONAL counts: a quiet notification is still a delivered one, and
    // refusing to register would make the setting impossible to undo later.
    if (
      status !== AuthorizationStatus.AUTHORIZED &&
      status !== AuthorizationStatus.PROVISIONAL
    ) {
      return;
    }
    const token = await getToken(messaging);
    if (!token) {
      return;
    }
    await registerDeviceToken(token, currentPlatform());
  } catch {
    // No APNs (iOS before T11), no Play Services, no network — the couple keeps
    // playing, they just do not get pushes.
  }
}

// FCM rotates tokens on its own schedule (reinstall, restore, cache clear). A
// stale token is a push that silently goes nowhere, so re-register on every
// rotation. Returns the unsubscribe.
export function subscribeToTokenRefresh(): () => void {
  try {
    return onTokenRefresh(getMessaging(), token => {
      registerDeviceToken(token, currentPlatform()).catch(() => {
        // Same as above: best-effort.
      });
    });
  } catch {
    return () => {};
  }
}
