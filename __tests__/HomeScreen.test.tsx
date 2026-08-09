import React from 'react';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {fireEvent, screen, waitFor} from '@testing-library/react-native';
import {renderWithQueryClient} from '../src/test/renderWithQueryClient';
import {HomeScreen} from '../src/screens/HomeScreen';
import {getDailyCard} from '../src/api/dailyCard';
import {getWeeklyRitual} from '../src/api/rituals';
import type {DailyCard, WeeklyRitual} from '../src/domain/types';
import type {RootStackParamList} from '../src/navigation/types';
import {pl} from '../src/i18n/pl';

jest.mock('../src/api/dailyCard', () => ({getDailyCard: jest.fn()}));
jest.mock('../src/api/rituals', () => ({getWeeklyRitual: jest.fn()}));

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

const dailyCard: DailyCard = {
  question: {
    ulid: 'q_01',
    body: 'Co przyciągnęło Cię do partnera na początku?',
    type: 'daily',
    category: null,
    tags: [],
    options: null,
    liked: false,
    isLocked: false,
  },
  answeredToday: false,
  streakCurrent: 3,
  streakLongest: 12,
  dailyPushHour: 20,
};

const weeklyRitual: WeeklyRitual = {
  ritual: {
    ulid: 'r_01',
    title: 'Tydzień intymności',
    body: 'Usiądźcie naprzeciw siebie i dajcie sobie 2 minuty kontaktu wzrokowego.',
  },
  startedOn: '2026-07-12',
  dayOfWeek: 3,
};

const navigate = jest.fn();

function makeProps(): Props {
  return {
    navigation: {navigate, setOptions: jest.fn()},
    route: {key: 'Home', name: 'Home', params: undefined},
  } as unknown as Props;
}

describe('HomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getDailyCard).mockResolvedValue(dailyCard);
    jest.mocked(getWeeklyRitual).mockResolvedValue(weeklyRitual);
  });

  test('shows the "answer today" state and the streak when unanswered', async () => {
    renderWithQueryClient(<HomeScreen {...makeProps()} />);

    // Wait for the query to resolve (the teaser only appears with data).
    await screen.findByText(dailyCard.question.body);
    expect(screen.getByTestId('home-daily-status')).toHaveTextContent(
      pl.home.dailyCardTodo,
    );
    expect(screen.getByTestId('home-streak')).toHaveTextContent(
      pl.home.streak(3),
    );
  });

  test('shows the "answered" state when the card is done', async () => {
    jest
      .mocked(getDailyCard)
      .mockResolvedValue({...dailyCard, answeredToday: true});

    renderWithQueryClient(<HomeScreen {...makeProps()} />);

    await waitFor(() =>
      expect(screen.getByTestId('home-daily-status')).toHaveTextContent(
        pl.home.dailyCardDone,
      ),
    );
  });

  test('the daily card tile navigates to DailyCard', async () => {
    renderWithQueryClient(<HomeScreen {...makeProps()} />);

    fireEvent.press(await screen.findByTestId('home-daily-card'));

    expect(navigate).toHaveBeenCalledWith('DailyCard');
  });

  test('the game tile opens the local game setup', async () => {
    renderWithQueryClient(<HomeScreen {...makeProps()} />);

    fireEvent.press(await screen.findByTestId('home-local-game'));

    expect(navigate).toHaveBeenCalledWith('LocalGameSetup');
  });

  // S3c: the couple's session is the local game, and it is the only way in. The
  // server-side session screens stay in the codebase for the solo mode of etap
  // II, but nothing on the hub points at them.
  test('there is no second session tile pointing at the server session', async () => {
    renderWithQueryClient(<HomeScreen {...makeProps()} />);

    await screen.findByText(dailyCard.question.body);
    expect(screen.queryByTestId('home-session')).toBeNull();
    expect(screen.queryByText(pl.home.sessionTitle)).toBeNull();
  });

  test('the deck tile navigates to the closed deck', async () => {
    renderWithQueryClient(<HomeScreen {...makeProps()} />);

    fireEvent.press(await screen.findByTestId('home-deck'));

    expect(navigate).toHaveBeenCalledWith('Deck');
  });

  test('the progress tile navigates to the map', async () => {
    renderWithQueryClient(<HomeScreen {...makeProps()} />);

    fireEvent.press(await screen.findByTestId('home-progress'));

    expect(navigate).toHaveBeenCalledWith('ProgressMap');
  });

  test('shows the ritual tile with title and day counter, and navigates', async () => {
    renderWithQueryClient(<HomeScreen {...makeProps()} />);

    expect(await screen.findByText(weeklyRitual.ritual.title)).toBeOnTheScreen();
    expect(screen.getByTestId('home-ritual-day')).toHaveTextContent(
      pl.ritual.day(3),
    );

    fireEvent.press(screen.getByTestId('home-ritual'));
    expect(navigate).toHaveBeenCalledWith('Ritual');
  });

  test('hides the ritual tile (and does not crash) on a 404', async () => {
    jest.mocked(getWeeklyRitual).mockRejectedValue({response: {status: 404}});

    renderWithQueryClient(<HomeScreen {...makeProps()} />);

    // The rest of the home screen still renders.
    await screen.findByText(dailyCard.question.body);
    expect(screen.getByTestId('home-local-game')).toBeOnTheScreen();
    expect(screen.queryByTestId('home-ritual')).toBeNull();
  });
});
