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
    jest.mocked(fetchNextQuestion).mockResolvedValue(question);
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
      ulid: 'm_01',
      question: {ulid: question.ulid, body: question.body},
      answer: 'Świetny żart w pracy.',
      answeredAt: '2026-06-02T10:00:00.000Z',
      createdAt: undefined,
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
        answer: 'Świetny żart w pracy.',
        answeredAt: expect.any(String),
      }),
    );
    // Once on mount, once after a successful save.
    await waitFor(() => expect(fetchNextQuestion).toHaveBeenCalledTimes(2));
  });
});
