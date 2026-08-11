import React from 'react';
import {Alert, AlertButton} from 'react-native';
import axios from 'axios';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {act, fireEvent, screen, waitFor} from '@testing-library/react-native';
import {renderWithQueryClient} from '../src/test/renderWithQueryClient';
import {MemoryCardScreen} from '../src/screens/MemoryCardScreen';
import {
  deleteMemory,
  getMemory,
  setMemoryFavorite,
  updateMemory,
} from '../src/api/memories';
import type {Memory} from '../src/domain/types';
import type {RootStackParamList} from '../src/navigation/types';
import {pl} from '../src/i18n/pl';

jest.mock('../src/api/memories', () => ({
  getMemory: jest.fn(),
  setMemoryFavorite: jest.fn(),
  updateMemory: jest.fn(),
  deleteMemory: jest.fn(),
}));

type Props = NativeStackScreenProps<RootStackParamList, 'MemoryCard'>;

const memory: Memory = {
  ulid: 'm_01',
  question: {
    ulid: 'q_01',
    body: 'Co Cię dziś rozśmieszyło?',
    type: 'session',
    category: {slug: 'na_poznanie', name: 'Na poznanie'},
    tags: [],
    options: null,
    liked: false,
    isLocked: false,
  },
  answerA: 'Świetny żart w pracy.',
  answerB: 'Mój też był niezły.',
  isFavorite: false,
  playerAName: 'ola',
  playerBName: 'Tomek',
  origin: 'session',
  answeredAt: '2026-06-02T10:00:00.000Z',
};

function makeProps() {
  const navigation = {
    setOptions: jest.fn(),
    goBack: jest.fn(),
    replace: jest.fn(),
    navigate: jest.fn(),
  };
  const props = {
    navigation,
    route: {
      key: 'MemoryCard',
      name: 'MemoryCard',
      params: {memoryUlid: 'm_01'},
    },
  } as unknown as Props;
  return {props, navigation};
}

