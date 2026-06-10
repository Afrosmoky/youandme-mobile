import React from 'react';
import {Alert} from 'react-native';
import axios from 'axios';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import {ResetPasswordScreen} from '../src/screens/ResetPasswordScreen';
import {resetPassword} from '../src/api/passwordReset';
import type {RootStackParamList} from '../src/navigation/types';
import {pl} from '../src/i18n/pl';

jest.mock('../src/api/passwordReset', () => ({resetPassword: jest.fn()}));

type Props = NativeStackScreenProps<RootStackParamList, 'ResetPassword'>;

function makeProps(): Props {
  return {
    navigation: {setOptions: jest.fn(), navigate: jest.fn(), goBack: jest.fn()},
    route: {
      key: 'ResetPassword',
      name: 'ResetPassword',
      params: {token: 'tok_123', email: 'ola@example.com'},
    },
  } as unknown as Props;
}

describe('ResetPasswordScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  test('submitting matching passwords calls resetPassword with the params', async () => {
    jest.mocked(resetPassword).mockResolvedValue({message: 'ok'});

    render(<ResetPasswordScreen {...makeProps()} />);

    fireEvent.changeText(
      screen.getByPlaceholderText(pl.resetPassword.password),
      'noweHaslo123',
    );
    fireEvent.changeText(
      screen.getByPlaceholderText(pl.resetPassword.passwordConfirm),
      'noweHaslo123',
    );
    fireEvent.press(screen.getByTestId('reset-password-submit'));

    await waitFor(() =>
      expect(resetPassword).toHaveBeenCalledWith({
        token: 'tok_123',
        email: 'ola@example.com',
        password: 'noweHaslo123',
        passwordConfirmation: 'noweHaslo123',
      }),
    );
  });

  test('renders both password fields with a show/hide toggle', () => {
    render(<ResetPasswordScreen {...makeProps()} />);

    expect(
      screen.getByTestId('reset-password-password-toggle'),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId('reset-password-confirm-toggle'),
    ).toBeOnTheScreen();
  });

  test('shows an inline error when the passwords do not match', () => {
    render(<ResetPasswordScreen {...makeProps()} />);

    fireEvent.changeText(
      screen.getByPlaceholderText(pl.resetPassword.password),
      'noweHaslo123',
    );
    fireEvent.changeText(
      screen.getByPlaceholderText(pl.resetPassword.passwordConfirm),
      'inneHaslo999',
    );

    expect(
      screen.getByText(pl.resetPassword.passwordsDontMatch),
    ).toBeOnTheScreen();
    expect(resetPassword).not.toHaveBeenCalled();
  });

  test('surfaces the backend message in the banner when the token is rejected', async () => {
    jest.mocked(axios.isAxiosError).mockReturnValue(true);
    jest.mocked(resetPassword).mockRejectedValueOnce({
      response: {
        status: 422,
        data: {message: 'This password reset token is invalid.'},
      },
    });

    render(<ResetPasswordScreen {...makeProps()} />);

    fireEvent.changeText(
      screen.getByPlaceholderText(pl.resetPassword.password),
      'noweHaslo123',
    );
    fireEvent.changeText(
      screen.getByPlaceholderText(pl.resetPassword.passwordConfirm),
      'noweHaslo123',
    );
    fireEvent.press(screen.getByTestId('reset-password-submit'));

    expect(await screen.findByTestId('reset-password-banner')).toHaveTextContent(
      'This password reset token is invalid.',
    );
  });

  test('shows the top-level banner when the backend returns an email error', async () => {
    jest.mocked(axios.isAxiosError).mockReturnValue(true);
    jest.mocked(resetPassword).mockRejectedValueOnce({
      response: {
        status: 422,
        data: {
          message: 'Ten token jest nieprawidłowy.',
          errors: {email: ['Ten token jest nieprawidłowy.']},
        },
      },
    });

    render(<ResetPasswordScreen {...makeProps()} />);

    fireEvent.changeText(
      screen.getByPlaceholderText(pl.resetPassword.password),
      'noweHaslo123',
    );
    fireEvent.changeText(
      screen.getByPlaceholderText(pl.resetPassword.passwordConfirm),
      'noweHaslo123',
    );
    fireEvent.press(screen.getByTestId('reset-password-submit'));

    expect(await screen.findByTestId('reset-password-banner')).toHaveTextContent(
      'Ten token jest nieprawidłowy.',
    );
  });

  test('clears the banner when the password is edited', async () => {
    jest.mocked(axios.isAxiosError).mockReturnValue(true);
    jest.mocked(resetPassword).mockRejectedValueOnce({
      response: {
        status: 422,
        data: {message: 'Ten token jest nieprawidłowy.'},
      },
    });

    render(<ResetPasswordScreen {...makeProps()} />);

    fireEvent.changeText(
      screen.getByPlaceholderText(pl.resetPassword.password),
      'noweHaslo123',
    );
    fireEvent.changeText(
      screen.getByPlaceholderText(pl.resetPassword.passwordConfirm),
      'noweHaslo123',
    );
    fireEvent.press(screen.getByTestId('reset-password-submit'));

    await screen.findByTestId('reset-password-banner');

    fireEvent.changeText(
      screen.getByPlaceholderText(pl.resetPassword.password),
      'noweHaslo1234',
    );

    expect(screen.queryByTestId('reset-password-banner')).toBeNull();
  });

  test('shows the per-field backend error under the password on 422', async () => {
    jest.mocked(axios.isAxiosError).mockReturnValue(true);
    jest.mocked(resetPassword).mockRejectedValueOnce({
      response: {
        status: 422,
        data: {
          message: 'Hasło jest zbyt słabe.',
          errors: {password: ['Hasło jest zbyt słabe.']},
        },
      },
    });

    render(<ResetPasswordScreen {...makeProps()} />);

    fireEvent.changeText(
      screen.getByPlaceholderText(pl.resetPassword.password),
      'noweHaslo123',
    );
    fireEvent.changeText(
      screen.getByPlaceholderText(pl.resetPassword.passwordConfirm),
      'noweHaslo123',
    );
    fireEvent.press(screen.getByTestId('reset-password-submit'));

    expect(
      await screen.findByTestId('reset-password-password-error'),
    ).toHaveTextContent('Hasło jest zbyt słabe.');
    // The topLevel message also shows in the banner.
    expect(screen.getByTestId('reset-password-banner')).toHaveTextContent(
      'Hasło jest zbyt słabe.',
    );
  });

  test('shows the server error in the banner on a 500', async () => {
    jest.mocked(axios.isAxiosError).mockReturnValue(true);
    jest
      .mocked(resetPassword)
      .mockRejectedValueOnce({response: {status: 500}});

    render(<ResetPasswordScreen {...makeProps()} />);

    fireEvent.changeText(
      screen.getByPlaceholderText(pl.resetPassword.password),
      'noweHaslo123',
    );
    fireEvent.changeText(
      screen.getByPlaceholderText(pl.resetPassword.passwordConfirm),
      'noweHaslo123',
    );
    fireEvent.press(screen.getByTestId('reset-password-submit'));

    expect(await screen.findByTestId('reset-password-banner')).toHaveTextContent(
      pl.common.serverError,
    );
  });
});
