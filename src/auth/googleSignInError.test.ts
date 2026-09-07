import {
  isErrorWithCode,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import {describeGoogleSignInError} from './googleSignInError';
import {pl} from '../i18n/pl';

// The library is mocked app-wide in jest.setup.js; isErrorWithCode is told what
// to say per case, the same way parseApiError's tests drive axios.isAxiosError.
const withCode = (code: string) => {
  jest.mocked(isErrorWithCode).mockReturnValue(true);
  return {code, message: 'whatever'} as never;
};

describe('describeGoogleSignInError', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(isErrorWithCode).mockReturnValue(false);
  });

  test('a cancelled sign-in says it was cancelled', () => {
    expect(
      describeGoogleSignInError(withCode(statusCodes.SIGN_IN_CANCELLED)),
    ).toBe(pl.auth.googleCancelled);
  });

  test('missing Play Services says what to do about it', () => {
    expect(
      describeGoogleSignInError(
        withCode(statusCodes.PLAY_SERVICES_NOT_AVAILABLE),
      ),
    ).toBe(pl.auth.googlePlayServices);
  });

  // The one this whole change exists for. DEVELOPER_ERROR means the installed
  // build's signing certificate is not registered against any OAuth client, so
  // it is our problem, not the couple's — and it must not read like a cancelled
  // tap, which is exactly what it did through the beta.
  test('a build Google does not recognise says so, and carries the code', () => {
    const message = describeGoogleSignInError(withCode('10'));

    expect(message).toBe(pl.auth.googleConfigError('10'));
    expect(message).toContain('10');
    expect(message).not.toBe(pl.auth.googleCancelled);
    expect(message).not.toBe(pl.auth.googleSignInError);
  });

  test('anything else still carries its code', () => {
    expect(describeGoogleSignInError(withCode('7'))).toBe(
      pl.auth.googleSignInErrorCode('7'),
    );
  });

  // A failure from our own token exchange or the network arrives with no code
  // of the library's, so there is nothing to quote.
  test('a failure from outside the library falls back without a code', () => {
    expect(describeGoogleSignInError(new Error('Network Error'))).toBe(
      pl.auth.googleSignInError,
    );
  });

  // Every branch has to say something different, or the split buys nothing.
  test('no two outcomes read the same', () => {
    const messages = [
      describeGoogleSignInError(withCode(statusCodes.SIGN_IN_CANCELLED)),
      describeGoogleSignInError(
        withCode(statusCodes.PLAY_SERVICES_NOT_AVAILABLE),
      ),
      describeGoogleSignInError(withCode('10')),
      describeGoogleSignInError(withCode('7')),
    ];

    expect(new Set(messages).size).toBe(messages.length);
  });
});
