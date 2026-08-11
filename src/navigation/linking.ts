import { LinkingOptions } from '@react-navigation/native';
import { RootStackParamList } from './types';

// Custom-scheme deep linking. Its own module rather than a corner of
// RootNavigator: this is data describing which URL means which screen, and
// keeping it out of the navigator is what lets a test resolve a real link
// without mounting every screen in the app.
//
// Both entries are the tail of a journey that
// starts as an https link in an email and passes through a page the backend
// serves: a jaity:// link in a mail body is not reliably clickable, and the
// verification link could never have been one anyway - only the server can
// check its signature.
//
//   jaity://reset-password?token=&email=  → ResetPassword, query as params
//   jaity://email-verified                → EmailVerified
//
// Both target screens are registered in BOTH branches of the navigator below.
// React Navigation can only route to a screen that is mounted, so a screen that
// exists in one branch is a link that silently does nothing for anyone in the
// other - which is exactly what happened to ResetPassword until P11.
export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['jaity://'],
  config: {
    screens: {
      ResetPassword: 'reset-password',
      EmailVerified: 'email-verified',
    },
  },
};
