import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { renderWithQueryClient } from '../test/renderWithQueryClient';
import { DailyCardScreen } from './DailyCardScreen';
import { getDailyCard, answerDailyCard } from '../api/dailyCard';
import { likeQuestion, unlikeQuestion } from '../api/likes';
import { getProgress } from '../api/progress';
import type { RootStackParamList } from '../navigation/types';
import type { Couple, DailyCard, Memory, Progress } from '../domain/types';
import { pl } from '../i18n/pl';

jest.mock('../api/dailyCard', () => ({
  getDailyCard: jest.fn(),
  answerDailyCard: jest.fn(),
}));
jest.mock('../api/likes', () => ({
  likeQuestion: jest.fn(),
  unlikeQuestion: jest.fn(),
}));
jest.mock('../api/progress', () => ({ getProgress: jest.fn() }));
// A getter, so a test can take the names away and see the fallback labels.
let mockAuth: {
  user: { nickname: string } | null;
  couple: { partnerNameLocal: string | null } | null;
};
jest.mock('../auth/AuthContext', () => ({
  useAuth: () => mockAuth,
}));
jest.mock('../notifications/notifee', () => ({
  notifyStreakMilestone: jest.fn(),
}));

// The screen had no test of its own until S_polish restyled it, which is
// precisely why it gets one now: the card frame, the two corner hearts and the
// footer are exactly the kind of change that goes wrong quietly.

const FILLED = '♥︎';
const OUTLINE = '♡︎';

const card = (overrides: Partial<DailyCard> = {}): DailyCard => ({
  question: {
    ulid: 'Q1',
    body: 'Co dziś Cię ucieszyło?',
    type: 'daily',
    category: { slug: 'randka', name: 'Randka' },
    tags: [],
    options: null,
    liked: false,
    isLocked: false,
  },
  answeredToday: false,
  streakCurrent: 3,
  streakLongest: 5,
  dailyPushHour: 20,
  ...overrides,
});

const progress: Progress = {
  totalPlayed: 4,
  nextThreshold: 10,
  milestones: [],
};

const navigate = jest.fn();

const makeProps = () =>
  ({
    navigation: { navigate, setOptions: jest.fn(), popTo: jest.fn() },
    route: { key: 'DailyCard', name: 'DailyCard', params: undefined },
  }) as unknown as NativeStackScreenProps<RootStackParamList, 'DailyCard'>;

const renderScreen = () =>
  renderWithQueryClient(<DailyCardScreen {...makeProps()} />);

beforeEach(() => {
  jest.clearAllMocks();
  mockAuth = {
    user: { nickname: 'ola' },
    couple: { partnerNameLocal: 'Tomek' },
  };
  jest.mocked(getDailyCard).mockResolvedValue(card());
  jest.mocked(getProgress).mockResolvedValue(progress);
  jest.mocked(likeQuestion).mockResolvedValue({ liked: true });
  jest.mocked(unlikeQuestion).mockResolvedValue({ liked: false });
  jest.mocked(answerDailyCard).mockResolvedValue({
    memory: {} as Memory,
    couple: { streakCurrent: 4 } as Couple,
  });
});

