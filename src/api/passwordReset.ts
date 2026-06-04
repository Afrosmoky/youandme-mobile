import { z } from 'zod';
import { apiClient } from './client';

// Backend returns { status: "..." } (Laravel password broker convention), not
// { message: ... }. We surface it to callers as `message`.
const forgotResponseSchema = z.object({ status: z.string() });

export async function requestPasswordReset(
  email: string,
): Promise<{ message: string }> {
  const res = await apiClient.post('/auth/password/forgot', { email });
  return { message: forgotResponseSchema.parse(res.data).status };
}

// Same { status: "..." } convention as /forgot. A bad or used token answers
// 422 with { message, errors } — the caller catches and surfaces it.
const resetResponseSchema = z.object({ status: z.string() });

export type ResetPasswordInput = {
  token: string;
  email: string;
  password: string;
  passwordConfirmation: string;
};

export async function resetPassword(
  input: ResetPasswordInput,
): Promise<{ message: string }> {
  const res = await apiClient.post('/auth/password/reset', {
    token: input.token,
    email: input.email,
    password: input.password,
    password_confirmation: input.passwordConfirmation,
  });
  return { message: resetResponseSchema.parse(res.data).status };
}
