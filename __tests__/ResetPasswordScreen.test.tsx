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

  test('surfaces the backend message when the token is rejected', async () => {
    jest.mocked(axios.isAxiosError).mockReturnValue(true);
    jest.mocked(resetPassword).mockRejectedValueOnce({
      response: {data: {message: 'This password reset token is invalid.'}},
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

    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith(
        pl.appTitle,
        'This password reset token is invalid.',
      ),
    );
  });
});
