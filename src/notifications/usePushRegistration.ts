import { useEffect } from 'react';
import { registerForPush, subscribeToTokenRefresh } from './pushToken';

// Registers this device for pushes for as long as somebody is logged in.
//
// Mounted in RootNavigator rather than in BootstrapScreen, even though Bootstrap
// is where post-login decisions live: Bootstrap replaces itself and is gone
// seconds later, and the token-refresh subscription has to outlive it — FCM can
// rotate a token at any point in a session. RootNavigator is mounted exactly as
// long as the session is.
//
// The device token needs a Sanctum token to be registered against, which is why
// this is gated rather than run at module scope.
export function usePushRegistration(enabled: boolean) {
  useEffect(() => {
    if (!enabled) {
      return;
    }
    registerForPush();
    return subscribeToTokenRefresh();
  }, [enabled]);
}
