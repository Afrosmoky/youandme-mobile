import {AppleError} from '@invertase/react-native-apple-authentication';
import {describeAppleSignInError} from './appleSignInError';
import {pl} from '../i18n/pl';

const withCode = (code: string) => ({code, message: 'whatever'});

describe('describeAppleSignInError', () => {
  test('a cancelled sign-in says it was cancelled', () => {
    expect(describeAppleSignInError(withCode(AppleError.CANCELED))).toBe(
      pl.auth.appleCancelled,
    );
  });

  // The attempt never happened, as opposed to being refused — so the couple is
  // invited to try again rather than told anything about their account.
  test.each([AppleError.NOT_HANDLED, AppleError.INVALID_RESPONSE])(
    'code %s reads as an attempt that did not happen',
    code => {
      expect(describeAppleSignInError(withCode(code))).toBe(
        pl.auth.appleSignInRetry,
      );
    },
  );

  test.each([AppleError.FAILED, AppleError.UNKNOWN])(
    'code %s reads as a failure',
    code => {
      expect(describeAppleSignInError(withCode(code))).toBe(
        pl.auth.appleSignInError,
      );
    },
  );

  // Our own token exchange, or the network. No Apple code to quote.
  test('a failure from outside the library falls back', () => {
    expect(describeAppleSignInError(new Error('Network Error'))).toBe(
      pl.auth.appleSignInError,
    );
  });

  // The same property the Google mapper is held to: a split that does not
  // actually split says nothing.
  test('cancelling does not read like anything else', () => {
    const cancelled = describeAppleSignInError(
      withCode(AppleError.CANCELED),
    );

    expect(cancelled).not.toBe(describeAppleSignInError(withCode('1004')));
    expect(cancelled).not.toBe(describeAppleSignInError(withCode('1003')));
  });
});
