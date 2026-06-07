import type { AxiosResponse } from 'axios';
import { register, login, signInWithGoogle } from './auth';
import { apiClient } from './client';

jest.mock('./client', () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), patch: jest.fn() },
}));

const res = (data: unknown): AxiosResponse =>
  ({ data } as unknown as AxiosResponse);

const rawUser = {
  ulid: 'u_01',
  email: 'ola@example.com',
  nickname: 'ola_test',
  timezone: 'Europe/Warsaw',
  locale: 'pl',
  email_verified_at: null,
  created_at: '2026-06-04T05:00:00Z',
};

const rawCouple = {
  ulid: 'c_01',
  partner_name_local: 'Tomek',
  streak_current: 0,
  streak_longest: 0,
  daily_push_hour: 20,
  relationship_started_on: null,
  created_at: '2026-06-04T05:00:00Z',
};

const authBody = { user: rawUser, couple: rawCouple, token: 'tok_123' };

describe('auth API', () => {
  beforeEach(() => jest.clearAllMocks());

  test('register maps user, couple and token', async () => {
    jest.mocked(apiClient.post).mockResolvedValue(res(authBody));

    const result = await register({
      email: 'ola@example.com',
      password: 'tajne-haslo-123',
      nickname: 'ola_test',
    });

    expect(apiClient.post).toHaveBeenCalledWith('/auth/register', {
      email: 'ola@example.com',
      password: 'tajne-haslo-123',
      nickname: 'ola_test',
    });
    expect(result.user.nickname).toBe('ola_test');
    expect(result.couple).toEqual({
      ulid: 'c_01',
      partnerNameLocal: 'Tomek',
      streakCurrent: 0,
      streakLongest: 0,
      dailyPushHour: 20,
      relationshipStartedOn: null,
      createdAt: '2026-06-04T05:00:00Z',
    });
    expect(result.token).toBe('tok_123');
  });

  test('login maps the couple alongside the user', async () => {
    jest.mocked(apiClient.post).mockResolvedValue(res(authBody));

    const result = await login({
      email: 'ola@example.com',
      password: 'tajne-haslo-123',
    });

    expect(apiClient.post).toHaveBeenCalledWith('/auth/login', {
      email: 'ola@example.com',
      password: 'tajne-haslo-123',
    });
    expect(result.couple.partnerNameLocal).toBe('Tomek');
  });

  test('signInWithGoogle posts the id_token and maps the couple', async () => {
    jest.mocked(apiClient.post).mockResolvedValue(res(authBody));

    const result = await signInWithGoogle('google-id-token');

    expect(apiClient.post).toHaveBeenCalledWith('/auth/google', {
      id_token: 'google-id-token',
    });
    expect(result.couple.ulid).toBe('c_01');
  });
});
