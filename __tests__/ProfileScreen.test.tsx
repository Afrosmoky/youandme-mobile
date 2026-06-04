import React from 'react';
import {Alert} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import {ProfileScreen} from '../src/screens/ProfileScreen';
import {
  fetchMe,
  fetchVerificationStatus,
  resendVerificationEmail,
  updateMe,
} from '../src/api/profile';
import {useAuth} from '../src/auth/AuthContext';
import type {RootStackParamList} from '../src/navigation/types';
import type {User} from '../src/domain/types';
import {pl} from '../src/i18n/pl';

jest.mock('../src/api/profile', () => ({
  fetchMe: jest.fn(),
  fetchVerificationStatus: jest.fn(),
  updateMe: jest.fn(),
  resendVerificationEmail: jest.fn(),
}));
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

function makeProps(): Props {
  return {
    navigation: {setOptions: jest.fn(), navigate: jest.fn(), goBack: jest.fn()},
    route: {key: 'Profile', name: 'Profile', params: undefined},
  } as unknown as Props;
}

const logout = jest.fn();
const setUser = jest.fn();

describe('ProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(fetchMe).mockResolvedValue(user);
    jest
      .mocked(fetchVerificationStatus)
      .mockResolvedValue({verified: false, daysSinceRegistration: 0});
    jest.mocked(useAuth).mockReturnValue({
      user,
      token: 'tok',
      loading: false,
      login: jest.fn(),
      register: jest.fn(),
      logout,
      refreshUser: jest.fn(),
      setUser,
    });
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  test('loads the profile and shows the unverified badge', async () => {
    render(<ProfileScreen {...makeProps()} />);

    expect(await screen.findByDisplayValue('ola_test')).toBeOnTheScreen();
    expect(screen.getByText(user.email)).toBeOnTheScreen();
    expect(screen.getByText(pl.profile.verifyBadge)).toBeOnTheScreen();
  });

  test('editing the nickname and saving calls updateMe', async () => {
    jest.mocked(updateMe).mockResolvedValue({...user, nickname: 'new_nick'});

    render(<ProfileScreen {...makeProps()} />);
    await screen.findByDisplayValue('ola_test');

    fireEvent.changeText(screen.getByTestId('profile-nickname'), 'new_nick');
    fireEvent.press(screen.getByTestId('profile-save'));

    await waitFor(() =>
      expect(updateMe).toHaveBeenCalledWith({nickname: 'new_nick'}),
    );
    expect(setUser).toHaveBeenCalled();
  });

  test('tapping resend verification calls the API', async () => {
    jest.mocked(resendVerificationEmail).mockResolvedValue(undefined);

    render(<ProfileScreen {...makeProps()} />);
    await screen.findByDisplayValue('ola_test');

    fireEvent.press(screen.getByTestId('profile-resend-verification'));

    await waitFor(() => expect(resendVerificationEmail).toHaveBeenCalled());
  });

  test('tapping logout calls logout from AuthContext', async () => {
    render(<ProfileScreen {...makeProps()} />);
    await screen.findByDisplayValue('ola_test');

    fireEvent.press(screen.getByTestId('profile-logout'));

    expect(logout).toHaveBeenCalled();
  });
});
