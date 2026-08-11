import React from 'react';
import axios from 'axios';
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
    // clearAllMocks clears calls, not implementations; one test below makes
    // isAxiosError true and it would leak into the next.
    jest.mocked(axios.isAxiosError).mockReturnValue(false);
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

    // Once the card is there: the tile is inert while loading and while failed,
    // where a retry is the way out rather than a screen with nothing on it.
    await screen.findByTestId('home-daily-status');
    fireEvent.press(screen.getByTestId('home-daily-card'));

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

  // P11: the daily card is the only tile here with something to fetch, and the
  // first thing anyone sees after signing in. Before this it rendered "…" for a
  // pending request and for a failed one alike.
  describe('the daily card tile', () => {
    test('shows a spinner while the card is on its way', async () => {
      // Never resolves: the tile stays in its loading state for the assertion.
      jest.mocked(getDailyCard).mockReturnValue(new Promise(() => {}));

      renderWithQueryClient(<HomeScreen {...makeProps()} />);

      expect(await screen.findByTestId('home-daily-loading')).toBeOnTheScreen();
      // The footer would otherwise claim, confidently, that nothing has been
      // answered and there is no streak.
      expect(screen.queryByTestId('home-daily-status')).toBeNull();
      expect(screen.queryByTestId('home-streak')).toBeNull();
      expect(screen.queryByTestId('home-daily-error')).toBeNull();
    });

    test('shows the failure with a retry, in the tile', async () => {
      jest.mocked(getDailyCard).mockRejectedValue(new Error('network'));

      renderWithQueryClient(<HomeScreen {...makeProps()} />);

      expect(await screen.findByTestId('home-daily-error')).toBeOnTheScreen();
      expect(screen.getByText(pl.dailyCard.loadError)).toBeOnTheScreen();
      expect(screen.queryByTestId('home-daily-loading')).toBeNull();
    });

    test('a lost connection says so rather than blaming the card', async () => {
      const offline = {isAxiosError: true, response: undefined};
      jest.mocked(axios.isAxiosError).mockImplementation(err => err === offline);
      jest.mocked(getDailyCard).mockRejectedValue(offline);

      renderWithQueryClient(<HomeScreen {...makeProps()} />);

      expect(await screen.findByText(pl.common.networkError)).toBeOnTheScreen();
    });

    test('retry asks again and the card appears', async () => {
      jest.mocked(getDailyCard).mockRejectedValueOnce(new Error('network'));

      renderWithQueryClient(<HomeScreen {...makeProps()} />);
      await screen.findByTestId('home-daily-error');

      jest.mocked(getDailyCard).mockResolvedValue(dailyCard);
      fireEvent.press(screen.getByTestId('home-daily-error-retry'));

      expect(await screen.findByTestId('home-daily-status')).toBeOnTheScreen();
      await waitFor(() => expect(getDailyCard).toHaveBeenCalledTimes(2));
    });

    // Tapping through to a screen with nothing on it is not a way out of
    // either state.
    test.each([
      ['while loading', () => new Promise(() => {}), 'home-daily-loading'],
      ['while failed', () => Promise.reject(new Error('network')), 'home-daily-error'],
    ])('does not navigate %s', async (_name, impl, marker) => {
      jest.mocked(getDailyCard).mockImplementation(impl as never);

      renderWithQueryClient(<HomeScreen {...makeProps()} />);
      await screen.findByTestId(marker);
      fireEvent.press(screen.getByTestId('home-daily-card'));

      expect(navigate).not.toHaveBeenCalledWith('DailyCard');
    });
  });

  // P11: the remote game is announced, not built. The tile stays on the hub so
  // the path does not vanish between now and etap II.
  test('shows the remote game tile marked as coming soon', async () => {
    renderWithQueryClient(<HomeScreen {...makeProps()} />);

    expect(await screen.findByTestId('home-remote-game')).toBeOnTheScreen();
    expect(screen.getByText(pl.home.remoteGameTitle)).toBeOnTheScreen();
    expect(screen.getByTestId('home-remote-game-badge')).toHaveTextContent(
      pl.comingSoon.badge,
    );
  });

  test('the remote game tile opens ComingSoon with its own copy', async () => {
    renderWithQueryClient(<HomeScreen {...makeProps()} />);

    fireEvent.press(await screen.findByTestId('home-remote-game'));

    expect(navigate).toHaveBeenCalledWith('ComingSoon', {
      title: pl.comingSoon.remoteGameTitle,
      body: pl.comingSoon.remoteGameBody,
    });
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
