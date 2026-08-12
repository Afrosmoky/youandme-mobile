import React from 'react';
import {Text, TouchableOpacity} from 'react-native';
import {fireEvent, render, screen, waitFor} from '@testing-library/react-native';
import {AuthProvider, useAuth} from './AuthContext';
import * as authApi from '../api/auth';
import {
  loadLocalGameState,
  saveLocalGameState,
} from '../storage/localGameState';
import {clearDeviceLocalGameData} from '../storage/deviceLocal';
import {startLocalGame} from '../domain/localGame';
import {CHALLENGES} from '../domain/challenges';
import type {Couple, Question, User} from '../domain/types';

jest.mock('../api/auth');
jest.mock('../api/profile', () => ({fetchMe: jest.fn()}));

const user: User = {
  ulid: 'u_01',
  email: 'ola@example.com',
  nickname: 'ola_test',
  timezone: 'Europe/Warsaw',
  locale: 'pl',
  emailVerifiedAt: null,
  createdAt: '2026-06-04T05:00:00.000Z',
};

const couple: Couple = {
  ulid: 'c_01',
  partnerNameLocal: 'Tomek',
  streakCurrent: 0,
  streakLongest: 0,
  dailyPushHour: 20,
  relationshipStartedOn: null,
  createdAt: '2026-06-04T05:00:00.000Z',
};

const otherCouple: Couple = {...couple, ulid: 'c_99'};

const otherUser: User = {...user, ulid: 'u_99', nickname: 'tomek_test'};

const question = (n: number): Question => ({
  ulid: `Q${n}`,
  body: `Pytanie ${n}?`,
  type: 'session',
  category: {slug: 'randka', name: 'Randka'},
  tags: ['bliskosc'],
  options: null,
  liked: false,
  isLocked: false,
});

// A paused local game with the other player's name and a typed answer on it.
const pausedGame = () =>
  startLocalGame({
    player1: 'Piotr',
    player2: 'Wiktoria',
    categorySlug: 'randka',
    questions: [question(1), question(2)],
    challenges: CHALLENGES,
    interval: 2,
    startedAt: '2026-08-05T18:00:00.000Z',
  });

function Consumer() {
  const {couple: current, login, logout, setCouple} = useAuth();
  // Signing in twice as the same account leaves the rendered couple unchanged,
  // so the tests below need something that moves on every completed login to
  // wait on — otherwise waitFor returns before the second one has run.
  const [logins, setLogins] = React.useState(0);
  return (
    <>
      <Text testID="couple-ulid">{current ? current.ulid : 'none'}</Text>
      <Text testID="login-count">{String(logins)}</Text>
      <TouchableOpacity
        testID="do-login"
        onPress={async () => {
          await login({email: 'ola@example.com', password: 'x'});
          setLogins(n => n + 1);
        }}>
        <Text>login</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID="do-setcouple"
        onPress={() => setCouple(otherCouple)}>
        <Text>setcouple</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID="do-logout"
        onPress={async () => {
          await logout();
        }}>
        <Text>logout</Text>
      </TouchableOpacity>
    </>
  );
}

describe('AuthContext couple state', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(authApi.login).mockResolvedValue({user, couple, token: 'tok'});
    jest.mocked(authApi.logout).mockResolvedValue(undefined);
  });

  test('login stores the couple in state', async () => {
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );
    expect(screen.getByTestId('couple-ulid')).toHaveTextContent('none');

    fireEvent.press(screen.getByTestId('do-login'));

    await waitFor(() =>
      expect(screen.getByTestId('couple-ulid')).toHaveTextContent('c_01'),
    );
  });

  test('setCouple replaces the cached couple', async () => {
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );

    fireEvent.press(screen.getByTestId('do-setcouple'));

    await waitFor(() =>
      expect(screen.getByTestId('couple-ulid')).toHaveTextContent('c_99'),
    );
  });

  test('logout clears the couple', async () => {
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );

    fireEvent.press(screen.getByTestId('do-login'));
    await waitFor(() =>
      expect(screen.getByTestId('couple-ulid')).toHaveTextContent('c_01'),
    );

    fireEvent.press(screen.getByTestId('do-logout'));
    await waitFor(() =>
      expect(screen.getByTestId('couple-ulid')).toHaveTextContent('none'),
    );
  });
});

// The local game is stored on the device and knows nothing about accounts, so
// without this it survives a sign-out: the next account on the phone is offered
// a resume card carrying the previous couple's names and answers.
describe('device-local game data across accounts', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    jest.mocked(authApi.login).mockResolvedValue({user, couple, token: 'tok'});
    jest.mocked(authApi.logout).mockResolvedValue(undefined);
    // The mock store lives for the module registry's lifetime, not the test's.
    await clearDeviceLocalGameData();
  });

  const mount = () =>
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );

  const signIn = async (as: User) => {
    jest
      .mocked(authApi.login)
      .mockResolvedValue({user: as, couple, token: 'tok'});
    const before = Number(screen.getByTestId('login-count').props.children);
    fireEvent.press(screen.getByTestId('do-login'));
    await waitFor(() =>
      expect(screen.getByTestId('login-count')).toHaveTextContent(
        String(before + 1),
      ),
    );
  };

  test('logout clears the paused game', async () => {
    mount();
    await signIn(user);
    await saveLocalGameState(pausedGame());

    fireEvent.press(screen.getByTestId('do-logout'));
    await waitFor(() =>
      expect(screen.getByTestId('couple-ulid')).toHaveTextContent('none'),
    );

    expect(await loadLocalGameState()).toBeNull();
  });

  // The second barrier: a game that outlived a sign-out (killed app, failing
  // store) still must not reach the next account.
  test('a game left by another account is cleared when someone else signs in', async () => {
    mount();
    await signIn(user);
    await saveLocalGameState(pausedGame());

    await signIn(otherUser);

    expect(await loadLocalGameState()).toBeNull();
  });

  test('the same account signing back in keeps its paused game', async () => {
    mount();
    await signIn(user);
    await saveLocalGameState(pausedGame());

    await signIn(user);

    expect((await loadLocalGameState())?.player2).toBe('Wiktoria');
  });
});
