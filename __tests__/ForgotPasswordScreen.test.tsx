import React from 'react';
import {Alert} from 'react-native';
import axios from 'axios';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {fireEvent, screen, waitFor} from '@testing-library/react-native';
import {renderWithQueryClient} from '../src/test/renderWithQueryClient';
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

    renderWithQueryClient(<ForgotPasswordScreen {...makeProps()} />);

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

    renderWithQueryClient(<ForgotPasswordScreen {...makeProps()} />);

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

  test('shows the per-field backend error under the email on 422', async () => {
    jest.mocked(requestPasswordReset).mockRejectedValueOnce({
      response: {
        status: 422,
        data: {
          message: 'Nie znaleziono konta dla tego adresu.',
          errors: {email: ['Nie znaleziono konta dla tego adresu.']},
        },
      },
    });
    jest.mocked(axios.isAxiosError).mockReturnValue(true);

    renderWithQueryClient(<ForgotPasswordScreen {...makeProps()} />);

    fireEvent.changeText(
      screen.getByPlaceholderText(pl.forgotPassword.email),
      'nieznany@example.com',
    );
    fireEvent.press(screen.getByTestId('forgot-password-submit'));

    expect(
      await screen.findByTestId('forgot-password-email-error'),
    ).toHaveTextContent('Nie znaleziono konta dla tego adresu.');
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  test('shows the server error on a 500', async () => {
    jest
      .mocked(requestPasswordReset)
      .mockRejectedValueOnce({response: {status: 500}});
    jest.mocked(axios.isAxiosError).mockReturnValue(true);

    renderWithQueryClient(<ForgotPasswordScreen {...makeProps()} />);

    fireEvent.changeText(
      screen.getByPlaceholderText(pl.forgotPassword.email),
      'ola@example.com',
    );
    fireEvent.press(screen.getByTestId('forgot-password-submit'));

    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith(
        pl.appTitle,
        pl.common.serverError,
      ),
    );
  });
});
