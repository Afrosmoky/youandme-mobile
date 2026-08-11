import React, { ReactElement } from 'react';
import { Text } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '../theme';
import { GameCard } from './GameCard';

const renderThemed = (ui: ReactElement) =>
  render(<ThemeProvider>{ui}</ThemeProvider>);

const FILLED = '♥︎';
const OUTLINE = '♡︎';

describe('GameCard', () => {
  test('renders what it is given', () => {
    renderThemed(
      <GameCard testID="card">
        <Text>Pytanie 1?</Text>
      </GameCard>,
    );

    expect(screen.getByTestId('card')).toHaveTextContent('Pytanie 1?');
  });

  // A card there is nothing to like — the challenge — asks for no heart, and
  // must not get one anyway.
  test('a card with no like prop carries no heart', () => {
    renderThemed(
      <GameCard testID="card">
        <Text>Wyzwanie</Text>
      </GameCard>,
    );

    expect(screen.queryByTestId('card-like')).toBeNull();
    expect(screen.queryByTestId('card-like-mirror')).toBeNull();
  });

  // The existing testID keeps naming ONE element — the corner heart — so every
  // selector written before S_polish still resolves. The mirror is additive.
  test('the heart appears in both corners, under two distinct testIDs', () => {
    renderThemed(
      <GameCard
        testID="card"
        like={{ liked: false, onToggle: jest.fn(), testID: 'card-like' }}>
        <Text>Pytanie 1?</Text>
      </GameCard>,
    );

    expect(screen.getByTestId('card-like')).toBeOnTheScreen();
    expect(screen.getByTestId('card-like-mirror')).toBeOnTheScreen();
  });

  // The whole reason the pair lives in the frame: one `liked` in, so there is no
  // second copy of the state to drift out of step with the first.
  test('both corners show the same like', () => {
    const { rerender } = renderThemed(
      <GameCard
        testID="card"
        like={{ liked: false, onToggle: jest.fn(), testID: 'card-like' }}>
        <Text>Pytanie 1?</Text>
      </GameCard>,
    );

    expect(screen.getByTestId('card-like')).toHaveTextContent(OUTLINE);
    expect(screen.getByTestId('card-like-mirror')).toHaveTextContent(OUTLINE);

    rerender(
      <ThemeProvider>
        <GameCard
          testID="card"
          like={{ liked: true, onToggle: jest.fn(), testID: 'card-like' }}>
          <Text>Pytanie 1?</Text>
        </GameCard>
      </ThemeProvider>,
    );

    expect(screen.getByTestId('card-like')).toHaveTextContent(FILLED);
    expect(screen.getByTestId('card-like-mirror')).toHaveTextContent(FILLED);
  });

  // Two corners, one like: tapping either is the same single toggle, and one tap
  // is one call. A pair that fired twice would like and immediately unlike.
  test.each([['card-like'], ['card-like-mirror']])(
    'tapping %s toggles once',
    testID => {
      const onToggle = jest.fn();
      renderThemed(
        <GameCard
          testID="card"
          like={{ liked: false, onToggle, testID: 'card-like' }}>
          <Text>Pytanie 1?</Text>
        </GameCard>,
      );

      fireEvent.press(screen.getByTestId(testID));

      expect(onToggle).toHaveBeenCalledTimes(1);
    },
  );

  test('neither corner fires while the like is disabled', () => {
    const onToggle = jest.fn();
    renderThemed(
      <GameCard
        testID="card"
        like={{ liked: false, onToggle, disabled: true, testID: 'card-like' }}>
        <Text>Pytanie 1?</Text>
      </GameCard>,
    );

    fireEvent.press(screen.getByTestId('card-like'));
    fireEvent.press(screen.getByTestId('card-like-mirror'));

    expect(onToggle).not.toHaveBeenCalled();
  });
});
