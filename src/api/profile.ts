import { z } from 'zod';
import { apiClient } from './client';
import {
  rawUserSchema,
  mapRawUser,
  rawCoupleSchema,
  mapRawCouple,
  User,
  Couple,
} from '../domain/types';

// P3: both /me and PATCH /me wrap user + couple, snake_case like /auth/*.
const meResponseSchema = z.object({
  user: rawUserSchema,
  couple: rawCoupleSchema,
});

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
  // P3: couple's local-only partner name, edited from the profile screen.
  // Null clears it back to "no partner name".
  partner_name_local?: string | null;
};

export type MeResult = {
  user: User;
  couple: Couple;
};

function mapMeResponse(data: unknown): MeResult {
  const parsed = meResponseSchema.parse(data);
  return { user: mapRawUser(parsed.user), couple: mapRawCouple(parsed.couple) };
}

export async function fetchMe(): Promise<MeResult> {
  const res = await apiClient.get('/me');
  return mapMeResponse(res.data);
}

export async function updateMe(input: UpdateMeInput): Promise<MeResult> {
  const res = await apiClient.patch('/me', input);
  return mapMeResponse(res.data);
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
