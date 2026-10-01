import { darkTheme } from '../theme';
import { defaultScreenOptions, navigationTheme } from './navigationTheme';

// The game summary once came up with a white header because it was the one
// screen that did not style its own. These defaults are what a screen like that
// falls back to, so they must be the app's colours, not the library's.
describe('navigation theme', () => {
  test('the default header is dark with a gold tint', () => {
    const options = defaultScreenOptions(darkTheme);

    expect(options.headerStyle).toEqual({
      backgroundColor: darkTheme.colors.bg.base,
    });
    expect(options.headerTintColor).toBe(darkTheme.colors.gold.primary);
    expect(options.contentStyle).toEqual({
      backgroundColor: darkTheme.colors.bg.base,
    });
  });

  test('the container paints the app background, not white', () => {
    const theme = navigationTheme(darkTheme);

    expect(theme.dark).toBe(true);
    expect(theme.colors.background).toBe(darkTheme.colors.bg.base);
    expect(theme.colors.card).toBe(darkTheme.colors.bg.base);
  });
});
