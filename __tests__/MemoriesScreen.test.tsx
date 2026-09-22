import React from 'react';
import axios from 'axios';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {act, fireEvent, screen, waitFor} from '@testing-library/react-native';
import {renderWithQueryClient} from '../src/test/renderWithQueryClient';
import {MemoriesScreen} from '../src/screens/MemoriesScreen';
import {listMemories, setMemoryFavorite} from '../src/api/memories';
import {listLikedQuestions} from '../src/api/questions';
import {useAuth} from '../src/auth/AuthContext';
import type {RootStackParamList} from '../src/navigation/types';
import type {Memory} from '../src/domain/types';
import {pl} from '../src/i18n/pl';

jest.mock('../src/api/memories', () => ({
  listMemories: jest.fn(),
  setMemoryFavorite: jest.fn(),
}));
jest.mock('../src/auth/AuthContext', () => ({useAuth: jest.fn()}));
jest.mock('../src/api/questions', () => ({listLikedQuestions: jest.fn()}));

type Props = NativeStackScreenProps<RootStackParamList, 'Memories'>;

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
  answerB: null,
  isFavorite: false,
  playerAName: 'ola',
  playerBName: null,
  origin: 'session',
  answeredAt: '2026-06-02T10:00:00.000Z',
};

function makeProps(): Props {
  return {
    navigation: {setOptions: jest.fn(), navigate: jest.fn()},
    route: {key: 'Memories', name: 'Memories', params: undefined},
  } as unknown as Props;
}

