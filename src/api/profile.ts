import { z } from 'zod';
import { apiClient } from './client';
import { rawUserSchema, mapRawUser, User } from '../domain/types';

// Both /me and PATCH /me wrap the user under `user`, snake_case like /auth/*.
const meResponseSchema = z.object({ user: rawUserSchema });

const verificationStatusSchema = z.object({
  verified: z.boolean(),
  days_since_registration: z.number(),
});

export type VerificationStatus = {
  verified: boolean;
  daysSinceRegistration: number;
};

export type UpdateMeInput = {
  nickname?: string;
  timezone?: string;
  locale?: string;
};

export async function fetchMe(): Promise<User> {
  const res = await apiClient.get('/me');
  return mapRawUser(meResponseSchema.parse(res.data).user);
}

export async function updateMe(input: UpdateMeInput): Promise<User> {
  const res = await apiClient.patch('/me', input);
  return mapRawUser(meResponseSchema.parse(res.data).user);
}

// Triggers a fresh verification email. Backend answers 202 with no body.
export async function resendVerificationEmail(): Promise<void> {
  await apiClient.post('/auth/email/verify-notification');
}

export async function fetchVerificationStatus(): Promise<VerificationStatus> {
  const res = await apiClient.get('/me/verification-status');
  const parsed = verificationStatusSchema.parse(res.data);
  return {
    verified: parsed.verified,
    daysSinceRegistration: parsed.days_since_registration,
  };
}