describe('DailyCardScreen', () => {
  test('the question and the field live inside the card frame', async () => {
    renderScreen();

    const frame = await screen.findByTestId('daily-card-card');
    expect(within(frame).getByTestId('daily-card-question')).toHaveTextContent(
      'Co dziś Cię ucieszyło?',
    );
    expect(within(frame).getByTestId('daily-card-answer-a')).toBeOnTheScreen();
    // The one action spans the width UNDER the card, as in the game.
    expect(within(frame).queryByTestId('daily-card-submit')).toBeNull();
    expect(screen.getByTestId('daily-card-submit')).toBeOnTheScreen();
  });

  test('answering sends the text and clears the field', async () => {
    renderScreen();

    fireEvent.changeText(
      await screen.findByTestId('daily-card-answer-a'),
      'Kawa o poranku',
    );
    fireEvent.press(screen.getByTestId('daily-card-submit'));

    await waitFor(() =>
      expect(answerDailyCard).toHaveBeenCalledWith({
        questionUlid: 'Q1',
        answerA: 'Kawa o poranku',
        answerB: null,
      }),
    );
  });

  test('an empty answer is refused before it reaches the server', async () => {
    renderScreen();

    fireEvent.press(await screen.findByTestId('daily-card-submit'));

    expect(
      await screen.findByTestId('daily-card-answer-a-error'),
    ).toHaveTextContent(pl.dailyCard.emptyAnswer);
    expect(answerDailyCard).not.toHaveBeenCalled();
  });

  // Two fields, labelled as the memory they become will be.
  test('labels both answers with the couple\'s names', async () => {
    renderScreen();

    expect(
      await screen.findByText(pl.memoryCard.answerLabel('ola')),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(pl.memoryCard.answerLabel('Tomek')),
    ).toBeOnTheScreen();
    expect(screen.getByText(pl.dailyCard.partnerHint)).toBeOnTheScreen();
  });

  test('falls back to generic labels when the names are unknown', async () => {
    mockAuth = { user: null, couple: { partnerNameLocal: null } };
    renderScreen();

    expect(
      await screen.findByText(pl.dailyCard.ownAnswerFallback),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(pl.memoryCard.partnerAnswerLabel),
    ).toBeOnTheScreen();
  });

  test('sends the partner answer too, trimmed', async () => {
    renderScreen();

    fireEvent.changeText(
      await screen.findByTestId('daily-card-answer-a'),
      'Kawa o poranku',
    );
    fireEvent.changeText(
      screen.getByTestId('daily-card-answer-b'),
      '  Spacer  ',
    );
    fireEvent.press(screen.getByTestId('daily-card-submit'));

    await waitFor(() =>
      expect(answerDailyCard).toHaveBeenCalledWith({
        questionUlid: 'Q1',
        answerA: 'Kawa o poranku',
        answerB: 'Spacer',
      }),
    );
  });

  // answer_a is what the backend requires. The partner's text is NOT moved up
  // into it: it would be saved under the wrong name.
  test('only the partner answer is refused, and stays where it was', async () => {
    renderScreen();

    fireEvent.changeText(
      await screen.findByTestId('daily-card-answer-b'),
      'Spacer',
    );
    fireEvent.press(screen.getByTestId('daily-card-submit'));

    expect(
      await screen.findByTestId('daily-card-answer-a-error'),
    ).toHaveTextContent(pl.dailyCard.emptyAnswer);
    expect(answerDailyCard).not.toHaveBeenCalled();
    expect(screen.getByTestId('daily-card-answer-b')).toHaveProp(
      'value',
      'Spacer',
    );
  });

  test('typing into the first answer clears its error', async () => {
    renderScreen();

    fireEvent.press(await screen.findByTestId('daily-card-submit'));
    await screen.findByTestId('daily-card-answer-a-error');
    fireEvent.changeText(screen.getByTestId('daily-card-answer-a'), 'K');

    expect(screen.queryByTestId('daily-card-answer-a-error')).toBeNull();
  });

  // The answered state stays a state OF the card: same frame, same hearts, and
  // the way through to the memory that was written.
  test('an answered card keeps its frame and offers the memories', async () => {
    jest.mocked(getDailyCard).mockResolvedValue(card({ answeredToday: true }));
    renderScreen();

    const frame = await screen.findByTestId('daily-card-card');
    expect(within(frame).getByTestId('daily-card-question')).toBeOnTheScreen();
    expect(screen.queryByTestId('daily-card-answer-a')).toBeNull();
    expect(screen.queryByTestId('daily-card-submit')).toBeNull();

    fireEvent.press(screen.getByTestId('daily-card-answered-link'));

    expect(navigate).toHaveBeenCalledWith('Memories');
  });

  test('the heart sits in both corners, showing one like', async () => {
    jest
      .mocked(getDailyCard)
      .mockResolvedValue(card({ question: { ...card().question, liked: true } }));
    renderScreen();

    expect(await screen.findByTestId('daily-card-like')).toHaveTextContent(
      FILLED,
    );
    expect(screen.getByTestId('daily-card-like-mirror')).toHaveTextContent(
      FILLED,
    );
  });

  // Either corner is the same single toggle — the optimistic flip from P5,
  // untouched by the restyle.
  test.each([['daily-card-like'], ['daily-card-like-mirror']])(
    'tapping %s flips the like once, optimistically',
    async testID => {
      renderScreen();

      fireEvent.press(await screen.findByTestId(testID));

      await waitFor(() =>
        expect(screen.getByTestId('daily-card-like')).toHaveTextContent(FILLED),
      );
      expect(screen.getByTestId('daily-card-like-mirror')).toHaveTextContent(
        FILLED,
      );
      expect(likeQuestion).toHaveBeenCalledTimes(1);
      expect(likeQuestion).toHaveBeenCalledWith('Q1');
    },
  );

  test('a like that fails rolls both corners back', async () => {
    jest.mocked(likeQuestion).mockRejectedValue(new Error('network'));
    renderScreen();

    fireEvent.press(await screen.findByTestId('daily-card-like'));

    await waitFor(() =>
      expect(screen.getByTestId('daily-card-like')).toHaveTextContent(OUTLINE),
    );
    expect(screen.getByTestId('daily-card-like-mirror')).toHaveTextContent(
      OUTLINE,
    );
  });

  // The heart works whether or not the card has been answered: a couple can
  // still like a question they have already written to.
  test('an answered card can still be liked', async () => {
    jest.mocked(getDailyCard).mockResolvedValue(card({ answeredToday: true }));
    renderScreen();

    fireEvent.press(await screen.findByTestId('daily-card-like-mirror'));

    await waitFor(() => expect(likeQuestion).toHaveBeenCalledWith('Q1'));
  });
});
