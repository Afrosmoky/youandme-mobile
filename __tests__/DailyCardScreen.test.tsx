import React from 'react';
import axios from 'axios';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {act, fireEvent, screen, waitFor} from '@testing-library/react-native';
import {renderWithQueryClient} from '../src/test/renderWithQueryClient';
import {DailyCardScreen} from '../src/screens/DailyCardScreen';
import {getDailyCard, answerDailyCard} from '../src/api/dailyCard';
import {likeQuestion} from '../src/api/likes';
import type {DailyCard, Couple, Memory} from '../src/domain/types';
import type {RootStackParamList} from '../src/navigation/types';
import {pl} from '../src/i18n/pl';

jest.mock('../src/api/dailyCard', () => ({
  getDailyCard: jest.fn(),
  answerDailyCard: jest.fn(),
}));
jest.mock('../src/api/likes', () => ({
  likeQuestion: jest.fn(),
  unlikeQuestion: jest.fn(),
}));

type Props = NativeStackScreenProps<RootStackParamList, 'DailyCard'>;

const card: DailyCard = {
  question: {
    ulid: 'q_01',
    body: 'Pytanie dnia?',
    type: 'daily',
    category: null,
    tags: [],
    liked: false,
  },
  answeredToday: false,
  streakCurrent: 5,
  streakLongest: 12,
  dailyPushHour: 20,
};

const couple = (streakCurrent: number): Couple => ({
  ulid: 'c_01',
  partnerNameLocal: 'Kuba',
  streakCurrent,
  streakLongest: 12,
  dailyPushHour: 20,
  relationshipStartedOn: null,
  createdAt: '2026-06-04T05:00:00.000Z',
});

const memory = {ulid: 'm_01'} as unknown as Memory;

function makeProps(): Props {
  return {
    navigation: {navigate: jest.fn(), setOptions: jest.fn(), goBack: jest.fn()},
    route: {key: 'DailyCard', name: 'DailyCard', params: undefined},
  } as unknown as Props;
}

describe('DailyCardScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getDailyCard).mockResolvedValue(card);
    jest.mocked(axios.isAxiosError).mockReturnValue(false);
  });

  test('tapping the heart optimistically flips the like', async () => {
    jest.mocked(likeQuestion).mockResolvedValue({liked: true});

    renderWithQueryClient(<DailyCardScreen {...makeProps()} />);
    const heart = await screen.findByTestId('daily-card-like');
    expect(heart).toHaveTextContent('♡');

    fireEvent.press(heart);

    // Flips before the API resolves, and stays liked after reconcile.
    await waitFor(() =>
      expect(screen.getByTestId('daily-card-like')).toHaveTextContent('♥'),
    );
    expect(likeQuestion).toHaveBeenCalledWith('q_01');
    // Let the mutation's onSuccess reconcile settle (TanStack batches its cache
    // notifications on a timer) so no state update leaks past the test.
    await act(async () => {
      await Promise.resolve();
    });
  });

  test('a rejected like rolls back to the previous state', async () => {
    jest.mocked(likeQuestion).mockRejectedValue(new Error('network'));

    renderWithQueryClient(<DailyCardScreen {...makeProps()} />);
    const heart = await screen.findByTestId('daily-card-like');

    fireEvent.press(heart);

    // Optimistically liked, then rolled back to not-liked on error.
    await waitFor(() =>
      expect(screen.getByTestId('daily-card-like')).toHaveTextContent('♡'),
    );
    await act(async () => {
      await Promise.resolve();
    });
  });

  test('saves an answer, then shows the answered state', async () => {
    jest
      .mocked(getDailyCard)
      .mockResolvedValueOnce(card)
      .mockResolvedValue({...card, answeredToday: true});
    jest
      .mocked(answerDailyCard)
      .mockResolvedValue({memory, couple: couple(6)});

    renderWithQueryClient(<DailyCardScreen {...makeProps()} />);
    fireEvent.changeText(
      await screen.findByTestId('daily-card-input'),
      'Nasza odpowiedź',
    );
    fireEvent.press(screen.getByTestId('daily-card-submit'));

    await waitFor(() =>
      expect(answerDailyCard).toHaveBeenCalledWith({
        questionUlid: 'q_01',
        answerA: 'Nasza odpowiedź',
        answerB: null,
      }),
    );
    // After the refetch the card is answered: input gone, link shown.
    await waitFor(() =>
      expect(screen.queryByTestId('daily-card-submit')).toBeNull(),
    );
    expect(screen.getByTestId('daily-card-answered-link')).toBeOnTheScreen();
  });

  test('a 409 shows the stale-refresh message, not a generic error', async () => {
    jest.mocked(answerDailyCard).mockRejectedValueOnce({response: {status: 409}});
    jest.mocked(axios.isAxiosError).mockReturnValue(true);

    renderWithQueryClient(<DailyCardScreen {...makeProps()} />);
    fireEvent.changeText(
      await screen.findByTestId('daily-card-input'),
      'odpowiedź',
    );
    fireEvent.press(screen.getByTestId('daily-card-submit'));

    expect(await screen.findByTestId('daily-card-error')).toHaveTextContent(
      pl.dailyCard.staleRefreshing,
    );
    expect(screen.queryByText(pl.dailyCard.saveError)).toBeNull();
  });

  test('an already-answered card shows the closed state with no input', async () => {
    jest.mocked(getDailyCard).mockResolvedValue({...card, answeredToday: true});

    renderWithQueryClient(<DailyCardScreen {...makeProps()} />);

    expect(
      await screen.findByTestId('daily-card-answered-link'),
    ).toBeOnTheScreen();
    expect(screen.queryByTestId('daily-card-input')).toBeNull();
    expect(screen.queryByTestId('daily-card-submit')).toBeNull();
  });

  test('crossing a milestone (6 → 7) triggers the celebration', async () => {
    jest.mocked(answerDailyCard).mockResolvedValue({memory, couple: couple(7)});

    renderWithQueryClient(<DailyCardScreen {...makeProps()} />);
    fireEvent.changeText(
      await screen.findByTestId('daily-card-input'),
      'odpowiedź',
    );
    fireEvent.press(screen.getByTestId('daily-card-submit'));

    expect(await screen.findByTestId('celebration')).toBeOnTheScreen();
  });

  test('a non-milestone streak (7 → 8) does not celebrate', async () => {
    jest.mocked(answerDailyCard).mockResolvedValue({memory, couple: couple(8)});

    renderWithQueryClient(<DailyCardScreen {...makeProps()} />);
    fireEvent.changeText(
      await screen.findByTestId('daily-card-input'),
      'odpowiedź',
    );
    fireEvent.press(screen.getByTestId('daily-card-submit'));

    await waitFor(() => expect(answerDailyCard).toHaveBeenCalled());
    expect(screen.queryByTestId('celebration')).toBeNull();
  });
});
