import React from 'react';
import {Alert} from 'react-native';
import axios from 'axios';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {
  act,
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
import {likeQuestion, unlikeQuestion} from '../src/api/likes';
import {getProgress} from '../src/api/progress';
import {queryKeys} from '../src/queries/queryKeys';
import type {Milestone, Progress} from '../src/domain/types';
import type {RootStackParamList} from '../src/navigation/types';
import {pl} from '../src/i18n/pl';

jest.mock('../src/api/questions', () => ({fetchNextQuestion: jest.fn()}));
jest.mock('../src/api/memories', () => ({createMemory: jest.fn()}));
jest.mock('../src/api/sessions', () => ({
  getActiveSession: jest.fn(),
  endSession: jest.fn(),
  skipCurrentQuestion: jest.fn(),
}));
jest.mock('../src/api/likes', () => ({
  likeQuestion: jest.fn(),
  unlikeQuestion: jest.fn(),
}));
// A saved session card counts towards the progress map (P8), so the screen
// watches it for a milestone unlocked mid-session.
jest.mock('../src/api/progress', () => ({getProgress: jest.fn()}));

type Props = NativeStackScreenProps<RootStackParamList, 'Question'>;
type RenderProp = (p: object) => React.ReactElement;

const question = {
  ulid: 'q_01',
  body: 'Co Cię dziś rozśmieszyło?',
  type: 'session',
  category: {slug: 'na_poznanie', name: 'Na poznanie'},
  tags: [],
  liked: false,
  isLocked: false,
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
  isFavorite: false,
  playerAName: 'ola',
  playerBName: null,
  origin: 'session',
  answeredAt: '2026-06-15T20:18:00Z',
};

const milestone = (ordering: number, unlocked: boolean): Milestone => ({
  slug: `ms${ordering}`,
  name: `Kamień ${ordering}`,
  threshold: ordering * 50,
  ordering,
  unlocked,
  unlockedAt: unlocked ? '2026-07-20T18:30:00.000Z' : null,
});

// One milestone behind them, the second still ahead.
const progressBefore: Progress = {
  totalPlayed: 60,
  nextThreshold: 100,
  milestones: [milestone(1, true), milestone(2, false)],
};

// What the refetch after the save brings back — the second crossed over.
const progressAfter: Progress = {
  ...progressBefore,
  totalPlayed: 100,
  nextThreshold: null,
  milestones: [milestone(1, true), milestone(2, true)],
};

function makeProps(): Props {
  return {
    // goBack/popToTop are mocked only so the exit tests can assert they are
    // never used — a mocked navigation models no stack, so the guard against
    // the wrong action is all a screen-level test can offer here.
    navigation: {
      popTo: jest.fn(),
      replace: jest.fn(),
      navigate: jest.fn(),
      goBack: jest.fn(),
      popToTop: jest.fn(),
      setOptions: jest.fn(),
    },
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
    jest.mocked(likeQuestion).mockResolvedValue({liked: true});
    jest.mocked(unlikeQuestion).mockResolvedValue({liked: false});
    jest.mocked(getProgress).mockResolvedValue(progressBefore);
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

  // Every exit from this screen lands on Home, the hub since P4 — never on
  // CategoryPicker, which would leave the user with no way back to the daily
  // card and the weekly ritual.
  //
  // The action is popTo, not replace. Both stacks this screen can sit on settle
  // on exactly [Home]: [Home, CategoryPicker, Question] unwinds to the existing
  // Home (replace would leave [Home, CategoryPicker, Home] — a hub with a back
  // arrow), and the resume stack [Question] gets a Home created for it.
  // Only cards bought with a credit carry the mark; the 60 free ones must not,
  // or it stops meaning anything.
  test('marks a card the couple unlocked with a credit', async () => {
    jest.mocked(fetchNextQuestion).mockResolvedValue({
      question: {...question, isLocked: true},
      session,
      sessionComplete: false,
    });

    renderWithQueryClient(<QuestionScreen {...makeProps()} />);
    await screen.findByText(question.body);

    expect(screen.getByTestId('question-unlocked')).toHaveTextContent(
      pl.question.unlockedBadge,
    );
  });

  test('leaves a free question unmarked', async () => {
    renderWithQueryClient(<QuestionScreen {...makeProps()} />);
    await screen.findByText(question.body);

    expect(screen.queryByTestId('question-unlocked')).toBeNull();
  });

  test('a complete session ends it and returns to the hub', async () => {
    jest
      .mocked(fetchNextQuestion)
      .mockResolvedValue({question: null, session, sessionComplete: true});

    const props = makeProps();
    renderWithQueryClient(<QuestionScreen {...props} />);

    await waitFor(() => expect(endSession).toHaveBeenCalledWith('s_01'));
    await waitFor(() =>
      expect(props.navigation.popTo).toHaveBeenCalledWith('Home'),
    );
    expect(props.navigation.replace).not.toHaveBeenCalled();
  });

  test('the end button closes the session and returns to the hub', async () => {
    const props = makeProps();
    renderWithQueryClient(<QuestionScreen {...props} />);
    await screen.findByText(question.body);

    const header = renderHeader(props, 'headerRight');
    fireEvent.press(header.getByTestId('question-end'));

    await waitFor(() => expect(endSession).toHaveBeenCalledWith('s_01'));
    await waitFor(() =>
      expect(props.navigation.popTo).toHaveBeenCalledWith('Home'),
    );
    expect(props.navigation.replace).not.toHaveBeenCalled();
  });

  // The resume path: BootstrapScreen replaces itself with Question, so this
  // screen is the whole stack and there is no Home underneath to pop back to.
  // popTo has to create one. A mocked navigation cannot model that stack, so
  // what this pins down is the action itself: neither a bare goBack (nothing to
  // go back to when resumed) nor replace (leaves a duplicate Home when started
  // from the hub) is correct, and only popTo survives both stacks.
  test('ends the session with an action that works on the resume stack', async () => {
    const props = makeProps();
    renderWithQueryClient(<QuestionScreen {...props} />);
    await screen.findByText(question.body);

    const header = renderHeader(props, 'headerRight');
    fireEvent.press(header.getByTestId('question-end'));

    await waitFor(() =>
      expect(props.navigation.popTo).toHaveBeenCalledWith('Home'),
    );
    // Never a bare pop/goBack: with [Question] alone there is nothing to go
    // back to, and the user would be left staring at the finished session.
    expect(props.navigation.goBack).not.toHaveBeenCalled();
    expect(props.navigation.popToTop).not.toHaveBeenCalled();
  });

  test('redirects to the hub when there is no active session', async () => {
    jest.mocked(getActiveSession).mockResolvedValue(null);

    const props = makeProps();
    renderWithQueryClient(<QuestionScreen {...props} />);

    await waitFor(() =>
      expect(props.navigation.popTo).toHaveBeenCalledWith('Home'),
    );
    expect(fetchNextQuestion).not.toHaveBeenCalled();
  });

  test('a 410 on save returns to the hub (session ended server-side)', async () => {
    jest.mocked(createMemory).mockRejectedValueOnce({response: {status: 410}});
    jest.mocked(axios.isAxiosError).mockReturnValue(true);

    const props = makeProps();
    renderWithQueryClient(<QuestionScreen {...props} />);
    await screen.findByText(question.body);

    fireEvent.changeText(
      screen.getByTestId('question-answer-input'),
      'Mój żart',
    );
    fireEvent.press(screen.getByTestId('question-submit'));

    await waitFor(() =>
      expect(props.navigation.popTo).toHaveBeenCalledWith('Home'),
    );
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

  test('tapping the heart optimistically flips the local like', async () => {
    renderWithQueryClient(<QuestionScreen {...makeProps()} />);
    await screen.findByText(question.body);

    const heart = screen.getByTestId('question-like');
    expect(heart).toHaveTextContent('♡︎');

    fireEvent.press(heart);

    await waitFor(() =>
      expect(screen.getByTestId('question-like')).toHaveTextContent('♥︎'),
    );
    expect(likeQuestion).toHaveBeenCalledWith('q_01');
  });

  test('a rejected like rolls back the local state', async () => {
    jest.mocked(likeQuestion).mockRejectedValueOnce(new Error('network'));

    renderWithQueryClient(<QuestionScreen {...makeProps()} />);
    await screen.findByText(question.body);

    fireEvent.press(screen.getByTestId('question-like'));

    // Optimistically liked, then rolled back to not-liked on error.
    await waitFor(() =>
      expect(screen.getByTestId('question-like')).toHaveTextContent('♡︎'),
    );
  });

  test('a milestone unlocked by the saved card celebrates it', async () => {
    // Mount reads the map as it was; the save invalidates it (see useSaveMemory)
    // and the refetch brings the unlock.
    jest
      .mocked(getProgress)
      .mockResolvedValueOnce(progressBefore)
      .mockResolvedValue(progressAfter);

    renderWithQueryClient(<QuestionScreen {...makeProps()} />);
    await screen.findByText(question.body);

    fireEvent.changeText(screen.getByTestId('question-answer-input'), 'Mój żart');
    fireEvent.press(screen.getByTestId('question-submit'));

    expect(
      await screen.findByText(pl.celebration.milestoneBody('Kamień 2')),
    ).toBeOnTheScreen();
  });

  // Opening a session mid-journey reads a map that already has unlocks on it.
  // That is the baseline, not news.
  test('milestones already behind them are not celebrated on entry', async () => {
    jest.mocked(getProgress).mockResolvedValue(progressAfter);

    renderWithQueryClient(<QuestionScreen {...makeProps()} />);
    await screen.findByText(question.body);

    await waitFor(() => expect(getProgress).toHaveBeenCalled());
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    expect(screen.queryByTestId('celebration')).toBeNull();
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
