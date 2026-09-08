import React from 'react';
import {Alert, Platform} from 'react-native';
import axios from 'axios';
import {fireEvent, screen, waitFor} from '@testing-library/react-native';
import {renderWithQueryClient} from '../src/test/renderWithQueryClient';
import {AuthScreen} from '../src/screens/AuthScreen';
import {useAuth} from '../src/auth/AuthContext';
import {pl} from '../src/i18n/pl';

jest.mock('../src/auth/AuthContext', () => ({useAuth: jest.fn()}));

// Social sign-in is behind a build-time constant, so the tests need it both
// ways: hidden for the beta (off) and back in place (on). Same getter trick as
// RewardsScreen — babel reads the named import at each use site, so the binding
// stays live.
let mockSocialLoginEnabled = false;
jest.mock('../src/config/features', () => ({
  get SOCIAL_LOGIN_ENABLED() {
    return mockSocialLoginEnabled;
  },
}));

describe('AuthScreen', () => {
  const login = jest.fn();
  const register = jest.fn();
  const signInWithGoogle = jest.fn();
  const signInWithApple = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockSocialLoginEnabled = false;
    login.mockResolvedValue(undefined);
    register.mockResolvedValue(undefined);
    // The context now answers with the outcome of the sign-in, not void.
    signInWithGoogle.mockResolvedValue({isNewAccount: false, email: 'ola@wp.pl'});
    signInWithApple.mockResolvedValue({isNewAccount: false, email: 'ola@wp.pl'});
    jest.mocked(useAuth).mockReturnValue({
      user: null,
      couple: null,
      token: null,
      loading: false,
      login,
      register,
      signInWithGoogle,
      signInWithApple,
      logout: jest.fn(),
      refreshUser: jest.fn(),
      setUser: jest.fn(),
      setCouple: jest.fn(),
    });
    jest.mocked(axios.isAxiosError).mockReturnValue(false);
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  test('submits entered credentials in login mode', async () => {
    renderWithQueryClient(<AuthScreen />);

    fireEvent.changeText(
      screen.getByPlaceholderText(pl.auth.email),
      'ola@example.com',
    );
    fireEvent.changeText(
      screen.getByPlaceholderText(pl.auth.password),
      'tajne-haslo-123',
    );
    // Title and submit label share the text "Zaloguj się"; target the button
    // by testID to avoid the ambiguous getByText match.
    fireEvent.press(screen.getByTestId('auth-submit'));

    await waitFor(() =>
      expect(login).toHaveBeenCalledWith({
        email: 'ola@example.com',
        password: 'tajne-haslo-123',
      }),
    );
    expect(register).not.toHaveBeenCalled();
  });

  test('renders the password field with a show/hide toggle', () => {
    renderWithQueryClient(<AuthScreen />);

    expect(screen.getByTestId('auth-password-toggle')).toBeOnTheScreen();
  });

  test('toggling to register reveals the nickname field', () => {
    renderWithQueryClient(<AuthScreen />);

    expect(screen.queryByPlaceholderText(pl.auth.nickname)).not.toBeOnTheScreen();

    fireEvent.press(screen.getByText(pl.auth.switchToRegister));

    expect(screen.getByPlaceholderText(pl.auth.nickname)).toBeOnTheScreen();
  });

  test('submits entered credentials including nickname in register mode', async () => {
    renderWithQueryClient(<AuthScreen />);

    fireEvent.press(screen.getByText(pl.auth.switchToRegister));

    fireEvent.changeText(
      screen.getByPlaceholderText(pl.auth.email),
      'nowa@example.com',
    );
    fireEvent.changeText(
      screen.getByPlaceholderText(pl.auth.password),
      'tajne-haslo-123',
    );
    fireEvent.changeText(
      screen.getByPlaceholderText(pl.auth.nickname),
      'ola_test',
    );
    fireEvent.press(screen.getByTestId('auth-submit'));

    await waitFor(() =>
      expect(register).toHaveBeenCalledWith({
        email: 'nowa@example.com',
        password: 'tajne-haslo-123',
        nickname: 'ola_test',
      }),
    );
    expect(login).not.toHaveBeenCalled();
  });

  test('login masks a 401 as generic invalid credentials', async () => {
    login.mockRejectedValueOnce({response: {status: 401}});
    jest.mocked(axios.isAxiosError).mockReturnValue(true);

    renderWithQueryClient(<AuthScreen />);

    fireEvent.changeText(
      screen.getByPlaceholderText(pl.auth.email),
      'zly@example.com',
    );
    fireEvent.changeText(
      screen.getByPlaceholderText(pl.auth.password),
      'zle-haslo',
    );
    fireEvent.press(screen.getByTestId('auth-submit'));

    expect(
      await screen.findByText(pl.auth.invalidCredentials),
    ).toBeOnTheScreen();
  });

  test('shows the per-field backend error under the nickname in register mode on 422', async () => {
    register.mockRejectedValueOnce({
      response: {
        status: 422,
        data: {
          message: 'Ten nick jest już zajęty.',
          errors: {nickname: ['Ten nick jest już zajęty.']},
        },
      },
    });
    jest.mocked(axios.isAxiosError).mockReturnValue(true);

    renderWithQueryClient(<AuthScreen />);
    fireEvent.press(screen.getByText(pl.auth.switchToRegister));

    fireEvent.changeText(
      screen.getByPlaceholderText(pl.auth.email),
      'nowa@example.com',
    );
    fireEvent.changeText(
      screen.getByPlaceholderText(pl.auth.password),
      'tajne-haslo-123',
    );
    fireEvent.changeText(
      screen.getByPlaceholderText(pl.auth.nickname),
      'zajety_nick',
    );
    fireEvent.press(screen.getByTestId('auth-submit'));

    expect(await screen.findByTestId('auth-nickname-error')).toHaveTextContent(
      'Ten nick jest już zajęty.',
    );
    // The login generic alert must not fire for a register validation error.
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  test('sends a valid referrer nickname in register mode', async () => {
    renderWithQueryClient(<AuthScreen />);
    fireEvent.press(screen.getByText(pl.auth.switchToRegister));

    fireEvent.changeText(
      screen.getByPlaceholderText(pl.auth.email),
      'nowa@example.com',
    );
    fireEvent.changeText(
      screen.getByPlaceholderText(pl.auth.password),
      'tajne-haslo-123',
    );
    fireEvent.changeText(
      screen.getByPlaceholderText(pl.auth.nickname),
      'ola_test',
    );
    fireEvent.changeText(
      screen.getByPlaceholderText(pl.auth.referrerPlaceholder),
      'tomek_99',
    );
    fireEvent.press(screen.getByTestId('auth-submit'));

    await waitFor(() =>
      expect(register).toHaveBeenCalledWith({
        email: 'nowa@example.com',
        password: 'tajne-haslo-123',
        nickname: 'ola_test',
        referrerNickname: 'tomek_99',
      }),
    );
  });

  test('an empty referrer shows no error and does not block submit', async () => {
    renderWithQueryClient(<AuthScreen />);
    fireEvent.press(screen.getByText(pl.auth.switchToRegister));

    fireEvent.changeText(
      screen.getByPlaceholderText(pl.auth.email),
      'nowa@example.com',
    );
    fireEvent.changeText(
      screen.getByPlaceholderText(pl.auth.password),
      'tajne-haslo-123',
    );
    fireEvent.changeText(
      screen.getByPlaceholderText(pl.auth.nickname),
      'ola_test',
    );
    fireEvent.press(screen.getByTestId('auth-submit'));

    expect(screen.queryByTestId('auth-referrer-error')).toBeNull();
    await waitFor(() => expect(register).toHaveBeenCalled());
  });

  test('a malformed referrer shows an inline error and blocks submit', async () => {
    renderWithQueryClient(<AuthScreen />);
    fireEvent.press(screen.getByText(pl.auth.switchToRegister));

    fireEvent.changeText(
      screen.getByPlaceholderText(pl.auth.nickname),
      'ola_test',
    );
    fireEvent.changeText(
      screen.getByPlaceholderText(pl.auth.referrerPlaceholder),
      'ab',
    );

    expect(screen.getByTestId('auth-referrer-error')).toHaveTextContent(
      pl.auth.nicknameInvalid,
    );
    fireEvent.press(screen.getByTestId('auth-submit'));
    expect(register).not.toHaveBeenCalled();
  });

  test('a self-referral is flagged inline before submit', async () => {
    renderWithQueryClient(<AuthScreen />);
    fireEvent.press(screen.getByText(pl.auth.switchToRegister));

    fireEvent.changeText(
      screen.getByPlaceholderText(pl.auth.nickname),
      'ola_test',
    );
    fireEvent.changeText(
      screen.getByPlaceholderText(pl.auth.referrerPlaceholder),
      'ola_test',
    );

    expect(screen.getByTestId('auth-referrer-error')).toHaveTextContent(
      pl.auth.referrerSelf,
    );
    fireEvent.press(screen.getByTestId('auth-submit'));
    expect(register).not.toHaveBeenCalled();
  });

  test('shows the backend referrer error under the field on 422', async () => {
    register.mockRejectedValueOnce({
      response: {
        status: 422,
        data: {
          message: 'Nie znaleziono osoby o tym nicku.',
          errors: {referrer_nickname: ['Nie znaleziono osoby o tym nicku.']},
        },
      },
    });
    jest.mocked(axios.isAxiosError).mockReturnValue(true);

    renderWithQueryClient(<AuthScreen />);
    fireEvent.press(screen.getByText(pl.auth.switchToRegister));

    fireEvent.changeText(
      screen.getByPlaceholderText(pl.auth.email),
      'nowa@example.com',
    );
    fireEvent.changeText(
      screen.getByPlaceholderText(pl.auth.password),
      'tajne-haslo-123',
    );
    fireEvent.changeText(
      screen.getByPlaceholderText(pl.auth.nickname),
      'ola_test',
    );
    fireEvent.changeText(
      screen.getByPlaceholderText(pl.auth.referrerPlaceholder),
      'ghost_user',
    );
    fireEvent.press(screen.getByTestId('auth-submit'));

    expect(await screen.findByTestId('auth-referrer-error')).toHaveTextContent(
      'Nie znaleziono osoby o tym nicku.',
    );
  });

  test('login shows the network error when the backend is offline', async () => {
    // No response = connection refused / timeout. Must NOT be masked as a
    // credentials problem, or the user blames their password.
    login.mockRejectedValueOnce({message: 'Network Error'});
    jest.mocked(axios.isAxiosError).mockReturnValue(true);

    renderWithQueryClient(<AuthScreen />);

    fireEvent.changeText(
      screen.getByPlaceholderText(pl.auth.email),
      'ola@example.com',
    );
    fireEvent.changeText(
      screen.getByPlaceholderText(pl.auth.password),
      'tajne-haslo-123',
    );
    fireEvent.press(screen.getByTestId('auth-submit'));

    expect(await screen.findByText(pl.common.networkError)).toBeOnTheScreen();
    expect(screen.queryByText(pl.auth.invalidCredentials)).toBeNull();
  });

  test('login shows the server error for a 500', async () => {
    login.mockRejectedValueOnce({response: {status: 500}});
    jest.mocked(axios.isAxiosError).mockReturnValue(true);

    renderWithQueryClient(<AuthScreen />);

    fireEvent.changeText(
      screen.getByPlaceholderText(pl.auth.email),
      'ola@example.com',
    );
    fireEvent.changeText(
      screen.getByPlaceholderText(pl.auth.password),
      'tajne-haslo-123',
    );
    fireEvent.press(screen.getByTestId('auth-submit'));

    expect(await screen.findByText(pl.common.serverError)).toBeOnTheScreen();
    expect(screen.queryByText(pl.auth.invalidCredentials)).toBeNull();
  });

  test('shows the server error message on a 500 in register mode', async () => {
    register.mockRejectedValueOnce({response: {status: 500}});
    jest.mocked(axios.isAxiosError).mockReturnValue(true);

    renderWithQueryClient(<AuthScreen />);
    fireEvent.press(screen.getByText(pl.auth.switchToRegister));

    fireEvent.changeText(
      screen.getByPlaceholderText(pl.auth.email),
      'nowa@example.com',
    );
    fireEvent.changeText(
      screen.getByPlaceholderText(pl.auth.password),
      'tajne-haslo-123',
    );
    fireEvent.changeText(
      screen.getByPlaceholderText(pl.auth.nickname),
      'ola_test',
    );
    fireEvent.press(screen.getByTestId('auth-submit'));

    expect(await screen.findByText(pl.common.serverError)).toBeOnTheScreen();
  });

  test('hides the Google button behind the flag and says it is coming', () => {
    renderWithQueryClient(<AuthScreen />);

    expect(screen.queryByTestId('auth-google')).toBeNull();
    expect(screen.getByTestId('auth-social-soon')).toHaveTextContent(
      pl.auth.socialSoon,
    );
  });

  test('shows the referral reward next to the referrer field', () => {
    renderWithQueryClient(<AuthScreen />);

    // Register-only: the field it explains does not exist in login mode.
    expect(screen.queryByTestId('auth-referrer-reward')).toBeNull();

    fireEvent.press(screen.getByText(pl.auth.switchToRegister));

    expect(screen.getByTestId('auth-referrer-reward')).toHaveTextContent(
      pl.auth.referrerReward,
    );
  });

  test('Google sign-in exchanges the idToken via AuthContext', async () => {
    mockSocialLoginEnabled = true;
    renderWithQueryClient(<AuthScreen />);

    expect(screen.queryByTestId('auth-social-soon')).toBeNull();
    fireEvent.press(screen.getByTestId('auth-google'));

    // The mocked GoogleSignin.signIn returns a fake idToken; on success the
    // token gate (not manual navigation) swaps to the authenticated stack.
    await waitFor(() =>
      expect(signInWithGoogle).toHaveBeenCalledWith('mock-id-token'),
    );
    expect(login).not.toHaveBeenCalled();
  });

  test('Apple sign-in exchanges its identityToken via AuthContext', async () => {
    mockSocialLoginEnabled = true;
    renderWithQueryClient(<AuthScreen />);

    fireEvent.press(screen.getByTestId('auth-apple'));

    await waitFor(() =>
      expect(signInWithApple).toHaveBeenCalledWith('mock-apple-token'),
    );
    expect(signInWithGoogle).not.toHaveBeenCalled();
  });

  // The address is the only thing linking a social sign-in to an existing
  // account, so the warning belongs under BOTH buttons — the trap is the same
  // for Apple's "Hide My Email" and for picking the other Google account.
  test('both buttons carry the same-address warning', () => {
    mockSocialLoginEnabled = true;
    renderWithQueryClient(<AuthScreen />);

    expect(screen.getByTestId('auth-google')).toBeOnTheScreen();
    expect(screen.getByTestId('auth-apple')).toBeOnTheScreen();
    expect(screen.getByTestId('auth-social-hint')).toHaveTextContent(
      pl.auth.socialSameAddress,
    );
  });

  // 201 from the backend. For a genuinely new couple this is ordinary
  // information; for one that signed in with the wrong address it is the only
  // moment they can be turned back, because a fresh account and a stranded one
  // are both empty and look identical from the inside.
  test('a newly created account is announced, with the address used', async () => {
    mockSocialLoginEnabled = true;
    signInWithGoogle.mockResolvedValue({
      isNewAccount: true,
      email: 'ola.relay@privaterelay.appleid.com',
    });
    renderWithQueryClient(<AuthScreen />);

    fireEvent.press(screen.getByTestId('auth-google'));

    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith(
        pl.appTitle,
        pl.auth.socialNewAccount('ola.relay@privaterelay.appleid.com'),
      ),
    );
  });

  // Signing into an account that already existed is the ordinary case and must
  // stay silent — the notice would otherwise fire on every single sign-in.
  test('signing into an existing account says nothing', async () => {
    mockSocialLoginEnabled = true;
    renderWithQueryClient(<AuthScreen />);

    fireEvent.press(screen.getByTestId('auth-google'));

    await waitFor(() => expect(signInWithGoogle).toHaveBeenCalled());
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  // The decision this button rests on: Apple's requirement is an App Store
  // requirement, so Play keeps Google alone. Showing it on Android would be a
  // button leading to a flow we deliberately did not build — the library's
  // Android path needs a Services ID and a return domain that do not exist.
  test('Apple is not offered on Android', () => {
    mockSocialLoginEnabled = true;
    const original = Platform.OS;
    Platform.OS = 'android';
    try {
      renderWithQueryClient(<AuthScreen />);

      expect(screen.getByTestId('auth-google')).toBeOnTheScreen();
      expect(screen.queryByTestId('auth-apple')).toBeNull();
      // The warning is about the address, not about Apple, so it stays.
      expect(screen.getByTestId('auth-social-hint')).toBeOnTheScreen();
    } finally {
      Platform.OS = original;
    }
  });
});
