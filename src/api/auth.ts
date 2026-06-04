import { z } from 'zod';
import { apiClient } from './client';
import { AuthResponse, rawUserSchema, mapRawUser } from '../domain/types';

export type RegisterInput = {
  email: string;
  password: string;
  nickname: string;
};

export type LoginInput = {
  email: string;
  password: string;
};

// Backend serves the user in snake_case; validate the raw shape, then map to
// the camelCase User (shared raw schema lives in domain/types).
const rawAuthResponseSchema = z.object({
  user: rawUserSchema,
  token: z.string(),
});

function mapAuthResponse(data: unknown): AuthResponse {
  const raw = rawAuthResponseSchema.parse(data);
  return { user: mapRawUser(raw.user), token: raw.token };
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
