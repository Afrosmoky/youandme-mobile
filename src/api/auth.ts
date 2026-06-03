import { z } from 'zod';
import { apiClient } from './client';
import { AuthResponse } from '../domain/types';

export type RegisterInput = {
  email: string;
  password: string;
  nickname: string;
};

export type LoginInput = {
  email: string;
  password: string;
};

// Backend serves the user in snake_case. Validate that raw shape, then map the
// multi-word fields to the camelCase User shape (shared by /register, /login
// and the upcoming /me).
const rawAuthResponseSchema = z.object({
  user: z.object({
    ulid: z.string(),
    email: z.string(),
    nickname: z.string(),
    timezone: z.string().nullable(),
    locale: z.string().nullable(),
    email_verified_at: z.string().nullable(),
    created_at: z.string(),
  }),
  token: z.string(),
});

function mapAuthResponse(data: unknown): AuthResponse {
  const raw = rawAuthResponseSchema.parse(data);
  const { email_verified_at, created_at, ...rest } = raw.user;
  return {
    user: { ...rest, emailVerifiedAt: email_verified_at, createdAt: created_at },
    token: raw.token,
  };
}

export async function register(input: RegisterInput): Promise<AuthResponse> {
  const res = await apiClient.post('/auth/register', input);
  return mapAuthResponse(res.data);
}

export async function login(input: LoginInput): Promise<AuthResponse> {
  const res = await apiClient.post('/auth/login', input);
  return mapAuthResponse(res.data);
}

// Optional logout endpoint (first-slice.md 4.6); best-effort, callers ignore
// failures and clear local state regardless.
export async function logout(): Promise<void> {
  await apiClient.post('/auth/logout');
}
