import { z } from 'zod';
import { apiClient } from './client';
import {
  AuthResponse,
  rawUserSchema,
  mapRawUser,
  rawCoupleSchema,
  mapRawCouple,
} from '../domain/types';

export type RegisterInput = {
  email: string;
  password: string;
  nickname: string;
};

export type LoginInput = {
  email: string;
  password: string;
};

// Backend serves user + couple in snake_case (P3 auto-creates the couple at
// registration); validate the raw shape, then map both to camelCase.
const rawAuthResponseSchema = z.object({
  user: rawUserSchema,
  couple: rawCoupleSchema,
  token: z.string(),
});

function mapAuthResponse(data: unknown): AuthResponse {
  const raw = rawAuthResponseSchema.parse(data);
  return {
    user: mapRawUser(raw.user),
    couple: mapRawCouple(raw.couple),
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

// Exchanges a Google ID token for a Sanctum session. Same response shape as
// login/register; a bad token answers 401 with { message }.
export async function signInWithGoogle(
  idToken: string,
): Promise<AuthResponse> {
  const res = await apiClient.post('/auth/google', { id_token: idToken });
  return mapAuthResponse(res.data);
}

// Optional logout endpoint (first-slice.md 4.6); best-effort, callers ignore
// failures and clear local state regardless.
export async function logout(): Promise<void> {
  await apiClient.post('/auth/logout');
}
