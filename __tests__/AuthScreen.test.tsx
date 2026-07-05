import React from 'react';
import {Alert} from 'react-native';
import axios from 'axios';
import {fireEvent, screen, waitFor} from '@testing-library/react-native';
import {renderWithQueryClient} from '../src/test/renderWithQueryClient';
import {AuthScreen} from '../src/screens/AuthScreen';
import {useAuth} from '../src/auth/AuthContext';
import {pl} from '../src/i18n/pl';

jest.mock('../src/auth/AuthContext', () => ({useAuth: jest.fn()}));

describe('AuthScreen', () => {
  const login = jest.fn();
  const register = jest.fn();
  const signInWithGoogle = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    login.mockResolvedValue(undefined);
    register.mockResolvedValue(undefined);
    signInWithGoogle.mockResolvedValue(undefined);
    jest.mocked(useAuth).mockReturnValue({
      user: null,
      couple: null,
      token: null,
      loading: false,
      login,
      register,
      signInWithGoogle,
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

  test('Google sign-in exchanges the idToken via AuthContext', async () => {
    renderWithQueryClient(<AuthScreen />);

    fireEvent.press(screen.getByTestId('auth-google'));

    // The mocked GoogleSignin.signIn returns a fake idToken; on success the
    // token gate (not manual navigation) swaps to the authenticated stack.
    await waitFor(() =>
      expect(signInWithGoogle).toHaveBeenCalledWith('mock-id-token'),
    );
    expect(login).not.toHaveBeenCalled();
  });
});
