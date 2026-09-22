import React from 'react';
import {Alert, Share} from 'react-native';
import axios from 'axios';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {fireEvent, screen, waitFor} from '@testing-library/react-native';
import {renderWithQueryClient} from '../src/test/renderWithQueryClient';
import {ProfileScreen} from '../src/screens/ProfileScreen';
import {
  changePassword,
  fetchVerificationStatus,
  resendVerificationEmail,
  updateMe,
} from '../src/api/profile';
import * as StoreReview from 'react-native-store-review';
import {claimShareReward} from '../src/api/share';
import {claimRatingReward} from '../src/api/rating';
import {useAuth} from '../src/auth/AuthContext';
import {
  AppleSheetCancelledError,
  runAccountDeletion,
} from '../src/auth/accountDeletion';
import {revokeGoogleAccess} from '../src/auth/googleSignIn';
import type {RootStackParamList} from '../src/navigation/types';
import type {Couple, User} from '../src/domain/types';
import {pl} from '../src/i18n/pl';

jest.mock('../src/api/profile', () => ({
  fetchVerificationStatus: jest.fn(),
  updateMe: jest.fn(),
  resendVerificationEmail: jest.fn(),
  changePassword: jest.fn(),
}));
jest.mock('../src/api/share', () => ({claimShareReward: jest.fn()}));
jest.mock('../src/api/rating', () => ({claimRatingReward: jest.fn()}));
jest.mock('../src/auth/AuthContext', () => ({useAuth: jest.fn()}));
// The Apple/email decision and the DELETE itself are covered in
// accountDeletion.test.ts; here only what the screen and the hook do with the
// outcome. The error class stays real, the screen tells a cancel by it.
jest.mock('../src/auth/accountDeletion', () => ({
  ...jest.requireActual('../src/auth/accountDeletion'),
  runAccountDeletion: jest.fn(),
}));
jest.mock('../src/auth/googleSignIn', () => ({
  revokeGoogleAccess: jest.fn(() => Promise.resolve()),
}));

type Props = NativeStackScreenProps<RootStackParamList, 'Profile'>;

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

function makeProps(): Props {
  return {
    navigation: {setOptions: jest.fn(), navigate: jest.fn(), goBack: jest.fn()},
    route: {key: 'Profile', name: 'Profile', params: undefined},
  } as unknown as Props;
}

const logout = jest.fn();
const signOutLocally = jest.fn();
const setUser = jest.fn();
const setCouple = jest.fn();

