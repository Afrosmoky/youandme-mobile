import {linking} from '../src/navigation/linking';

// The deep-link map. Both entries are the tail of a journey that starts as an
// https link in an email and passes through a page the backend serves: a
// jaity:// URL in a mail body is not reliably clickable, and the verification
// link could never have been one - only the server can check its signature.
//
// This pins OUR declaration, not React Navigation's parsing of it: the real
// resolver is ESM that this project's jest setup does not transform, and
// widening transformIgnorePatterns for 70 suites to reach it is a bad trade.
// What the resolver does with these paths is checked on a device instead, by
// opening the links from a cold and a warm start.
describe('deep link map', () => {
  test('claims the jaity scheme and nothing else', () => {
    expect(linking.prefixes).toEqual(['jaity://']);
  });

  test('routes the reset link at the reset screen', () => {
    expect(linking.config?.screens.ResetPassword).toBe('reset-password');
  });

  test('routes the verification link at the confirmation screen', () => {
    expect(linking.config?.screens.EmailVerified).toBe('email-verified');
  });

  // Both targets have to exist in whichever branch of the navigator is mounted,
  // and a screen missing from one branch is a link that silently does nothing
  // for everyone in it. That is what happened to ResetPassword until P11, so
  // the pairing is asserted rather than left to the reader.
  test('every mapped screen is registered in both stacks', () => {
    const navigator = require('fs').readFileSync(
      require('path').join(__dirname, '../src/navigation/RootNavigator.tsx'),
      'utf8',
    ) as string;

    for (const screen of Object.keys(linking.config?.screens ?? {})) {
      const registrations = navigator.split(`name="${screen}"`).length - 1;
      expect(`${screen}: ${registrations}`).toBe(`${screen}: 2`);
    }
  });
});
