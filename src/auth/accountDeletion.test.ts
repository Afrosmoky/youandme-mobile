import { Platform } from 'react-native';
import appleAuth from '@invertase/react-native-apple-authentication';
import { deleteAccount, fetchMe } from '../api/profile';
import { AppleSheetCancelledError, runAccountDeletion } from './accountDeletion';
import type { Couple, User } from '../domain/types';

jest.mock('../api/profile', () => ({
  fetchMe: jest.fn(),
  deleteAccount: jest.fn(),
}));

const user: User = {
  ulid: 'u_01',
  email: 'ola@example.com',
  nickname: 'ola_test',
  timezone: 'Europe/Warsaw',
  locale: 'pl',
  emailVerifiedAt: null,
  createdAt: '2026-06-04T05:00:00.000Z',
  appleLinked: false,
  googleLinked: false,
};

const couple: Couple = {
  ulid: 'c_01',
  partnerNameLocal: 'Tomek',
  streakCurrent: 0,
  streakLongest: 0,
  dailyPushHour: 20,
  relationshipStartedOn: null,
  createdAt: '2026-06-04T05:00:00.000Z',
};

const signedInAs = (overrides: Partial<User>) =>
  jest.mocked(fetchMe).mockResolvedValue({
    user: { ...user, ...overrides },
    couple,
  });

const originalOS = Platform.OS;
const onPlatform = (os: 'ios' | 'android') => {
  Object.defineProperty(Platform, 'OS', { value: os, configurable: true });
};

describe('runAccountDeletion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(deleteAccount).mockResolvedValue(undefined);
    onPlatform('ios');
  });

  afterAll(() => {
    Object.defineProperty(Platform, 'OS', { value: originalOS, configurable: true });
  });

  test('an email account is deleted without Apple and without a code', async () => {
    signedInAs({});

    await runAccountDeletion();

    expect(appleAuth.performRequest).not.toHaveBeenCalled();
    expect(deleteAccount).toHaveBeenCalledWith(undefined);
  });

  test('an Apple-linked account on iOS asks Apple for a fresh code and sends it', async () => {
    signedInAs({ appleLinked: true });

    await runAccountDeletion();

    expect(appleAuth.performRequest).toHaveBeenCalledWith({
      requestedOperation: appleAuth.Operation.LOGIN,
      requestedScopes: [],
    });
    expect(deleteAccount).toHaveBeenCalledWith('mock-apple-code');
  });

  // The operation has to be the real LOGIN value, read off the instance: the
  // declare-enum bug would send undefined here and the sheet would never open.
  test('the Apple request carries a defined LOGIN operation', async () => {
    signedInAs({ appleLinked: true });

    await runAccountDeletion();

    const [options] = jest.mocked(appleAuth.performRequest).mock.calls[0];
    expect(options?.requestedOperation).toBe(1);
  });

  test('closing the Apple sheet stops everything before the DELETE', async () => {
    signedInAs({ appleLinked: true });
    jest
      .mocked(appleAuth.performRequest)
      .mockRejectedValueOnce({ code: appleAuth.Error.CANCELED });

    await expect(runAccountDeletion()).rejects.toBeInstanceOf(
      AppleSheetCancelledError,
    );
    expect(deleteAccount).not.toHaveBeenCalled();
  });

  test('any other Apple failure is passed on, and nothing is deleted', async () => {
    signedInAs({ appleLinked: true });
    const failure = { code: appleAuth.Error.FAILED };
    jest.mocked(appleAuth.performRequest).mockRejectedValueOnce(failure);

    await expect(runAccountDeletion()).rejects.toBe(failure);
    expect(deleteAccount).not.toHaveBeenCalled();
  });

  test('Apple answering without a code is a failure, not a codeless DELETE', async () => {
    signedInAs({ appleLinked: true });
    jest.mocked(appleAuth.performRequest).mockResolvedValueOnce({
      authorizationCode: null,
    } as never);

    await expect(runAccountDeletion()).rejects.toThrow();
    expect(deleteAccount).not.toHaveBeenCalled();
  });

  test('an Apple-linked account signed in on Android is deleted without a code', async () => {
    onPlatform('android');
    signedInAs({ appleLinked: true });

    await runAccountDeletion();

    expect(appleAuth.performRequest).not.toHaveBeenCalled();
    expect(deleteAccount).toHaveBeenCalledWith(undefined);
  });

  // Deciding about Apple on a stale or missing user risks deleting an
  // Apple-linked account with nobody revoking its tokens.
  test('when /me fails, nothing is deleted', async () => {
    jest.mocked(fetchMe).mockRejectedValueOnce(new Error('offline'));

    await expect(runAccountDeletion()).rejects.toThrow('offline');
    expect(deleteAccount).not.toHaveBeenCalled();
  });

  test('reports whether the account was Google-linked, from the same /me', async () => {
    signedInAs({ googleLinked: true });

    await expect(runAccountDeletion()).resolves.toEqual({ googleLinked: true });
  });

  test('a failing DELETE is passed on', async () => {
    signedInAs({});
    const failure = { response: { status: 500 } };
    jest.mocked(deleteAccount).mockRejectedValueOnce(failure);

    await expect(runAccountDeletion()).rejects.toBe(failure);
  });
});
