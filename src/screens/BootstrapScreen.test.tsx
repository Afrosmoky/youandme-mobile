import React, {ReactElement} from 'react';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {render, waitFor} from '@testing-library/react-native';
import {ThemeProvider} from '../theme';
import {BootstrapScreen} from './BootstrapScreen';
import {getActiveSession} from '../api/sessions';
import {takePendingMemoryUlid} from '../navigation/navigationRef';
import {useAuth} from '../auth/AuthContext';
import type {RootStackParamList} from '../navigation/types';

jest.mock('../api/sessions', () => ({getActiveSession: jest.fn()}));
jest.mock('../navigation/navigationRef', () => ({
  takePendingMemoryUlid: jest.fn(() => null),
}));
jest.mock('../auth/AuthContext', () => ({useAuth: jest.fn()}));

type Props = NativeStackScreenProps<RootStackParamList, 'Bootstrap'>;

const replace = jest.fn();
const navigate = jest.fn();
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
    navigation: {replace, navigate, setOptions: jest.fn()},
    route: {key: 'Bootstrap', name: 'Bootstrap', params: undefined},
  } as unknown as Props;
}

// BootstrapScreen reads the theme (Logo/GlowBackground), so wrap in a provider.
const renderThemed = (ui: ReactElement) =>
  render(<ThemeProvider>{ui}</ThemeProvider>);

describe('BootstrapScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // clearAllMocks wipes calls, not implementations — without this the
    // pending ulid set by one test leaks into the next.
    jest.mocked(takePendingMemoryUlid).mockReturnValue(null);
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

    renderThemed(<BootstrapScreen {...makeProps()} />);

    await waitFor(() => expect(refreshUser).toHaveBeenCalled());
    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith('Question', {sessionUlid: 's_01'}),
    );
  });

  test('goes to the home hub when there is no active session', async () => {
    jest.mocked(getActiveSession).mockResolvedValue(null);

    renderThemed(<BootstrapScreen {...makeProps()} />);

    await waitFor(() => expect(replace).toHaveBeenCalledWith('Home'));
  });

  test('falls back to the home hub when the check fails', async () => {
    jest.mocked(getActiveSession).mockRejectedValueOnce(new Error('boom'));

    renderThemed(<BootstrapScreen {...makeProps()} />);

    await waitFor(() => expect(replace).toHaveBeenCalledWith('Home'));
  });

  // A notification pressed before this stack existed (cold start): the memory
  // opens ON TOP of wherever Bootstrap was going, so the couple still has a hub
  // to come back to.
  test('opens a memory a push asked for, over the hub', async () => {
    jest.mocked(getActiveSession).mockResolvedValue(null);
    jest.mocked(takePendingMemoryUlid).mockReturnValue('m_01');

    renderThemed(<BootstrapScreen {...makeProps()} />);

    await waitFor(() => expect(replace).toHaveBeenCalledWith('Home'));
    expect(navigate).toHaveBeenCalledWith('MemoryCard', {memoryUlid: 'm_01'});
  });

  // The unfinished session still gets resumed underneath — the push decides the
  // top of the stack, not the whole of it.
  test('opens it over a resumed session too', async () => {
    jest.mocked(getActiveSession).mockResolvedValue(session);
    jest.mocked(takePendingMemoryUlid).mockReturnValue('m_01');

    renderThemed(<BootstrapScreen {...makeProps()} />);

    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith('Question', {sessionUlid: 's_01'}),
    );
    expect(navigate).toHaveBeenCalledWith('MemoryCard', {memoryUlid: 'm_01'});
  });

  test('opens it even when the session check fails', async () => {
    jest.mocked(getActiveSession).mockRejectedValueOnce(new Error('boom'));
    jest.mocked(takePendingMemoryUlid).mockReturnValue('m_01');

    renderThemed(<BootstrapScreen {...makeProps()} />);

    await waitFor(() => expect(replace).toHaveBeenCalledWith('Home'));
    expect(navigate).toHaveBeenCalledWith('MemoryCard', {memoryUlid: 'm_01'});
  });

  test('navigates nowhere extra when no push is waiting', async () => {
    jest.mocked(getActiveSession).mockResolvedValue(null);

    renderThemed(<BootstrapScreen {...makeProps()} />);

    await waitFor(() => expect(replace).toHaveBeenCalledWith('Home'));
    expect(navigate).not.toHaveBeenCalled();
  });
});
