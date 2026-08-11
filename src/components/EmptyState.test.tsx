import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '../theme';
import { EmptyState } from './EmptyState';

function renderState(ui: React.ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe('EmptyState', () => {
  test('shows the title', () => {
    renderState(<EmptyState testID="x-empty" title="Nic tu jeszcze nie ma." />);

    expect(screen.getByTestId('x-empty')).toBeOnTheScreen();
    expect(screen.getByText('Nic tu jeszcze nie ma.')).toBeOnTheScreen();
  });

  test('shows the description only when given one', () => {
    const { rerender } = renderState(<EmptyState title="Tytuł" />);
    expect(screen.queryByText('Drugie zdanie.')).toBeNull();

    rerender(
      <ThemeProvider>
        <EmptyState title="Tytuł" description="Drugie zdanie." />
      </ThemeProvider>,
    );
    expect(screen.getByText('Drugie zdanie.')).toBeOnTheScreen();
  });

  test('draws no glyph unless asked', () => {
    renderState(<EmptyState title="Tytuł" />);
    expect(screen.queryByText('♡︎')).toBeNull();

    renderState(<EmptyState title="Tytuł" glyph="♡︎" />);
    expect(screen.getByText('♡︎')).toBeOnTheScreen();
  });
});