describe('MemoryCardScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getMemory).mockResolvedValue(memory);
    jest.mocked(axios.isAxiosError).mockReturnValue(false);
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  test('renders the whole card: question, both answers, origin', async () => {
    const {props} = makeProps();

    renderWithQueryClient(<MemoryCardScreen {...props} />);

    expect(await screen.findByTestId('memory-card-question')).toHaveTextContent(
      'Co Cię dziś rozśmieszyło?',
    );
    expect(screen.getByTestId('memory-card-answer-a')).toHaveTextContent(
      'Świetny żart w pracy.',
    );
    expect(screen.getByTestId('memory-card-answer-b')).toHaveTextContent(
      'Mój też był niezły.',
    );
    expect(screen.getByTestId('memory-card-origin')).toHaveTextContent(
      pl.memories.origin.session,
    );
    expect(getMemory).toHaveBeenCalledWith('m_01');
  });

  test('the heart hearts an unhearted memory', async () => {
    const {props} = makeProps();
    jest
      .mocked(setMemoryFavorite)
      .mockResolvedValue({...memory, isFavorite: true});

    renderWithQueryClient(<MemoryCardScreen {...props} />);
    fireEvent.press(await screen.findByTestId('memory-card-favorite'));

    await waitFor(() =>
      expect(setMemoryFavorite).toHaveBeenCalledWith('m_01', true),
    );
  });

  // The contract is a full replacement, so both answers travel on every save.
  test('saving sends both answers', async () => {
    const {props} = makeProps();
    jest.mocked(updateMemory).mockResolvedValue(memory);

    renderWithQueryClient(<MemoryCardScreen {...props} />);
    fireEvent.press(await screen.findByTestId('memory-card-edit'));
    fireEvent.changeText(
      screen.getByTestId('memory-card-answer-a-input'),
      'Poprawiona odpowiedź.',
    );
    fireEvent.press(screen.getByTestId('memory-card-save'));

    await waitFor(() =>
      expect(updateMemory).toHaveBeenCalledWith('m_01', {
        answerA: 'Poprawiona odpowiedź.',
        answerB: 'Mój też był niezły.',
      }),
    );
  });

  // Clearing the partner's field is a real intent ("they said nothing"), and the
  // backend only hears it as an explicit null.
  test('an emptied partner answer is sent as null', async () => {
    const {props} = makeProps();
    jest.mocked(updateMemory).mockResolvedValue({...memory, answerB: null});

    renderWithQueryClient(<MemoryCardScreen {...props} />);
    fireEvent.press(await screen.findByTestId('memory-card-edit'));
    fireEvent.changeText(screen.getByTestId('memory-card-answer-b-input'), '  ');
    fireEvent.press(screen.getByTestId('memory-card-save'));

    await waitFor(() =>
      expect(updateMemory).toHaveBeenCalledWith('m_01', {
        answerA: 'Świetny żart w pracy.',
        answerB: null,
      }),
    );
  });

  test('an empty own answer is refused before any request', async () => {
    const {props} = makeProps();

    renderWithQueryClient(<MemoryCardScreen {...props} />);
    fireEvent.press(await screen.findByTestId('memory-card-edit'));
    fireEvent.changeText(screen.getByTestId('memory-card-answer-a-input'), '   ');
    fireEvent.press(screen.getByTestId('memory-card-save'));

    expect(
      await screen.findByTestId('memory-card-answer-a-input-error'),
    ).toHaveTextContent(pl.memoryCard.emptyAnswer);
    expect(updateMemory).not.toHaveBeenCalled();
  });

  test('a 422 shows the field error from the backend', async () => {
    const {props} = makeProps();
    jest.mocked(axios.isAxiosError).mockReturnValue(true);
    jest.mocked(updateMemory).mockRejectedValue({
      response: {
        status: 422,
        data: {
          message: 'Popraw odpowiedź.',
          errors: {answer_a: ['Odpowiedź jest za długa.']},
        },
      },
    });

    renderWithQueryClient(<MemoryCardScreen {...props} />);
    fireEvent.press(await screen.findByTestId('memory-card-edit'));
    fireEvent.press(screen.getByTestId('memory-card-save'));

    expect(
      await screen.findByTestId('memory-card-answer-a-input-error'),
    ).toHaveTextContent('Odpowiedź jest za długa.');
    expect(screen.getByTestId('memory-card-error')).toHaveTextContent(
      'Popraw odpowiedź.',
    );
  });

  test('cancelling an edit leaves the memory as it was', async () => {
    const {props} = makeProps();

    renderWithQueryClient(<MemoryCardScreen {...props} />);
    fireEvent.press(await screen.findByTestId('memory-card-edit'));
    fireEvent.changeText(
      screen.getByTestId('memory-card-answer-a-input'),
      'Niedokończona zmiana',
    );
    fireEvent.press(screen.getByTestId('memory-card-cancel'));

    expect(await screen.findByTestId('memory-card-answer-a')).toHaveTextContent(
      'Świetny żart w pracy.',
    );
    expect(updateMemory).not.toHaveBeenCalled();
  });

  test('deleting asks first, then removes and leaves the screen', async () => {
    const {props, navigation} = makeProps();
    jest.mocked(deleteMemory).mockResolvedValue(undefined);
    // Take the destructive button, the way a user tapping "Usuń" would.
    jest
      .spyOn(Alert, 'alert')
      .mockImplementation((_title, _message, buttons?: AlertButton[]) => {
        buttons?.find(button => button.style === 'destructive')?.onPress?.();
      });

    renderWithQueryClient(<MemoryCardScreen {...props} />);
    fireEvent.press(await screen.findByTestId('memory-card-delete'));

    await waitFor(() => expect(deleteMemory).toHaveBeenCalledWith('m_01'));
    await waitFor(() => expect(navigation.goBack).toHaveBeenCalled());
  });

  test('dismissing the confirmation deletes nothing', async () => {
    const {props, navigation} = makeProps();
    jest
      .spyOn(Alert, 'alert')
      .mockImplementation((_title, _message, buttons?: AlertButton[]) => {
        buttons?.find(button => button.style === 'cancel')?.onPress?.();
      });

    renderWithQueryClient(<MemoryCardScreen {...props} />);
    fireEvent.press(await screen.findByTestId('memory-card-delete'));

    expect(deleteMemory).not.toHaveBeenCalled();
    expect(navigation.goBack).not.toHaveBeenCalled();
  });

  // Two failures, two answers (P11 split). A 404 means the memory is gone —
  // most often a push pointing at something since deleted — and there is
  // nothing a retry could fix, so the P9 bounce to the list stands. Anything
  // else is about the request, and landing on a list that is about to fail the
  // same way helps nobody.
  test('a deleted memory (404) falls back to the list', async () => {
    const {props, navigation} = makeProps();
    const gone = {isAxiosError: true, response: {status: 404, data: {}}};
    jest.mocked(axios.isAxiosError).mockImplementation(err => err === gone);
    jest.mocked(getMemory).mockRejectedValue(gone);

    renderWithQueryClient(<MemoryCardScreen {...props} />);

    await waitFor(() =>
      expect(navigation.replace).toHaveBeenCalledWith('Memories'),
    );
    expect(Alert.alert).toHaveBeenCalledWith(
      pl.appTitle,
      pl.memoryCard.loadError,
    );
    // And never flashes the retry panel on its way out.
    expect(screen.queryByTestId('memory-card-load-error')).toBeNull();
    await act(async () => {
      await Promise.resolve();
    });
  });

  test('a lost connection stays put and offers a retry', async () => {
    const {props, navigation} = makeProps();
    const offline = {isAxiosError: true, response: undefined};
    jest.mocked(axios.isAxiosError).mockImplementation(err => err === offline);
    jest.mocked(getMemory).mockRejectedValue(offline);

    renderWithQueryClient(<MemoryCardScreen {...props} />);

    expect(
      await screen.findByTestId('memory-card-load-error'),
    ).toBeOnTheScreen();
    expect(screen.getByText(pl.common.networkError)).toBeOnTheScreen();
    expect(navigation.replace).not.toHaveBeenCalled();
  });

  test('a server error stays put too', async () => {
    const {props, navigation} = makeProps();
    const broken = {isAxiosError: true, response: {status: 500, data: {}}};
    jest.mocked(axios.isAxiosError).mockImplementation(err => err === broken);
    jest.mocked(getMemory).mockRejectedValue(broken);

    renderWithQueryClient(<MemoryCardScreen {...props} />);

    expect(await screen.findByText(pl.common.serverError)).toBeOnTheScreen();
    expect(navigation.replace).not.toHaveBeenCalled();
  });

  test('retry re-reads the memory', async () => {
    const {props} = makeProps();
    const offline = {isAxiosError: true, response: undefined};
    jest.mocked(axios.isAxiosError).mockImplementation(err => err === offline);
    jest.mocked(getMemory).mockRejectedValueOnce(offline);

    renderWithQueryClient(<MemoryCardScreen {...props} />);
    await screen.findByTestId('memory-card-load-error');

    jest.mocked(getMemory).mockResolvedValue(memory);
    fireEvent.press(screen.getByTestId('memory-card-load-error-retry'));

    expect(await screen.findByTestId('memory-card-question')).toBeOnTheScreen();
    await waitFor(() => expect(getMemory).toHaveBeenCalledTimes(2));
  });
});
