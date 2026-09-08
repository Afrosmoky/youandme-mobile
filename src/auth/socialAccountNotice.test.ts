import {newAccountNotice} from './socialAccountNotice';
import {pl} from '../i18n/pl';

describe('newAccountNotice', () => {
  test('an ordinary address is named, because that is what makes it useful', () => {
    expect(newAccountNotice('ola@wp.pl')).toBe(
      pl.auth.socialNewAccount('ola@wp.pl'),
    );
  });

  // The one address that must not be quoted back. It is a string of random
  // characters, so shown literally it reads as a bug — and it lands on exactly
  // the couple this message exists to turn back.
  test('a hidden Apple address names the cause instead of the address', () => {
    const message = newAccountNotice(
      'a1b2c3d4e5@privaterelay.appleid.com',
    );

    expect(message).toBe(pl.auth.socialNewAccountHidden);
    expect(message).not.toContain('a1b2c3d4e5');
    expect(message).not.toContain('privaterelay');
  });

  test('an address is an address, whatever its case', () => {
    expect(newAccountNotice('A1B2@PrivateRelay.AppleID.com')).toBe(
      pl.auth.socialNewAccountHidden,
    );
  });

  // A real address that merely mentions the domain in its local part is not a
  // relay address; only the domain itself decides.
  test('the domain decides, not a substring', () => {
    expect(newAccountNotice('privaterelay.appleid.com@wp.pl')).toBe(
      pl.auth.socialNewAccount('privaterelay.appleid.com@wp.pl'),
    );
  });

  test('the two sentences do not read the same', () => {
    expect(newAccountNotice('ola@wp.pl')).not.toBe(
      newAccountNotice('x@privaterelay.appleid.com'),
    );
  });
});