describe('ProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .mocked(fetchVerificationStatus)
      .mockResolvedValue({verified: false, daysSinceRegistration: 0});
    // clearAllMocks clears calls, not implementations, and several tests below
    // set isAxiosError to true. Reset it so a plain Error stays a plain Error.
    jest.mocked(axios.isAxiosError).mockReturnValue(false);
    jest.mocked(useAuth).mockReturnValue({
      user,
      couple,
      token: 'tok',
      loading: false,
      login: jest.fn(),
      register: jest.fn(),
      signInWithGoogle: jest.fn(),
      signInWithApple: jest.fn(),
      logout,
      signOutLocally,
      refreshUser: jest.fn(),
      setUser,
      setCouple,
    });
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  test('loads the profile and shows the unverified badge', async () => {
    renderWithQueryClient(<ProfileScreen {...makeProps()} />);

    expect(await screen.findByDisplayValue('ola_test')).toBeOnTheScreen();
    expect(screen.getByText(user.email)).toBeOnTheScreen();
    expect(screen.getByText(pl.profile.verifyBadge)).toBeOnTheScreen();
  });

  test('renders the partner name input seeded from the couple', async () => {
    renderWithQueryClient(<ProfileScreen {...makeProps()} />);

    expect(await screen.findByTestId('profile-partner-name')).toHaveDisplayValue(
      'Tomek',
    );
  });

  test('editing the nickname and saving calls updateMe and updates the context', async () => {
    jest
      .mocked(updateMe)
      .mockResolvedValue({user: {...user, nickname: 'new_nick'}, couple});

    renderWithQueryClient(<ProfileScreen {...makeProps()} />);
    await screen.findByDisplayValue('ola_test');

    fireEvent.changeText(screen.getByTestId('profile-nickname'), 'new_nick');
    fireEvent.press(screen.getByTestId('profile-save'));

    await waitFor(() =>
      expect(updateMe).toHaveBeenCalledWith({nickname: 'new_nick'}),
    );
    expect(setUser).toHaveBeenCalled();
    expect(setCouple).toHaveBeenCalled();
  });

  test('editing the partner name saves partner_name_local', async () => {
    jest.mocked(updateMe).mockResolvedValue({
      user,
      couple: {...couple, partnerNameLocal: 'Tomasz'},
    });

    renderWithQueryClient(<ProfileScreen {...makeProps()} />);
    await screen.findByDisplayValue('ola_test');

    fireEvent.changeText(screen.getByTestId('profile-partner-name'), 'Tomasz');
    fireEvent.press(screen.getByTestId('profile-save'));

    await waitFor(() =>
      expect(updateMe).toHaveBeenCalledWith({partner_name_local: 'Tomasz'}),
    );
    expect(setCouple).toHaveBeenCalled();
  });

  test('shows an inline error for partner_name_local on 422', async () => {
    jest.mocked(updateMe).mockRejectedValueOnce({
      response: {
        status: 422,
        data: {
          message: 'To imię jest za długie.',
          errors: {partner_name_local: ['To imię jest za długie.']},
        },
      },
    });
    jest.mocked(axios.isAxiosError).mockReturnValue(true);

    renderWithQueryClient(<ProfileScreen {...makeProps()} />);
    await screen.findByDisplayValue('ola_test');

    fireEvent.changeText(screen.getByTestId('profile-partner-name'), 'Tomasz');
    fireEvent.press(screen.getByTestId('profile-save'));

    expect(
      await screen.findByTestId('profile-partner-name-error'),
    ).toHaveTextContent('To imię jest za długie.');
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  test('shows the per-field backend error under the nickname on 422', async () => {
    jest.mocked(updateMe).mockRejectedValueOnce({
      response: {
        status: 422,
        data: {
          message: 'Ten nick jest już zajęty.',
          errors: {nickname: ['Ten nick jest już zajęty.']},
        },
      },
    });
    jest.mocked(axios.isAxiosError).mockReturnValue(true);

    renderWithQueryClient(<ProfileScreen {...makeProps()} />);
    await screen.findByDisplayValue('ola_test');

    fireEvent.changeText(screen.getByTestId('profile-nickname'), 'taken_nick');
    fireEvent.press(screen.getByTestId('profile-save'));

    expect(
      await screen.findByTestId('profile-nickname-error'),
    ).toHaveTextContent('Ten nick jest już zajęty.');
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  test('shows the server error on a 500', async () => {
    jest.mocked(updateMe).mockRejectedValueOnce({response: {status: 500}});
    jest.mocked(axios.isAxiosError).mockReturnValue(true);

    renderWithQueryClient(<ProfileScreen {...makeProps()} />);
    await screen.findByDisplayValue('ola_test');

    fireEvent.changeText(screen.getByTestId('profile-nickname'), 'taken_nick');
    fireEvent.press(screen.getByTestId('profile-save'));

    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith(
        pl.appTitle,
        pl.common.serverError,
      ),
    );
  });

  test('tapping resend verification calls the API', async () => {
    jest.mocked(resendVerificationEmail).mockResolvedValue(undefined);

    renderWithQueryClient(<ProfileScreen {...makeProps()} />);
    await screen.findByDisplayValue('ola_test');

    fireEvent.press(screen.getByTestId('profile-resend-verification'));

    await waitFor(() => expect(resendVerificationEmail).toHaveBeenCalled());
  });

  test('tapping logout calls logout from AuthContext', async () => {
    renderWithQueryClient(<ProfileScreen {...makeProps()} />);
    await screen.findByDisplayValue('ola_test');

    fireEvent.press(screen.getByTestId('profile-logout'));

    expect(logout).toHaveBeenCalled();
  });

  // Fills the change-password form with valid, matching values.
  const fillPasswordForm = () => {
    fireEvent.changeText(
      screen.getByTestId('profile-current-password'),
      'oldpass1',
    );
    fireEvent.changeText(
      screen.getByTestId('profile-new-password'),
      'newpass12',
    );
    fireEvent.changeText(
      screen.getByTestId('profile-confirm-password'),
      'newpass12',
    );
  };

  test('renders the change password section', async () => {
    renderWithQueryClient(<ProfileScreen {...makeProps()} />);
    await screen.findByDisplayValue('ola_test');

    expect(screen.getByTestId('profile-current-password')).toBeOnTheScreen();
    expect(screen.getByTestId('profile-new-password')).toBeOnTheScreen();
    expect(screen.getByTestId('profile-confirm-password')).toBeOnTheScreen();
    expect(
      screen.getByTestId('profile-change-password-submit'),
    ).toBeOnTheScreen();
  });

  test('disables submit when the new passwords do not match', async () => {
    renderWithQueryClient(<ProfileScreen {...makeProps()} />);
    await screen.findByDisplayValue('ola_test');

    fireEvent.changeText(
      screen.getByTestId('profile-current-password'),
      'oldpass1',
    );
    fireEvent.changeText(
      screen.getByTestId('profile-new-password'),
      'newpass12',
    );
    fireEvent.changeText(
      screen.getByTestId('profile-confirm-password'),
      'different9',
    );

    expect(
      screen.getByTestId('profile-change-password-submit'),
    ).toBeDisabled();
    expect(
      screen.getByText(pl.profile.passwordsDoNotMatch),
    ).toBeOnTheScreen();
  });

  test('changes the password and clears the form', async () => {
    jest.mocked(changePassword).mockResolvedValue(undefined);

    renderWithQueryClient(<ProfileScreen {...makeProps()} />);
    await screen.findByDisplayValue('ola_test');

    fillPasswordForm();
    fireEvent.press(screen.getByTestId('profile-change-password-submit'));

    await waitFor(() =>
      expect(changePassword).toHaveBeenCalledWith({
        currentPassword: 'oldpass1',
        newPassword: 'newpass12',
      }),
    );
    expect(Alert.alert).toHaveBeenCalledWith(
      pl.appTitle,
      pl.profile.passwordChanged,
    );
    await waitFor(() =>
      expect(screen.getByTestId('profile-current-password')).toHaveDisplayValue(
        '',
      ),
    );
  });

  test('shows an inline error for a wrong current password', async () => {
    jest.mocked(changePassword).mockRejectedValueOnce({
      response: {
        status: 422,
        data: {
          message: 'Obecne hasło jest nieprawidłowe.',
          errors: {current_password: ['Obecne hasło jest nieprawidłowe.']},
        },
      },
    });
    jest.mocked(axios.isAxiosError).mockReturnValue(true);

    renderWithQueryClient(<ProfileScreen {...makeProps()} />);
    await screen.findByDisplayValue('ola_test');

    fillPasswordForm();
    fireEvent.press(screen.getByTestId('profile-change-password-submit'));

    expect(
      await screen.findByTestId('profile-current-password-error'),
    ).toHaveTextContent('Obecne hasło jest nieprawidłowe.');
  });

  test('shows an inline error for a too short new password', async () => {
    jest.mocked(changePassword).mockRejectedValueOnce({
      response: {
        status: 422,
        data: {
          message: 'Nowe hasło jest za krótkie.',
          errors: {new_password: ['Nowe hasło jest za krótkie.']},
        },
      },
    });
    jest.mocked(axios.isAxiosError).mockReturnValue(true);

    renderWithQueryClient(<ProfileScreen {...makeProps()} />);
    await screen.findByDisplayValue('ola_test');

    fillPasswordForm();
    fireEvent.press(screen.getByTestId('profile-change-password-submit'));

    expect(
      await screen.findByTestId('profile-new-password-error'),
    ).toHaveTextContent('Nowe hasło jest za krótkie.');
  });

  test('shows a spinner on the submit button while changing', async () => {
    jest.mocked(changePassword).mockReturnValue(new Promise(() => {}));

    renderWithQueryClient(<ProfileScreen {...makeProps()} />);
    await screen.findByDisplayValue('ola_test');

    fillPasswordForm();
    fireEvent.press(screen.getByTestId('profile-change-password-submit'));

    await waitFor(() =>
      expect(
        screen.queryByText(pl.profile.changePasswordButton),
      ).toBeNull(),
    );
  });

  test('sharing opens the native sheet and claims the reward when shared', async () => {
    const shareSpy = jest
      .spyOn(Share, 'share')
      .mockResolvedValue({action: Share.sharedAction});
    jest.mocked(claimShareReward).mockResolvedValue({claimed: true});

    renderWithQueryClient(<ProfileScreen {...makeProps()} />);
    fireEvent.press(await screen.findByTestId('profile-share'));

    await waitFor(() =>
      expect(shareSpy).toHaveBeenCalledWith({
        message: `${pl.share.message} https://jaity.app`,
      }),
    );
    await waitFor(() => expect(claimShareReward).toHaveBeenCalled());
  });

  test('dismissing the share sheet does not claim the reward', async () => {
    jest
      .spyOn(Share, 'share')
      .mockResolvedValue({action: Share.dismissedAction});

    renderWithQueryClient(<ProfileScreen {...makeProps()} />);
    fireEvent.press(await screen.findByTestId('profile-share'));

    await waitFor(() => expect(Share.share).toHaveBeenCalled());
    expect(claimShareReward).not.toHaveBeenCalled();
  });

  test('rating asks for the native review prompt and claims the reward', async () => {
    jest.mocked(claimRatingReward).mockResolvedValue({claimed: true});

    renderWithQueryClient(<ProfileScreen {...makeProps()} />);
    fireEvent.press(await screen.findByTestId('profile-rate'));

    await waitFor(() => expect(StoreReview.requestReview).toHaveBeenCalled());
    await waitFor(() => expect(claimRatingReward).toHaveBeenCalled());
    expect(Alert.alert).toHaveBeenCalledWith(
      pl.appTitle,
      pl.rating.thanksToast,
    );
  });

  // The reward is for the gesture of asking: In-App Review reports nothing
  // back, so a failing prompt must not withhold the claim.
  test('claims the reward even when the native prompt throws', async () => {
    jest.mocked(StoreReview.requestReview).mockImplementationOnce(() => {
      throw new Error('StoreReview native module not available');
    });
    jest.mocked(claimRatingReward).mockResolvedValue({claimed: true});

    renderWithQueryClient(<ProfileScreen {...makeProps()} />);
    fireEvent.press(await screen.findByTestId('profile-rate'));

    await waitFor(() => expect(claimRatingReward).toHaveBeenCalled());
  });

  test('a failing claim stays silent', async () => {
    jest
      .mocked(claimRatingReward)
      .mockRejectedValueOnce(new Error('network'));

    renderWithQueryClient(<ProfileScreen {...makeProps()} />);
    fireEvent.press(await screen.findByTestId('profile-rate'));

    await waitFor(() => expect(claimRatingReward).toHaveBeenCalled());
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  // The rewarded ad moved to RewardsScreen in P7: the action and the credit it
  // produces now sit on the same screen. Share and rating stay here.
  test('no longer offers the rewarded ad', async () => {
    renderWithQueryClient(<ProfileScreen {...makeProps()} />);
    await screen.findByDisplayValue('ola_test');

    expect(screen.queryByTestId('profile-watch-ad')).toBeNull();
    expect(screen.getByTestId('profile-share')).toBeOnTheScreen();
    expect(screen.getByTestId('profile-rate')).toBeOnTheScreen();
  });

  // P11. The alert this replaces was the last one of its kind. Scoped to the
  // slot the failed query actually feeds: the profile itself comes from the
  // auth context, so only the verification status is missing.
  describe('when the verification status cannot be loaded', () => {
    test('shows the error state in place of the verification slot', async () => {
      jest
        .mocked(fetchVerificationStatus)
        .mockRejectedValue(new Error('network'));

      renderWithQueryClient(<ProfileScreen {...makeProps()} />);

      expect(
        await screen.findByTestId('profile-verification-error'),
      ).toBeOnTheScreen();
      expect(screen.getByText(pl.profile.loadError)).toBeOnTheScreen();
    });

    test('leaves the rest of the profile usable, logout included', async () => {
      jest
        .mocked(fetchVerificationStatus)
        .mockRejectedValue(new Error('network'));

      renderWithQueryClient(<ProfileScreen {...makeProps()} />);
      await screen.findByTestId('profile-verification-error');

      // Why this one is scoped rather than a whole-screen takeover: that would
      // remove the way out on exactly the flaky connection that caused it.
      expect(screen.getByDisplayValue('ola_test')).toBeOnTheScreen();
      fireEvent.press(screen.getByTestId('profile-logout'));
      expect(logout).toHaveBeenCalled();
    });

    test('a lost connection says so instead of blaming the profile', async () => {
      const offline = {isAxiosError: true, response: undefined};
      jest
        .mocked(axios.isAxiosError)
        .mockImplementation(err => err === offline);
      jest.mocked(fetchVerificationStatus).mockRejectedValue(offline);

      renderWithQueryClient(<ProfileScreen {...makeProps()} />);

      expect(await screen.findByText(pl.common.networkError)).toBeOnTheScreen();
      expect(screen.queryByText(pl.profile.loadError)).toBeNull();
    });

    test('retry re-reads the status and clears the slot', async () => {
      jest
        .mocked(fetchVerificationStatus)
        .mockRejectedValueOnce(new Error('network'));

      renderWithQueryClient(<ProfileScreen {...makeProps()} />);
      await screen.findByTestId('profile-verification-error');

      jest
        .mocked(fetchVerificationStatus)
        .mockResolvedValue({verified: true, daysSinceRegistration: 3});
      fireEvent.press(screen.getByTestId('profile-verification-error-retry'));

      await waitFor(() =>
        expect(fetchVerificationStatus).toHaveBeenCalledTimes(2),
      );
      await waitFor(() =>
        expect(screen.queryByTestId('profile-verification-error')).toBeNull(),
      );
    });
  });

  describe('deleting the account', () => {
    type AlertButton = {text?: string; style?: string; onPress?: () => void};

    // Presses a button of the most recent Alert by its label.
    const pressAlertButton = (label: string) => {
      const calls = jest.mocked(Alert.alert).mock.calls;
      const buttons = (calls[calls.length - 1][2] ?? []) as AlertButton[];
      const button = buttons.find(b => b.text === label);
      if (!button) {
        throw new Error(`no "${label}" button on the last alert`);
      }
      button.onPress?.();
    };

    const openAndConfirm = async () => {
      renderWithQueryClient(<ProfileScreen {...makeProps()} />);
      fireEvent.press(await screen.findByTestId('profile-delete-account'));
      pressAlertButton(pl.profile.deleteAccountConfirm);
    };

    // Apple requires deletion to be easy to find: on the profile, no digging.
    test('the button is on the profile, under "Wyloguj"', async () => {
      renderWithQueryClient(<ProfileScreen {...makeProps()} />);

      expect(
        await screen.findByTestId('profile-delete-account'),
      ).toHaveTextContent(pl.profile.deleteAccount);
      expect(screen.getByTestId('profile-logout')).toBeOnTheScreen();
    });

    test('asks first, naming what goes, with a destructive confirm', async () => {
      renderWithQueryClient(<ProfileScreen {...makeProps()} />);

      fireEvent.press(await screen.findByTestId('profile-delete-account'));

      expect(Alert.alert).toHaveBeenCalledWith(
        pl.profile.deleteAccountTitle,
        pl.profile.deleteAccountMessage,
        [
          expect.objectContaining({
            text: pl.profile.deleteAccountCancel,
            style: 'cancel',
          }),
          expect.objectContaining({
            text: pl.profile.deleteAccountConfirm,
            style: 'destructive',
          }),
        ],
      );
      expect(runAccountDeletion).not.toHaveBeenCalled();
    });

    test('cancelling the confirmation deletes nothing', async () => {
      renderWithQueryClient(<ProfileScreen {...makeProps()} />);
      fireEvent.press(await screen.findByTestId('profile-delete-account'));

      pressAlertButton(pl.profile.deleteAccountCancel);

      expect(runAccountDeletion).not.toHaveBeenCalled();
      expect(signOutLocally).not.toHaveBeenCalled();
    });

    test('on success: the local session ends and the couple is told', async () => {
      jest.mocked(runAccountDeletion).mockResolvedValue({googleLinked: false});

      await openAndConfirm();

      await waitFor(() => expect(signOutLocally).toHaveBeenCalledTimes(1));
      expect(logout).not.toHaveBeenCalled(); // no POST /auth/logout
      expect(Alert.alert).toHaveBeenCalledWith(
        pl.appTitle,
        pl.profile.accountDeleted,
      );
      expect(revokeGoogleAccess).not.toHaveBeenCalled();
    });

    test('a Google-linked account has its Google access revoked first', async () => {
      jest.mocked(runAccountDeletion).mockResolvedValue({googleLinked: true});

      await openAndConfirm();

      await waitFor(() => expect(signOutLocally).toHaveBeenCalled());
      expect(revokeGoogleAccess).toHaveBeenCalledTimes(1);
    });

    test('closing the Apple sheet: nothing changes, and it says so', async () => {
      jest
        .mocked(runAccountDeletion)
        .mockRejectedValue(new AppleSheetCancelledError());

      await openAndConfirm();

      await waitFor(() =>
        expect(Alert.alert).toHaveBeenCalledWith(
          pl.appTitle,
          pl.profile.deleteAccountAppleCancelled,
        ),
      );
      expect(signOutLocally).not.toHaveBeenCalled();
    });

    test('a network error keeps the couple signed in', async () => {
      jest.mocked(runAccountDeletion).mockRejectedValue({message: 'Network'});
      jest.mocked(axios.isAxiosError).mockReturnValue(true);

      await openAndConfirm();

      await waitFor(() =>
        expect(Alert.alert).toHaveBeenCalledWith(
          pl.appTitle,
          pl.profile.deleteAccountError,
        ),
      );
      expect(signOutLocally).not.toHaveBeenCalled();
      expect(revokeGoogleAccess).not.toHaveBeenCalled();
    });

    test('a 5xx keeps the couple signed in', async () => {
      jest
        .mocked(runAccountDeletion)
        .mockRejectedValue({response: {status: 503}});
      jest.mocked(axios.isAxiosError).mockReturnValue(true);

      await openAndConfirm();

      await waitFor(() =>
        expect(Alert.alert).toHaveBeenCalledWith(
          pl.appTitle,
          pl.profile.deleteAccountError,
        ),
      );
      expect(signOutLocally).not.toHaveBeenCalled();
    });

    // Unreachable today, but the contract has it: the server's reason, and no
    // sign-out.
    test('a 409 shows the server message and keeps the couple signed in', async () => {
      jest.mocked(runAccountDeletion).mockRejectedValue({
        response: {
          status: 409,
          data: {message: 'Tego konta nie można usunąć samodzielnie.'},
        },
      });
      jest.mocked(axios.isAxiosError).mockReturnValue(true);

      await openAndConfirm();

      await waitFor(() =>
        expect(Alert.alert).toHaveBeenCalledWith(
          pl.appTitle,
          'Tego konta nie można usunąć samodzielnie.',
        ),
      );
      expect(signOutLocally).not.toHaveBeenCalled();
    });

    test('a 429 says to wait', async () => {
      jest
        .mocked(runAccountDeletion)
        .mockRejectedValue({response: {status: 429}});
      jest.mocked(axios.isAxiosError).mockReturnValue(true);

      await openAndConfirm();

      await waitFor(() =>
        expect(Alert.alert).toHaveBeenCalledWith(
          pl.appTitle,
          pl.auth.tooManyAttempts,
        ),
      );
      expect(signOutLocally).not.toHaveBeenCalled();
    });

    // The token is dead, so "stay signed in" would only make every screen fail.
    test('a 401 ends the session without claiming a deletion', async () => {
      jest
        .mocked(runAccountDeletion)
        .mockRejectedValue({response: {status: 401}});
      jest.mocked(axios.isAxiosError).mockReturnValue(true);

      await openAndConfirm();

      await waitFor(() => expect(signOutLocally).toHaveBeenCalledTimes(1));
      expect(Alert.alert).toHaveBeenCalledWith(
        pl.appTitle,
        pl.profile.deleteAccountSessionExpired,
      );
      expect(Alert.alert).not.toHaveBeenCalledWith(
        pl.appTitle,
        pl.profile.accountDeleted,
      );
    });
  });
});
