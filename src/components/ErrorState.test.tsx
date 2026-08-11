import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '../theme';
import { ErrorState } from './ErrorState';
import { pl } from '../i18n/pl';

function renderState(ui: React.ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe('ErrorState', () => {
  test('shows the message it is handed', () => {
    renderState(
      <ErrorState testID="x-error" message={pl.common.networkError} />,
    );

    expect(screen.getByTestId('x-error')).toBeOnTheScreen();
    expect(screen.getByText(pl.common.networkError)).toBeOnTheScreen();
  });

  test('offers no retry when there is nothing to retry', () => {
    renderState(<ErrorState testID="x-error" message="Coś padło." />);

    expect(screen.queryByTestId('x-error-retry')).toBeNull();
    expect(screen.queryByText(pl.common.retry)).toBeNull();
  });

  test('calls onRetry when the button is pressed', () => {
    const onRetry = jest.fn();
    renderState(
      <ErrorState testID="x-error" message="Coś padło." onRetry={onRetry} />,
    );

    fireEvent.press(screen.getByTestId('x-error-retry'));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  test('blocks the button while the retry is in flight', () => {
    const onRetry = jest.fn();
    renderState(
      <ErrorState
        testID="x-error"
        message="Coś padło."
        onRetry={onRetry}
        retrying
      />,
    );

    fireEvent.press(screen.getByTestId('x-error-retry'));

    // OutlineButton swaps the label for a spinner and refuses presses.
    expect(onRetry).not.toHaveBeenCalled();
    expect(screen.queryByText(pl.common.retry)).toBeNull();
  });
});
