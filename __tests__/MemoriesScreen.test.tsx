import React from 'react';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
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
  question: {ulid: 'q_01', body: 'Co Cię dziś rozśmieszyło?'},
  answer: 'Świetny żart w pracy.',
  answeredAt: '2026-06-02T10:00:00.000Z',
  createdAt: undefined,
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
      token: 'tok',
      loading: false,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
    });
  });

  test('renders a card for each memory from the API', async () => {
    jest.mocked(listMemories).mockResolvedValue([memory]);

    render(<MemoriesScreen {...makeProps()} />);

    expect(await screen.findByText(memory.answer)).toBeOnTheScreen();
    expect(screen.getByText(memory.question.body)).toBeOnTheScreen();
  });

  test('shows the empty state when there are no memories', async () => {
    jest.mocked(listMemories).mockResolvedValue([]);

    render(<MemoriesScreen {...makeProps()} />);

    expect(await screen.findByText(pl.memories.empty)).toBeOnTheScreen();
  });

  test('pull-to-refresh refetches the list', async () => {
    jest.mocked(listMemories).mockResolvedValue([memory]);

    render(<MemoriesScreen {...makeProps()} />);
    await screen.findByText(memory.answer);
    expect(listMemories).toHaveBeenCalledTimes(1);

    fireEvent(screen.getByTestId('memories-list'), 'refresh');

    await waitFor(() => expect(listMemories).toHaveBeenCalledTimes(2));
  });
});
