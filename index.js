/**
 * @format
 */

import { AppRegistry } from 'react-native';
import notifee, { EventType } from '@notifee/react-native';
import {
  getMessaging,
  setBackgroundMessageHandler,
} from '@react-native-firebase/messaging';
import App from './App';
import { name as appName } from './app.json';
import {
  handlePushMessage,
  handlePushPress,
} from './src/notifications/pushHandler';

// P9 push wiring, background half. Both handlers are registered at module scope,
// outside the component tree, because the OS starts this file in a headless
// process with no App rendered when a message arrives or a notification is
// pressed while the app is away.
//
// Our pushes are data-only, so without this handler nothing would appear at all
// when the app is not in the foreground — which is the case the whole feature
// exists for.
setBackgroundMessageHandler(getMessaging(), handlePushMessage);

// notifee requires a background event handler to be registered (it warns
// otherwise), and it is also where a press lands when the app was backgrounded
// rather than killed. A press from a killed app arrives through
// getInitialNotification in App.tsx instead.
notifee.onBackgroundEvent(async ({ type, detail }) => {
  if (type === EventType.PRESS) {
    handlePushPress(detail.notification?.data);
  }
});

AppRegistry.registerComponent(appName, () => App);
