import React from 'react';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {fireEvent, screen, waitFor} from '@testing-library/react-native';
import {renderWithQueryClient} from '../src/test/renderWithQueryClient';
import {HomeScreen} from '../src/screens/HomeScreen';
import {getDailyCard} from '../src/api/dailyCard';
import type {DailyCard} from '../src/domain/types';
import type {RootStackParamList} from '../src/navigation/types';
import {pl} from '../src/i18n/pl';

jest.mock('../src/api/dailyCard', () => ({getDailyCard: jest.fn()}));

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

const dailyCard: DailyCard = {
  question: {
    ulid: 'q_01',
    body: 'Co przyciągnęło Cię do partnera na początku?',
    type: 'daily',
    category: null,
    tags: [],
  },
  answeredToday: false,
  streakCurrent: 3,
  streakLongest: 12,
  dailyPushHour: 20,
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

  test('the session tile navigates to the category picker', async () => {
    renderWithQueryClient(<HomeScreen {...makeProps()} />);

    fireEvent.press(await screen.findByTestId('home-session'));

    expect(navigate).toHaveBeenCalledWith('CategoryPicker');
  });
});
