import React from 'react';
import {Alert} from 'react-native';
import axios from 'axios';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import {renderWithQueryClient} from '../src/test/renderWithQueryClient';
import {ThemeProvider} from '../src/theme';
import {QuestionScreen} from '../src/screens/QuestionScreen';
import {fetchNextQuestion} from '../src/api/questions';
import {createMemory} from '../src/api/memories';
import {
  endSession,
  getActiveSession,
  skipCurrentQuestion,
} from '../src/api/sessions';
import {queryKeys} from '../src/queries/queryKeys';
import type {RootStackParamList} from '../src/navigation/types';
import {pl} from '../src/i18n/pl';

jest.mock('../src/api/questions', () => ({fetchNextQuestion: jest.fn()}));
jest.mock('../src/api/memories', () => ({createMemory: jest.fn()}));
jest.mock('../src/api/sessions', () => ({
  getActiveSession: jest.fn(),
  endSession: jest.fn(),
  skipCurrentQuestion: jest.fn(),
}));

type Props = NativeStackScreenProps<RootStackParamList, 'Question'>;
type RenderProp = (p: object) => React.ReactElement;

const question = {
  ulid: 'q_01',
  body: 'Co Cię dziś rozśmieszyło?',
  type: 'session',
  category: {slug: 'na_poznanie', name: 'Na poznanie'},
  tags: [],
};

const session = {
  ulid: 's_01',
  mode: 'local',
  category: {slug: 'na_poznanie', name: 'Na poznanie'},
  startedAt: '2026-06-15T20:14:00Z',
  endedAt: null,
  currentIndex: 0,
  remainingCount: 20,
  cardsDrawnCount: 0,
  cardsSavedCount: 0,
};

const memory = {
  ulid: 'm_01',
  question,
  answerA: 'Mój żart',
  answerB: null,
  playerAName: 'ola',
  playerBName: null,
  origin: 'session',
  answeredAt: '2026-06-15T20:18:00Z',
};

function makeProps(): Props {
  return {
    navigation: {replace: jest.fn(), navigate: jest.fn(), setOptions: jest.fn()},
    route: {key: 'Question', name: 'Question', params: {sessionUlid: 's_01'}},
  } as unknown as Props;
}

// Pulls the latest navigation.setOptions payload and renders one of its header
// render props (the real navigator isn't mounted under Jest).
function renderHeader(props: Props, key: 'headerTitle' | 'headerRight') {
  const calls = jest.mocked(props.navigation.setOptions).mock.calls;
  const opts = calls[calls.length - 1][0];
  // The header title uses SectionLabel (useTheme), so wrap in ThemeProvider.
  return render(
    <ThemeProvider>{(opts[key] as unknown as RenderProp)({})}</ThemeProvider>,
  );
}

