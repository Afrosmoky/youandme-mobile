import React from 'react';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {fireEvent, screen, waitFor} from '@testing-library/react-native';
import {renderWithQueryClient} from '../src/test/renderWithQueryClient';
import {RitualScreen} from '../src/screens/RitualScreen';
import {
  getWeeklyRitual,
  setWeeklyRitualCompleted,
} from '../src/api/rituals';
import type {WeeklyRitual} from '../src/domain/types';
import type {RootStackParamList} from '../src/navigation/types';
import {pl} from '../src/i18n/pl';

jest.mock('../src/api/rituals', () => ({
  getWeeklyRitual: jest.fn(),
  setWeeklyRitualCompleted: jest.fn(),
  isRitualWeekRolledOver: jest.requireActual('../src/api/rituals')
    .isRitualWeekRolledOver,
}));

type Props = NativeStackScreenProps<RootStackParamList, 'Ritual'>;

const ritual: WeeklyRitual = {
  ritual: {
    ulid: 'r_01',
    title: 'Tydzień intymności',
    body: 'Usiądźcie naprzeciw siebie i dajcie sobie 2 minuty kontaktu wzrokowego.',
  },
  startedOn: '2026-07-12',
  dayOfWeek: 3,
  completed: false,
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
    jest.mocked(setWeeklyRitualCompleted).mockResolvedValue(true);
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
    // Still no card controls here — the one action this screen gained is the
    // completion mark, and nothing else.
    expect(screen.queryByTestId('daily-card-submit')).toBeNull();
    expect(screen.queryByText(pl.dailyCard.submitButton)).toBeNull();
  });

  test('offers the mark when the ritual is not done yet', async () => {
    renderWithQueryClient(<RitualScreen {...makeProps()} />);

    expect(await screen.findByTestId('ritual-complete')).toHaveTextContent(
      pl.ritual.completeButton,
    );
    expect(screen.queryByTestId('ritual-completed')).toBeNull();
  });

  test('marking it done sends the destination, not a flip', async () => {
    renderWithQueryClient(<RitualScreen {...makeProps()} />);

    fireEvent.press(await screen.findByTestId('ritual-complete'));

    await waitFor(() =>
      expect(setWeeklyRitualCompleted).toHaveBeenCalledWith(true),
    );
  });

  test('shows the done state, and lets the couple take it back', async () => {
    jest
      .mocked(getWeeklyRitual)
      .mockResolvedValue({...ritual, completed: true});
    jest.mocked(setWeeklyRitualCompleted).mockResolvedValue(false);
    renderWithQueryClient(<RitualScreen {...makeProps()} />);

    const done = await screen.findByTestId('ritual-completed');
    expect(done).toHaveTextContent(pl.ritual.completedButton);
    expect(screen.queryByTestId('ritual-complete')).toBeNull();

    fireEvent.press(done);

    await waitFor(() =>
      expect(setWeeklyRitualCompleted).toHaveBeenCalledWith(false),
    );
  });

  // The button reacts before the server answers — that immediacy is the whole
  // value of it, since nothing hangs off the mark.
  test('the mark lands on screen without waiting for the server', async () => {
    let resolve: (value: boolean) => void = () => {};
    jest
      .mocked(setWeeklyRitualCompleted)
      .mockReturnValue(new Promise(r => (resolve = r)));
    renderWithQueryClient(<RitualScreen {...makeProps()} />);

    fireEvent.press(await screen.findByTestId('ritual-complete'));

    expect(await screen.findByTestId('ritual-completed')).toBeOnTheScreen();
    resolve(true);
  });
});
