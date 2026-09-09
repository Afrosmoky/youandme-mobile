import React, { ReactElement } from 'react';
import { Animated } from 'react-native';
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

  // 3C. The pulse is OURS, not a port: the web animates a heart only as a
  // loading indicator (GameClient, `loading` branch), never the like heart. So
  // what these guard is the shape we chose, and mainly the two ways it could go
  // wrong.
  describe('the pulse', () => {
    let sequence: jest.SpyInstance;

    beforeEach(() => {
      sequence = jest.spyOn(Animated, 'sequence');
      sequence.mockClear();
    });

    afterEach(() => sequence.mockRestore());

    test('fires when the heart fills', () => {
      const {rerender} = renderThemed(
        <LikeHeart liked={false} onToggle={jest.fn()} testID="heart" />,
      );

      rerender(
        <ThemeProvider>
          <LikeHeart liked onToggle={jest.fn()} testID="heart" />
        </ThemeProvider>,
      );

      expect(sequence).toHaveBeenCalledTimes(1);
    });

    // Opening a list of hearted memories must not set every row pulsing at once,
    // which is what happens if the initial value counts as a transition.
    test('does not fire for a heart that was already filled on mount', () => {
      renderThemed(<LikeHeart liked onToggle={jest.fn()} testID="heart" />);

      expect(sequence).not.toHaveBeenCalled();
    });

    // Taking a like back has nothing to celebrate.
    test('does not fire when the heart empties', () => {
      const {rerender} = renderThemed(
        <LikeHeart liked onToggle={jest.fn()} testID="heart" />,
      );

      rerender(
        <ThemeProvider>
          <LikeHeart liked={false} onToggle={jest.fn()} testID="heart" />
        </ThemeProvider>,
      );

      expect(sequence).not.toHaveBeenCalled();
    });

    // The whole reason a loop was rejected: this heart sits next to the question
    // a couple is reading. `Animated.loop` appearing here would be that decision
    // being quietly reversed.
    test('never loops', () => {
      const loop = jest.spyOn(Animated, 'loop');
      const {rerender} = renderThemed(
        <LikeHeart liked={false} onToggle={jest.fn()} testID="heart" />,
      );

      rerender(
        <ThemeProvider>
          <LikeHeart liked onToggle={jest.fn()} testID="heart" />
        </ThemeProvider>,
      );

      expect(loop).not.toHaveBeenCalled();
      loop.mockRestore();
    });
  });
});
