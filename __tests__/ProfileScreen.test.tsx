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

type Props = NativeStackScreenProps<RootStackParamList, 'Profile'>;

const user: User = {
  ulid: 'u_01',
  email: 'ola@example.com',
  nickname: 'ola_test',
  timezone: 'Europe/Warsaw',
  locale: 'pl',
  emailVerifiedAt: null,
  createdAt: '2026-06-04T05:00:00.000Z',
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
      logout,
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
});
