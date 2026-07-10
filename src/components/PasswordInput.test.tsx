import React, {ReactElement} from 'react';
import {fireEvent, render, screen} from '@testing-library/react-native';
import {ThemeProvider} from '../theme';
import {PasswordInput} from './PasswordInput';
import {pl} from '../i18n/pl';

// PasswordInput reads the theme, so tests render it inside a ThemeProvider.
const renderThemed = (ui: ReactElement) =>
  render(<ThemeProvider>{ui}</ThemeProvider>);

describe('PasswordInput', () => {
  test('hides the password by default', () => {
    renderThemed(
      <PasswordInput value="secret" onChangeText={jest.fn()} testID="pw" />,
    );

    expect(screen.getByTestId('pw').props.secureTextEntry).toBe(true);
    expect(screen.getByText(pl.common.passwordShow)).toBeOnTheScreen();
  });

  test('tapping the toggle reveals the password', () => {
    renderThemed(
      <PasswordInput value="secret" onChangeText={jest.fn()} testID="pw" />,
    );

    fireEvent.press(screen.getByTestId('pw-toggle'));

    expect(screen.getByTestId('pw').props.secureTextEntry).toBe(false);
    expect(screen.getByText(pl.common.passwordHide)).toBeOnTheScreen();
  });

  test('a second tap hides the password again', () => {
    renderThemed(
      <PasswordInput value="secret" onChangeText={jest.fn()} testID="pw" />,
    );

    fireEvent.press(screen.getByTestId('pw-toggle'));
    fireEvent.press(screen.getByTestId('pw-toggle'));

    expect(screen.getByTestId('pw').props.secureTextEntry).toBe(true);
    expect(screen.getByText(pl.common.passwordShow)).toBeOnTheScreen();
  });

  test('renders an inline error below when provided', () => {
    renderThemed(
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
