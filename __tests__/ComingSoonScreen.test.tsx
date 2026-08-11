import React from 'react';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {render, screen} from '@testing-library/react-native';
import {ThemeProvider} from '../src/theme';
import {ComingSoonScreen} from '../src/screens/ComingSoonScreen';
import type {RootStackParamList} from '../src/navigation/types';
import {pl} from '../src/i18n/pl';

type Props = NativeStackScreenProps<RootStackParamList, 'ComingSoon'>;
type RenderProp = (p: object) => React.ReactElement;

function makeProps(
  params: {title: string; body: string} = {
    title: pl.comingSoon.remoteGameTitle,
    body: pl.comingSoon.remoteGameBody,
  },
): Props {
  return {
    navigation: {navigate: jest.fn(), setOptions: jest.fn(), goBack: jest.fn()},
    route: {key: 'ComingSoon', name: 'ComingSoon', params},
  } as unknown as Props;
}

function renderScreen(props: Props) {
  return render(
    <ThemeProvider>
      <ComingSoonScreen {...props} />
    </ThemeProvider>,
  );
}

// One screen, many announcements: everything it shows comes from route params,
// so the ranking can reuse it later without a second near-identical screen.
describe('ComingSoonScreen', () => {
  test('renders the title and body it was handed', () => {
    renderScreen(makeProps());

    expect(screen.getByTestId('coming-soon-title')).toHaveTextContent(
      pl.comingSoon.remoteGameTitle,
    );
    expect(screen.getByTestId('coming-soon-body')).toHaveTextContent(
      pl.comingSoon.remoteGameBody,
    );
  });

  test('says "coming soon" rather than implying anything is locked', () => {
    renderScreen(makeProps());

    expect(screen.getByTestId('coming-soon-badge')).toHaveTextContent(
      pl.comingSoon.badge,
    );
    // No call to action: there is nothing to buy, unlock or wait for on this
    // screen, and the way out is the header back button.
    expect(screen.queryByTestId('coming-soon-cta')).toBeNull();
  });

  test('carries whatever copy the next announcement brings', () => {
    renderScreen(
      makeProps({title: 'Ranking par', body: 'Zobaczcie, jak wam idzie.'}),
    );

    expect(screen.getByTestId('coming-soon-title')).toHaveTextContent(
      'Ranking par',
    );
    expect(screen.getByTestId('coming-soon-body')).toHaveTextContent(
      'Zobaczcie, jak wam idzie.',
    );
  });

  test('puts the route title in the header', () => {
    const props = makeProps();
    renderScreen(props);

    const calls = jest.mocked(props.navigation.setOptions).mock.calls;
    const opts = calls[calls.length - 1][0];
    const header = render(
      <ThemeProvider>{(opts.headerTitle as unknown as RenderProp)({})}</ThemeProvider>,
    );

    expect(
      header.getByText(pl.comingSoon.remoteGameTitle),
    ).toBeOnTheScreen();
  });
});
