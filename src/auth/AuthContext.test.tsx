import React from 'react';
import {Text, TouchableOpacity} from 'react-native';
import {fireEvent, render, screen, waitFor} from '@testing-library/react-native';
import {AuthProvider, useAuth} from './AuthContext';
import * as authApi from '../api/auth';
import type {Couple, User} from '../domain/types';

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

function Consumer() {
  const {couple: current, login, logout, setCouple} = useAuth();
  return (
    <>
      <Text testID="couple-ulid">{current ? current.ulid : 'none'}</Text>
      <TouchableOpacity
        testID="do-login"
        onPress={async () => {
          await login({email: 'ola@example.com', password: 'x'});
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
