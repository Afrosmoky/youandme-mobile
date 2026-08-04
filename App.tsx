/**
 * Ja i Ty — mobile client (slice 1).
 *
 * @format
 */

import React, { useEffect } from 'react';
import { AppState, StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClientProvider, focusManager } from '@tanstack/react-query';
import mobileAds from 'react-native-google-mobile-ads';
import notifee, { EventType } from '@notifee/react-native';
import { getMessaging, onMessage } from '@react-native-firebase/messaging';
import { AuthProvider } from './src/auth/AuthContext';
import { RootNavigator, linking } from './src/navigation/RootNavigator';
import { navigationRef } from './src/navigation/navigationRef';
import {
  handlePushMessage,
  handlePushPress,
} from './src/notifications/pushHandler';
import { queryClient } from './src/queries/queryClient';
import { ThemeProvider } from './src/theme';

// RN has no window-focus event; drive TanStack's focus signal from AppState so
// focus-refetch queries (the daily card) refresh when returning from background.
focusManager.setEventListener(handleFocus => {
  const sub = AppState.addEventListener('change', state =>
    handleFocus(state === 'active'),
  );
  return () => sub.remove();
});

// AdMob has to be initialized once before any ad loads. Done at module scope
// rather than in an effect so it is not tied to a render, and fire-and-forget
// because nothing in P6 waits on the adapter statuses (no mediation).
mobileAds()
  .initialize()
  .catch(() => {
    // Ads simply stay unavailable; the rest of the app does not depend on them.
  });

function App() {
  // P9 push wiring, foreground half. The background half is registered in
  // index.js, because it has to exist before the app is even rendered.
  useEffect(() => {
    // A data message arriving while the couple is looking at the app: notifee
    // draws it here too, since FCM shows nothing by itself.
    const unsubscribeMessages = onMessage(getMessaging(), handlePushMessage);
    // A press while the app is open or merely backgrounded.
    const unsubscribeEvents = notifee.onForegroundEvent(({ type, detail }) => {
      if (type === EventType.PRESS) {
        handlePushPress(detail.notification?.data);
      }
    });
    // A press that STARTED the app: the event is long gone by the time any
    // listener exists, so notifee holds it until it is asked for.
    notifee.getInitialNotification().then(initial => {
      if (initial) {
        handlePushPress(initial.notification.data);
      }
    });
    return () => {
      unsubscribeMessages();
      unsubscribeEvents();
    };
  }, []);

  // P11a is dark-only; ThemeProvider owns scheme resolution (see its comment),
  // so the status bar is light-content to sit on the dark theme background.
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" />
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <NavigationContainer ref={navigationRef} linking={linking}>
              <RootNavigator />
            </NavigationContainer>
          </AuthProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

export default App;
