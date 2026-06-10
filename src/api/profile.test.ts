import type { AxiosResponse } from 'axios';
import { changePassword, fetchMe, updateMe } from './profile';
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
  streak_current: 3,
  streak_longest: 5,
  daily_push_hour: 20,
  relationship_started_on: '2026-01-01',
  created_at: '2026-06-04T05:00:00Z',
};

describe('profile API', () => {
  beforeEach(() => jest.clearAllMocks());

  test('fetchMe maps user and couple', async () => {
    jest
      .mocked(apiClient.get)
      .mockResolvedValue(res({ user: rawUser, couple: rawCouple }));

    const result = await fetchMe();

    expect(apiClient.get).toHaveBeenCalledWith('/me');
    expect(result.user.nickname).toBe('ola_test');
    expect(result.couple.streakLongest).toBe(5);
    expect(result.couple.relationshipStartedOn).toBe('2026-01-01');
  });

  test('updateMe sends partner_name_local and maps the response', async () => {
    jest.mocked(apiClient.patch).mockResolvedValue(
      res({
        user: rawUser,
        couple: { ...rawCouple, partner_name_local: 'Tomasz' },
      }),
    );

    const result = await updateMe({ partner_name_local: 'Tomasz' });

    expect(apiClient.patch).toHaveBeenCalledWith('/me', {
      partner_name_local: 'Tomasz',
    });
    expect(result.couple.partnerNameLocal).toBe('Tomasz');
  });

  test('changePassword posts snake_case credentials', async () => {
    jest
      .mocked(apiClient.post)
      .mockResolvedValue(res({ message: 'Password changed.' }));

    await changePassword({
      currentPassword: 'oldpass1',
      newPassword: 'newpass12',
    });

    expect(apiClient.post).toHaveBeenCalledWith('/me/change-password', {
      current_password: 'oldpass1',
      new_password: 'newpass12',
    });
  });
});
