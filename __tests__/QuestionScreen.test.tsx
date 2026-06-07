import React from 'react';
import {Alert} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import {QuestionScreen} from '../src/screens/QuestionScreen';
import {fetchNextQuestion} from '../src/api/questions';
import {createMemory} from '../src/api/memories';
import type {RootStackParamList} from '../src/navigation/types';
import {pl} from '../src/i18n/pl';

jest.mock('../src/api/questions', () => ({fetchNextQuestion: jest.fn()}));
jest.mock('../src/api/memories', () => ({createMemory: jest.fn()}));

type Props = NativeStackScreenProps<RootStackParamList, 'Question'>;

const question = {
  ulid: 'q_01',
  body: 'Co Cię dziś rozśmieszyło?',
  type: 'session',
  category: {slug: 'na_poznanie', name: 'Na poznanie'},
  tags: ['niespodzianki'],
};

const session = {
  ulid: 's_01',
  mode: 'local',
  category: {slug: 'na_poznanie', name: 'Na poznanie'},
  startedAt: '2026-06-02T09:00:00.000Z',
  endedAt: null,
  currentIndex: 1,
  remainingCount: 20,
  cardsDrawnCount: 1,
  cardsSavedCount: 1,
};

function makeProps(): Props {
  return {
    navigation: {setOptions: jest.fn(), navigate: jest.fn()},
    route: {key: 'Question', name: 'Question', params: undefined},
  } as unknown as Props;
}

describe('QuestionScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(fetchNextQuestion).mockResolvedValue({
      question,
      session,
      sessionComplete: false,
    });
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  test('loads and displays the next question body', async () => {
    render(<QuestionScreen {...makeProps()} />);

    expect(await screen.findByText(question.body)).toBeOnTheScreen();
    expect(fetchNextQuestion).toHaveBeenCalledTimes(1);
  });

  test('does not save when the answer is empty', async () => {
    render(<QuestionScreen {...makeProps()} />);
    await screen.findByText(question.body);

    fireEvent.press(screen.getByText(pl.question.save));

    expect(createMemory).not.toHaveBeenCalled();
    expect(Alert.alert).toHaveBeenCalledWith(
      pl.appTitle,
      pl.question.emptyAnswer,
    );
  });

  test('saves a memory and loads the next question', async () => {
    jest.mocked(createMemory).mockResolvedValue({
      memory: {
        ulid: 'm_01',
        question,
        answerA: 'Świetny żart w pracy.',
        answerB: null,
        playerAName: 'ola',
        playerBName: null,
        origin: 'session',
        answeredAt: '2026-06-02T10:00:00.000Z',
      },
      session,
    });

    render(<QuestionScreen {...makeProps()} />);
    await screen.findByText(question.body);

    fireEvent.changeText(
      screen.getByPlaceholderText(pl.question.answerPlaceholder),
      'Świetny żart w pracy.',
    );
    fireEvent.press(screen.getByText(pl.question.save));

    await waitFor(() =>
      expect(createMemory).toHaveBeenCalledWith({
        questionUlid: question.ulid,
        answerA: 'Świetny żart w pracy.',
        answerB: null,
        answeredAt: expect.any(String),
      }),
    );
    // Once on mount, once after a successful save.
    await waitFor(() => expect(fetchNextQuestion).toHaveBeenCalledTimes(2));
  });
});
