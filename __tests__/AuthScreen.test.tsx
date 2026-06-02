import React from 'react';
import {Alert} from 'react-native';
import axios from 'axios';
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import {AuthScreen} from '../src/screens/AuthScreen';
import {useAuth} from '../src/auth/AuthContext';
import {pl} from '../src/i18n/pl';

jest.mock('../src/auth/AuthContext', () => ({useAuth: jest.fn()}));

describe('AuthScreen', () => {
  const login = jest.fn();
  const register = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    login.mockResolvedValue(undefined);
    register.mockResolvedValue(undefined);
    jest.mocked(useAuth).mockReturnValue({
      user: null,
      token: null,
      loading: false,
      login,
      register,
      logout: jest.fn(),
    });
    jest.mocked(axios.isAxiosError).mockReturnValue(false);
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  test('submits entered credentials in login mode', async () => {
    render(<AuthScreen />);

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

  test('toggling to register reveals the nickname field', () => {
    render(<AuthScreen />);

    expect(screen.queryByPlaceholderText(pl.auth.nickname)).not.toBeOnTheScreen();

    fireEvent.press(screen.getByText(pl.auth.switchToRegister));

    expect(screen.getByPlaceholderText(pl.auth.nickname)).toBeOnTheScreen();
  });

  test('submits entered credentials including nickname in register mode', async () => {
    render(<AuthScreen />);

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

  test('shows an alert and message when the API rejects with 401', async () => {
    login.mockRejectedValueOnce({response: {status: 401}});
    jest.mocked(axios.isAxiosError).mockReturnValue(true);

    render(<AuthScreen />);

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
    expect(Alert.alert).toHaveBeenCalledWith(
      pl.appTitle,
      pl.auth.invalidCredentials,
    );
  });
});
