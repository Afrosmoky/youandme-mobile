import React from 'react';
import {fireEvent, render, screen} from '@testing-library/react-native';
import {PasswordInput} from './PasswordInput';
import {pl} from '../i18n/pl';

describe('PasswordInput', () => {
  test('hides the password by default', () => {
    render(
      <PasswordInput value="secret" onChangeText={jest.fn()} testID="pw" />,
    );

    expect(screen.getByTestId('pw').props.secureTextEntry).toBe(true);
    expect(screen.getByText(pl.common.passwordShow)).toBeOnTheScreen();
  });

  test('tapping the toggle reveals the password', () => {
    render(
      <PasswordInput value="secret" onChangeText={jest.fn()} testID="pw" />,
    );

    fireEvent.press(screen.getByTestId('pw-toggle'));

    expect(screen.getByTestId('pw').props.secureTextEntry).toBe(false);
    expect(screen.getByText(pl.common.passwordHide)).toBeOnTheScreen();
  });

  test('a second tap hides the password again', () => {
    render(
      <PasswordInput value="secret" onChangeText={jest.fn()} testID="pw" />,
    );

    fireEvent.press(screen.getByTestId('pw-toggle'));
    fireEvent.press(screen.getByTestId('pw-toggle'));

    expect(screen.getByTestId('pw').props.secureTextEntry).toBe(true);
    expect(screen.getByText(pl.common.passwordShow)).toBeOnTheScreen();
  });

  test('renders an inline error below when provided', () => {
    render(
      <PasswordInput
        value="secret"
        onChangeText={jest.fn()}
        testID="pw"
        error="Hasło jest za krótkie."
      />,
    );

    expect(screen.getByTestId('pw-error')).toHaveTextContent(
      'Hasło jest za krótkie.',
    );
  });
});