describe('MemoriesScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(axios.isAxiosError).mockReturnValue(false);
    jest.mocked(listLikedQuestions).mockResolvedValue({
      questions: [],
      nextCursor: null,
      prevCursor: null,
    });
    jest.mocked(useAuth).mockReturnValue({
      user: null,
      couple: null,
      token: 'tok',
      loading: false,
      login: jest.fn(),
      register: jest.fn(),
      signInWithGoogle: jest.fn(),
      signInWithApple: jest.fn(),
      logout: jest.fn(),
      signOutLocally: jest.fn(),
      refreshUser: jest.fn(),
      setUser: jest.fn(),
      setCouple: jest.fn(),
    });
  });

  test('renders a card for each memory from the API', async () => {
    jest
      .mocked(listMemories)
      .mockResolvedValue({memories: [memory], nextCursor: null, prevCursor: null});

    renderWithQueryClient(<MemoriesScreen {...makeProps()} />);

    expect(await screen.findByText(memory.answerA)).toBeOnTheScreen();
    expect(screen.getByText(memory.question.body)).toBeOnTheScreen();
  });

  test('shows the empty state when there are no memories', async () => {
    jest
      .mocked(listMemories)
      .mockResolvedValue({memories: [], nextCursor: null, prevCursor: null});

    renderWithQueryClient(<MemoriesScreen {...makeProps()} />);

    expect(await screen.findByText(pl.memories.empty)).toBeOnTheScreen();
  });

  test('renders only player A when there is no answer B', async () => {
    jest
      .mocked(listMemories)
      .mockResolvedValue({memories: [memory], nextCursor: null, prevCursor: null});

    renderWithQueryClient(<MemoriesScreen {...makeProps()} />);

    expect(await screen.findByTestId('memory-player-a-m_01')).toHaveTextContent(
      'Świetny żart w pracy.',
    );
    expect(screen.getByText(pl.memories.player('ola'))).toBeOnTheScreen();
    expect(screen.queryByTestId('memory-player-b-m_01')).toBeNull();
  });

  test('renders both players when answer B is present', async () => {
    const both: Memory = {
      ...memory,
      ulid: 'm_02',
      answerB: 'Druga odpowiedź.',
      playerBName: 'Tomek',
    };
    jest
      .mocked(listMemories)
      .mockResolvedValue({memories: [both], nextCursor: null, prevCursor: null});

    renderWithQueryClient(<MemoriesScreen {...makeProps()} />);

    expect(await screen.findByTestId('memory-player-a-m_02')).toHaveTextContent(
      'Świetny żart w pracy.',
    );
    expect(screen.getByTestId('memory-player-b-m_02')).toHaveTextContent(
      'Druga odpowiedź.',
    );
    expect(screen.getByText(pl.memories.player('Tomek'))).toBeOnTheScreen();
  });

  test('renders the Polish label for each origin', async () => {
    const memories: Memory[] = [
      {...memory, ulid: 'm_s', origin: 'session'},
      {...memory, ulid: 'm_d', origin: 'daily'},
      {...memory, ulid: 'm_c', origin: 'challenge'},
    ];
    jest
      .mocked(listMemories)
      .mockResolvedValue({memories, nextCursor: null, prevCursor: null});

    renderWithQueryClient(<MemoriesScreen {...makeProps()} />);

    expect(await screen.findByTestId('memory-origin-m_s')).toHaveTextContent(
      pl.memories.origin.session,
    );
    expect(screen.getByTestId('memory-origin-m_d')).toHaveTextContent(
      pl.memories.origin.daily,
    );
    expect(screen.getByTestId('memory-origin-m_c')).toHaveTextContent(
      pl.memories.origin.challenge,
    );
  });

  test('pull-to-refresh refetches the list', async () => {
    jest
      .mocked(listMemories)
      .mockResolvedValue({memories: [memory], nextCursor: null, prevCursor: null});

    renderWithQueryClient(<MemoriesScreen {...makeProps()} />);
    await screen.findByText(memory.answerA);
    expect(listMemories).toHaveBeenCalledTimes(1);

    fireEvent(screen.getByTestId('memories-list'), 'refresh');

    await waitFor(() => expect(listMemories).toHaveBeenCalledTimes(2));
  });

  test('tapping a card opens it in full', async () => {
    const props = makeProps();
    jest
      .mocked(listMemories)
      .mockResolvedValue({memories: [memory], nextCursor: null, prevCursor: null});

    renderWithQueryClient(<MemoriesScreen {...props} />);
    fireEvent.press(await screen.findByTestId('memory-item-m_01'));

    expect(props.navigation.navigate).toHaveBeenCalledWith('MemoryCard', {
      memoryUlid: 'm_01',
    });
  });

  test('the heart on a card hearts that memory', async () => {
    jest
      .mocked(listMemories)
      .mockResolvedValue({memories: [memory], nextCursor: null, prevCursor: null});
    jest
      .mocked(setMemoryFavorite)
      .mockResolvedValue({...memory, isFavorite: true});

    renderWithQueryClient(<MemoriesScreen {...makeProps()} />);
    const heart = await screen.findByTestId('memory-favorite-m_01');
    expect(heart).toHaveTextContent('♡︎');

    fireEvent.press(heart);

    // Flips before the request settles (optimistic), and stays hearted after.
    await waitFor(() =>
      expect(screen.getByTestId('memory-favorite-m_01')).toHaveTextContent('♥︎'),
    );
    expect(setMemoryFavorite).toHaveBeenCalledWith('m_01', true);
    await act(async () => {
      await Promise.resolve();
    });
  });

  test('a rejected heart rolls back', async () => {
    jest
      .mocked(listMemories)
      .mockResolvedValue({memories: [memory], nextCursor: null, prevCursor: null});
    jest.mocked(setMemoryFavorite).mockRejectedValue(new Error('network'));

    renderWithQueryClient(<MemoriesScreen {...makeProps()} />);
    fireEvent.press(await screen.findByTestId('memory-favorite-m_01'));

    await waitFor(() =>
      expect(screen.getByTestId('memory-favorite-m_01')).toHaveTextContent('♡︎'),
    );
  });

  // The filter is a separate query, not a client-side filter of one list.
  test('the favourites filter asks the server for the narrowed list', async () => {
    jest
      .mocked(listMemories)
      .mockResolvedValue({memories: [memory], nextCursor: null, prevCursor: null});

    renderWithQueryClient(<MemoriesScreen {...makeProps()} />);
    await screen.findByText(memory.answerA);
    expect(listMemories).toHaveBeenCalledWith({
      cursor: undefined,
      favoritesOnly: false,
    });

    fireEvent.press(screen.getByTestId('memories-favorites-filter'));

    await waitFor(() =>
      expect(listMemories).toHaveBeenCalledWith({
        cursor: undefined,
        favoritesOnly: true,
      }),
    );
  });

  test('the filtered list has an empty state of its own', async () => {
    jest
      .mocked(listMemories)
      .mockResolvedValueOnce({
        memories: [memory],
        nextCursor: null,
        prevCursor: null,
      })
      .mockResolvedValue({memories: [], nextCursor: null, prevCursor: null});

    renderWithQueryClient(<MemoriesScreen {...makeProps()} />);
    await screen.findByText(memory.answerA);

    fireEvent.press(screen.getByTestId('memories-favorites-filter'));

    expect(
      await screen.findByText(pl.memories.emptyFavorites),
    ).toBeOnTheScreen();
    expect(screen.queryByText(pl.memories.empty)).toBeNull();
  });

  // P11. Until now a failed load fired an alert and left the couple on a list
  // that said "you have no memories yet" — the two states were impossible to
  // tell apart, and there was no way to try again short of leaving the screen.
  describe('when the list cannot be loaded', () => {
    test('shows the error state rather than the empty one', async () => {
      jest.mocked(listMemories).mockRejectedValue(new Error('network'));

      renderWithQueryClient(<MemoriesScreen {...makeProps()} />);

      expect(await screen.findByTestId('memories-error')).toBeOnTheScreen();
      expect(screen.getByText(pl.memories.loadError)).toBeOnTheScreen();
      expect(screen.queryByTestId('memories-empty')).toBeNull();
      expect(screen.queryByText(pl.memories.empty)).toBeNull();
    });

    test('a lost connection says so instead of blaming the list', async () => {
      const offline = {isAxiosError: true, response: undefined};
      jest
        .mocked(axios.isAxiosError)
        .mockImplementation(err => err === offline);
      jest.mocked(listMemories).mockRejectedValue(offline);

      renderWithQueryClient(<MemoriesScreen {...makeProps()} />);

      expect(await screen.findByText(pl.common.networkError)).toBeOnTheScreen();
      expect(screen.queryByText(pl.memories.loadError)).toBeNull();
    });

    test('retry asks the server again and the list recovers', async () => {
      jest.mocked(listMemories).mockRejectedValueOnce(new Error('network'));

      renderWithQueryClient(<MemoriesScreen {...makeProps()} />);
      await screen.findByTestId('memories-error');

      jest.mocked(listMemories).mockResolvedValue({
        memories: [memory],
        nextCursor: null,
        prevCursor: null,
      });
      fireEvent.press(screen.getByTestId('memories-error-retry'));

      expect(await screen.findByText(memory.answerA)).toBeOnTheScreen();
      await waitFor(() => expect(listMemories).toHaveBeenCalledTimes(2));
    });

    test('a failed further page keeps the memories already on screen', async () => {
      jest
        .mocked(listMemories)
        .mockResolvedValueOnce({
          memories: [memory],
          nextCursor: 'cursor-2',
          prevCursor: null,
        })
        .mockRejectedValueOnce(new Error('network'));

      renderWithQueryClient(<MemoriesScreen {...makeProps()} />);
      await screen.findByText(memory.answerA);

      fireEvent(screen.getByTestId('memories-list'), 'onEndReached');

      // The failure lands in the footer, not over the list.
      expect(
        await screen.findByTestId('memories-page-error'),
      ).toBeOnTheScreen();
      expect(screen.getByText(memory.answerA)).toBeOnTheScreen();
      expect(screen.queryByTestId('memories-error')).toBeNull();
    });
  });

  // A hearted QUESTION (P5) and a favourite MEMORY (P9) are two different things
  // under one icon, so they get two tabs rather than one merged list. Wiktoria's
  // split, and the one her web version has.
  test('offers both halves of the history as tabs', async () => {
    jest
      .mocked(listMemories)
      .mockResolvedValue({memories: [memory], nextCursor: null, prevCursor: null});

    renderWithQueryClient(<MemoriesScreen {...makeProps()} />);

    expect(await screen.findByTestId('history-tab-questions')).toHaveTextContent(
      pl.memories.tabQuestions,
    );
    expect(screen.getByTestId('history-tab-memories')).toHaveTextContent(
      pl.memories.tabMemories,
    );
    // Memories are what this screen has always been, so they stay the landing tab.
    expect(await screen.findByText(memory.answerA)).toBeOnTheScreen();
  });

  test('the questions tab shows the hearted cards', async () => {
    jest
      .mocked(listMemories)
      .mockResolvedValue({memories: [memory], nextCursor: null, prevCursor: null});
    jest.mocked(listLikedQuestions).mockResolvedValue({
      questions: [{...memory.question, liked: true}],
      nextCursor: null,
      prevCursor: null,
    });

    renderWithQueryClient(<MemoriesScreen {...makeProps()} />);
    fireEvent.press(await screen.findByTestId('history-tab-questions'));

    expect(
      await screen.findByTestId('liked-question-body-q_01'),
    ).toHaveTextContent(memory.question.body);
    expect(listLikedQuestions).toHaveBeenCalled();
  });

  // Not a white screen: an empty favourites list is a normal state with
  // something to say, and it says how to stop being empty.
  test('an empty questions tab explains itself', async () => {
    jest
      .mocked(listMemories)
      .mockResolvedValue({memories: [memory], nextCursor: null, prevCursor: null});

    renderWithQueryClient(<MemoriesScreen {...makeProps()} />);
    fireEvent.press(await screen.findByTestId('history-tab-questions'));

    expect(await screen.findByTestId('liked-questions-empty')).toHaveTextContent(
      pl.memories.likedEmpty,
    );
  });

  // "It broke" and "there is nothing here" must not look the same — otherwise a
  // dead connection reads as an invitation to tap a heart.
  test('a failed questions tab reads as a failure, not as emptiness', async () => {
    jest
      .mocked(listMemories)
      .mockResolvedValue({memories: [memory], nextCursor: null, prevCursor: null});
    jest.mocked(listLikedQuestions).mockRejectedValue(new Error('offline'));

    renderWithQueryClient(<MemoriesScreen {...makeProps()} />);
    fireEvent.press(await screen.findByTestId('history-tab-questions'));

    expect(await screen.findByTestId('liked-questions-error')).toBeOnTheScreen();
    expect(screen.queryByTestId('liked-questions-empty')).toBeNull();
  });

  // is_locked on this list means "a paid card you own": the backend drops
  // hearted cards the couple has not unlocked before it pages, so there is no
  // withheld state. The body shows, with the same badge play uses.
  test('a paid card shows its text with the unlocked badge', async () => {
    jest
      .mocked(listMemories)
      .mockResolvedValue({memories: [memory], nextCursor: null, prevCursor: null});
    jest.mocked(listLikedQuestions).mockResolvedValue({
      questions: [{...memory.question, liked: true, isLocked: true}],
      nextCursor: null,
      prevCursor: null,
    });

    renderWithQueryClient(<MemoriesScreen {...makeProps()} />);
    fireEvent.press(await screen.findByTestId('history-tab-questions'));

    expect(
      await screen.findByTestId('liked-question-body-q_01'),
    ).toHaveTextContent(memory.question.body);
    expect(
      screen.getByTestId('liked-question-unlocked-q_01'),
    ).toHaveTextContent(pl.question.unlockedBadge);
  });

  // Read-only in this slice: the list closes the hole on its own, and unhearting
  // from here would need a second write path (see useLikeQuestion).
  test('the questions tab carries no actions', async () => {
    jest
      .mocked(listMemories)
      .mockResolvedValue({memories: [memory], nextCursor: null, prevCursor: null});
    jest.mocked(listLikedQuestions).mockResolvedValue({
      questions: [{...memory.question, liked: true}],
      nextCursor: null,
      prevCursor: null,
    });

    renderWithQueryClient(<MemoriesScreen {...makeProps()} />);
    fireEvent.press(await screen.findByTestId('history-tab-questions'));

    await screen.findByTestId('liked-question-body-q_01');
    expect(screen.queryByTestId('liked-question-like-q_01')).toBeNull();
  });
});
