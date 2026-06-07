import React from 'react';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {render, waitFor} from '@testing-library/react-native';
import {BootstrapScreen} from './BootstrapScreen';
import {getActiveSession} from '../api/sessions';
import {useAuth} from '../auth/AuthContext';
import type {RootStackParamList} from '../navigation/types';

jest.mock('../api/sessions', () => ({getActiveSession: jest.fn()}));
jest.mock('../auth/AuthContext', () => ({useAuth: jest.fn()}));

type Props = NativeStackScreenProps<RootStackParamList, 'Bootstrap'>;

const replace = jest.fn();
const refreshUser = jest.fn();

const session = {
  ulid: 's_01',
  mode: 'local',
  category: null,
  startedAt: '2026-06-15T20:14:00Z',
  endedAt: null,
  currentIndex: 3,
  remainingCount: 20,
  cardsDrawnCount: 3,
  cardsSavedCount: 2,
};

function makeProps(): Props {
  return {
    navigation: {replace, navigate: jest.fn(), setOptions: jest.fn()},
    route: {key: 'Bootstrap', name: 'Bootstrap', params: undefined},
  } as unknown as Props;
}

describe('BootstrapScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    refreshUser.mockResolvedValue(undefined);
    jest.mocked(useAuth).mockReturnValue({
      user: null,
      couple: null,
      token: 'tok',
      loading: false,
      login: jest.fn(),
      register: jest.fn(),
      signInWithGoogle: jest.fn(),
      logout: jest.fn(),
      refreshUser,
      setUser: jest.fn(),
      setCouple: jest.fn(),
    });
  });

  test('hydrates the user and resumes an active session', async () => {
    jest.mocked(getActiveSession).mockResolvedValue(session);

    render(<BootstrapScreen {...makeProps()} />);

    await waitFor(() => expect(refreshUser).toHaveBeenCalled());
    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith('Question', {sessionUlid: 's_01'}),
    );
  });

  test('goes to the category picker when there is no active session', async () => {
    jest.mocked(getActiveSession).mockResolvedValue(null);

    render(<BootstrapScreen {...makeProps()} />);

    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith('CategoryPicker'),
    );
  });

  test('falls back to the category picker when the check fails', async () => {
    jest.mocked(getActiveSession).mockRejectedValueOnce(new Error('boom'));

    render(<BootstrapScreen {...makeProps()} />);

    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith('CategoryPicker'),
    );
  });
});
