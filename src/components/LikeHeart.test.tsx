import React, { ReactElement } from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '../theme';
import { LikeHeart } from './LikeHeart';

// LikeHeart reads the theme, so tests render it inside a ThemeProvider.
const renderThemed = (ui: ReactElement) =>
  render(<ThemeProvider>{ui}</ThemeProvider>);

describe('LikeHeart', () => {
  test('renders a filled heart when liked', () => {
    renderThemed(<LikeHeart liked onToggle={jest.fn()} testID="heart" />);

    expect(screen.getByTestId('heart')).toHaveTextContent('♥︎');
  });

  test('renders an outline heart when not liked', () => {
    renderThemed(
      <LikeHeart liked={false} onToggle={jest.fn()} testID="heart" />,
    );

    expect(screen.getByTestId('heart')).toHaveTextContent('♡︎');
  });

  test('tapping calls onToggle', () => {
    const onToggle = jest.fn();
    renderThemed(<LikeHeart liked={false} onToggle={onToggle} testID="heart" />);

    fireEvent.press(screen.getByTestId('heart'));

    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  test('does not fire onToggle when disabled', () => {
    const onToggle = jest.fn();
    renderThemed(
      <LikeHeart liked={false} onToggle={onToggle} disabled testID="heart" />,
    );

    fireEvent.press(screen.getByTestId('heart'));

    expect(onToggle).not.toHaveBeenCalled();
  });
});
