import React from 'react';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {screen} from '@testing-library/react-native';
import {renderWithQueryClient} from '../src/test/renderWithQueryClient';
import {RitualScreen} from '../src/screens/RitualScreen';
import {getWeeklyRitual} from '../src/api/rituals';
import type {WeeklyRitual} from '../src/domain/types';
import type {RootStackParamList} from '../src/navigation/types';
import {pl} from '../src/i18n/pl';

jest.mock('../src/api/rituals', () => ({getWeeklyRitual: jest.fn()}));

type Props = NativeStackScreenProps<RootStackParamList, 'Ritual'>;

const ritual: WeeklyRitual = {
  ritual: {
    ulid: 'r_01',
    title: 'Tydzień intymności',
    body: 'Usiądźcie naprzeciw siebie i dajcie sobie 2 minuty kontaktu wzrokowego.',
  },
  startedOn: '2026-07-12',
  dayOfWeek: 3,
};

function makeProps(): Props {
  return {
    navigation: {navigate: jest.fn(), setOptions: jest.fn(), goBack: jest.fn()},
    route: {key: 'Ritual', name: 'Ritual', params: undefined},
  } as unknown as Props;
}

describe('RitualScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getWeeklyRitual).mockResolvedValue(ritual);
  });

  test('renders the title, body and day counter, with no action', async () => {
    renderWithQueryClient(<RitualScreen {...makeProps()} />);

    expect(await screen.findByTestId('ritual-title')).toHaveTextContent(
      'Tydzień intymności',
    );
    expect(screen.getByTestId('ritual-body')).toHaveTextContent(
      ritual.ritual.body,
    );
    expect(screen.getByTestId('ritual-day-counter')).toHaveTextContent(
      pl.ritual.day(3),
    );
    // A read-only screen: no submit / action control.
    expect(screen.queryByTestId('daily-card-submit')).toBeNull();
    expect(screen.queryByText(pl.dailyCard.submitButton)).toBeNull();
  });
});
