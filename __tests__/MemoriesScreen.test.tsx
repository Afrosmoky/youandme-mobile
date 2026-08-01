import React from 'react';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {fireEvent, screen, waitFor} from '@testing-library/react-native';
import {renderWithQueryClient} from '../src/test/renderWithQueryClient';
import {MemoriesScreen} from '../src/screens/MemoriesScreen';
import {listMemories} from '../src/api/memories';
import {useAuth} from '../src/auth/AuthContext';
import type {RootStackParamList} from '../src/navigation/types';
import type {Memory} from '../src/domain/types';
import {pl} from '../src/i18n/pl';

jest.mock('../src/api/memories', () => ({listMemories: jest.fn()}));
jest.mock('../src/auth/AuthContext', () => ({useAuth: jest.fn()}));

type Props = NativeStackScreenProps<RootStackParamList, 'Memories'>;

const memory: Memory = {
  ulid: 'm_01',
  question: {
    ulid: 'q_01',
    body: 'Co Cię dziś rozśmieszyło?',
    type: 'session',
    category: {slug: 'na_poznanie', name: 'Na poznanie'},
    tags: [],
    liked: false,
    isLocked: false,
  },
  answerA: 'Świetny żart w pracy.',
  answerB: null,
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
    jest.mocked(useAuth).mockReturnValue({
      user: null,
      couple: null,
      token: 'tok',
      loading: false,
      login: jest.fn(),
      register: jest.fn(),
      signInWithGoogle: jest.fn(),
      logout: jest.fn(),
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
});
