import React from 'react';
import {Alert} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import {ForgotPasswordScreen} from '../src/screens/ForgotPasswordScreen';
import {requestPasswordReset} from '../src/api/passwordReset';
import type {RootStackParamList} from '../src/navigation/types';
import {pl} from '../src/i18n/pl';

jest.mock('../src/api/passwordReset', () => ({
  requestPasswordReset: jest.fn(),
}));

type Props = NativeStackScreenProps<RootStackParamList, 'ForgotPassword'>;

function makeProps(): Props {
  return {
    navigation: {setOptions: jest.fn(), navigate: jest.fn(), goBack: jest.fn()},
    route: {key: 'ForgotPassword', name: 'ForgotPassword', params: undefined},
  } as unknown as Props;
}

describe('ForgotPasswordScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  test('submitting a valid email calls requestPasswordReset', async () => {
    jest.mocked(requestPasswordReset).mockResolvedValue({message: 'ok'});

    render(<ForgotPasswordScreen {...makeProps()} />);

    fireEvent.changeText(
      screen.getByPlaceholderText(pl.forgotPassword.email),
      'ola@example.com',
    );
    fireEvent.press(screen.getByTestId('forgot-password-submit'));

    await waitFor(() =>
      expect(requestPasswordReset).toHaveBeenCalledWith('ola@example.com'),
    );
  });

  test('shows an error message when the API rejects', async () => {
    jest
      .mocked(requestPasswordReset)
      .mockRejectedValueOnce(new Error('network'));

    render(<ForgotPasswordScreen {...makeProps()} />);

    fireEvent.changeText(
      screen.getByPlaceholderText(pl.forgotPassword.email),
      'ola@example.com',
    );
    fireEvent.press(screen.getByTestId('forgot-password-submit'));

    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith(
        pl.appTitle,
        pl.forgotPassword.error,
      ),
    );
  });
});