describe('QuestionScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getActiveSession).mockResolvedValue(session);
    jest
      .mocked(fetchNextQuestion)
      .mockResolvedValue({question, session, sessionComplete: false});
    jest.mocked(createMemory).mockResolvedValue({memory, session});
    jest.mocked(skipCurrentQuestion).mockResolvedValue(session);
    jest.mocked(endSession).mockResolvedValue(undefined);
    jest.mocked(axios.isAxiosError).mockReturnValue(false);
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  test('renders the question from the active session with header label and counter', async () => {
    const props = makeProps();
    renderWithQueryClient(<QuestionScreen {...props} />);

    expect(await screen.findByText(question.body)).toBeOnTheScreen();
    // Counter lives in the body next to the progress bar.
    expect(screen.getByTestId('question-counter')).toHaveTextContent(
      pl.question.counter(1, 20),
    );

    // Header shows the category label; caps is visual (textTransform), so the
    // text content stays the original label.
    const header = renderHeader(props, 'headerTitle');
    expect(header.getByTestId('question-progress')).toHaveTextContent(
      'Na poznanie',
    );
  });

  test('submitting saves a memory and fetches the next question', async () => {
    renderWithQueryClient(<QuestionScreen {...makeProps()} />);
    await screen.findByText(question.body);

    fireEvent.changeText(screen.getByTestId('question-answer-input'), 'Mój żart');
    fireEvent.press(screen.getByTestId('question-submit'));

    await waitFor(() =>
      expect(createMemory).toHaveBeenCalledWith({
        questionUlid: 'q_01',
        answerA: 'Mój żart',
        answerB: null,
        answeredAt: expect.any(String),
      }),
    );
    // Once on mount, once after the successful save.
    await waitFor(() => expect(fetchNextQuestion).toHaveBeenCalledTimes(2));
  });

  test('skipping calls the endpoint and fetches the next question', async () => {
    renderWithQueryClient(<QuestionScreen {...makeProps()} />);
    await screen.findByText(question.body);

    fireEvent.press(screen.getByTestId('question-skip'));

    await waitFor(() =>
      expect(skipCurrentQuestion).toHaveBeenCalledWith('s_01'),
    );
    await waitFor(() => expect(fetchNextQuestion).toHaveBeenCalledTimes(2));
  });

  test('a complete session ends it and returns to the picker', async () => {
    jest
      .mocked(fetchNextQuestion)
      .mockResolvedValue({question: null, session, sessionComplete: true});

    const props = makeProps();
    renderWithQueryClient(<QuestionScreen {...props} />);

    await waitFor(() => expect(endSession).toHaveBeenCalledWith('s_01'));
    await waitFor(() =>
      expect(props.navigation.replace).toHaveBeenCalledWith('CategoryPicker'),
    );
  });

  test('the end button closes the session and navigates back', async () => {
    const props = makeProps();
    renderWithQueryClient(<QuestionScreen {...props} />);
    await screen.findByText(question.body);

    const header = renderHeader(props, 'headerRight');
    fireEvent.press(header.getByTestId('question-end'));

    await waitFor(() => expect(endSession).toHaveBeenCalledWith('s_01'));
    await waitFor(() =>
      expect(props.navigation.replace).toHaveBeenCalledWith('CategoryPicker'),
    );
  });

  test('redirects to the picker when there is no active session', async () => {
    jest.mocked(getActiveSession).mockResolvedValue(null);

    const props = makeProps();
    renderWithQueryClient(<QuestionScreen {...props} />);

    await waitFor(() =>
      expect(props.navigation.replace).toHaveBeenCalledWith('CategoryPicker'),
    );
    expect(fetchNextQuestion).not.toHaveBeenCalled();
  });

  test('a 409 on save refetches the question (race resolved)', async () => {
    jest.mocked(createMemory).mockRejectedValueOnce({response: {status: 409}});
    jest.mocked(axios.isAxiosError).mockReturnValue(true);

    const props = makeProps();
    renderWithQueryClient(<QuestionScreen {...props} />);
    await screen.findByText(question.body);

    fireEvent.changeText(screen.getByTestId('question-answer-input'), 'Mój żart');
    fireEvent.press(screen.getByTestId('question-submit'));

    await waitFor(() => expect(createMemory).toHaveBeenCalled());
    // mount fetch + refetch triggered by the 409 handler.
    await waitFor(() => expect(fetchNextQuestion).toHaveBeenCalledTimes(2));
    expect(props.navigation.replace).not.toHaveBeenCalled();
  });

  test('a 422 on save shows an inline error', async () => {
    jest.mocked(createMemory).mockRejectedValueOnce({
      response: {
        status: 422,
        data: {
          message: 'Odpowiedź jest wymagana.',
          errors: {answer_a: ['Odpowiedź jest wymagana.']},
        },
      },
    });
    jest.mocked(axios.isAxiosError).mockReturnValue(true);

    renderWithQueryClient(<QuestionScreen {...makeProps()} />);
    await screen.findByText(question.body);

    fireEvent.changeText(screen.getByTestId('question-answer-input'), 'cokolwiek');
    fireEvent.press(screen.getByTestId('question-submit'));

    expect(await screen.findByTestId('question-error')).toHaveTextContent(
      'Odpowiedź jest wymagana.',
    );
  });

  test('saving a memory invalidates the cached memories list', async () => {
    const {queryClient} = renderWithQueryClient(<QuestionScreen {...makeProps()} />);
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    await screen.findByText(question.body);

    fireEvent.changeText(screen.getByTestId('question-answer-input'), 'Mój żart');
    fireEvent.press(screen.getByTestId('question-submit'));

    await waitFor(() =>
      expect(invalidateSpy).toHaveBeenCalledWith({queryKey: queryKeys.memories}),
    );
  });
});
