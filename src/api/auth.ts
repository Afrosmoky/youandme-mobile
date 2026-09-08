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
  // P5: optional referrer's nickname. When present it must resolve to an
  // existing user (and not the registrant) server-side, else a 422 on
  // referrer_nickname. Omitted entirely when empty — see register().
  referrerNickname?: string;
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
  // Explicit camel→snake body. referrer_nickname is added only when non-empty:
  // the referral is optional, and sending "" would make the backend treat it as
  // a present-but-invalid referrer rather than "no referral".
  const body: Record<string, string> = {
    email: input.email,
    password: input.password,
    nickname: input.nickname,
  };
  if (input.referrerNickname) {
    body.referrer_nickname = input.referrerNickname;
  }
  const res = await apiClient.post('/auth/register', body);
  return mapAuthResponse(res.data);
}

export async function login(input: LoginInput): Promise<AuthResponse> {
  const res = await apiClient.post('/auth/login', input);
  return mapAuthResponse(res.data);
}

/**
 * A social sign-in, plus the one thing its status code says that its body does
 * not: whether the account was created just now.
 *
 * The backend answers 201 for a brand-new account and 200 for one it found —
 * either by the provider's `sub` or, failing that, by the email address, which
 * is what lets somebody who registered by email sign in with Google onto their
 * own account. Until now the client threw that distinction away.
 *
 * It matters because of the case that cannot be detected any other way: a couple
 * who signs in with an address the account was NOT registered under gets a new,
 * empty account rather than theirs, silently. Apple's "Hide My Email" produces
 * exactly that (the relay address matches nothing), and so does picking the
 * wrong Google account. A brand-new account is also empty, so nothing about the
 * account itself can tell the two apart — only the address can, said out loud.
 */
export type SocialAuthResult = {
  auth: AuthResponse;
  isNewAccount: boolean;
};

// Exchanges a Google ID token for a Sanctum session. Same response shape as
// login/register; a bad token answers 401 with { message }.
export async function signInWithGoogle(
  idToken: string,
): Promise<SocialAuthResult> {
  const res = await apiClient.post('/auth/google', { id_token: idToken });
  return { auth: mapAuthResponse(res.data), isNewAccount: res.status === 201 };
}

// The same exchange for Apple. The backend verifies both tokens through the
// provider's JWKS and resolves the account identically, so the only thing that
// differs here is the path.
export async function signInWithApple(
  idToken: string,
): Promise<SocialAuthResult> {
  const res = await apiClient.post('/auth/apple', { id_token: idToken });
  return { auth: mapAuthResponse(res.data), isNewAccount: res.status === 201 };
}

// Optional logout endpoint (first-slice.md 4.6); best-effort, callers ignore
// failures and clear local state regardless.
export async function logout(): Promise<void> {
  await apiClient.post('/auth/logout');
}
