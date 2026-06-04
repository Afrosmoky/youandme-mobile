import { z } from 'zod';

// Domain types and zod schemas for API responses. The API speaks snake_case;
// we validate the raw shape and transform date fields to camelCase for the app.

// Final camelCase shape of a user. The API speaks snake_case; the mapping for
// the multi-word fields (email_verified_at, created_at) lives in src/api/auth.ts.
export const userSchema = z.object({
  ulid: z.string(),
  email: z.string(),
  nickname: z.string(),
  // Backend leaves these null until the user sets them (e.g. just after
  // register), so they must accept null, not only string.
  timezone: z.string().nullable(),
  locale: z.string().nullable(),
  // null while the user has not confirmed their email (P2 backend).
  emailVerifiedAt: z.string().nullable(),
  createdAt: z.string(),
});
export type User = z.infer<typeof userSchema>;

// Raw snake_case user as served by the API (/auth/*, /me, PATCH /me). Validate
// this shape, then map to the camelCase `User` with mapRawUser.
export const rawUserSchema = z.object({
  ulid: z.string(),
  email: z.string(),
  nickname: z.string(),
  timezone: z.string().nullable(),
  locale: z.string().nullable(),
  email_verified_at: z.string().nullable(),
  created_at: z.string(),
});

export function mapRawUser(raw: z.infer<typeof rawUserSchema>): User {
  const { email_verified_at, created_at, ...rest } = raw;
  return { ...rest, emailVerifiedAt: email_verified_at, createdAt: created_at };
}

export const authResponseSchema = z.object({
  user: userSchema,
  token: z.string(),
});
export type AuthResponse = z.infer<typeof authResponseSchema>;

export const questionSchema = z.object({
  ulid: z.string(),
  body: z.string(),
  type: z.string(),
});
export type Question = z.infer<typeof questionSchema>;

const questionRefSchema = z.object({
  ulid: z.string(),
  body: z.string(),
});

export const memorySchema = z
  .object({
    ulid: z.string(),
    question: questionRefSchema,
    answer: z.string(),
    answered_at: z.string(),
    created_at: z.string().optional(),
  })
  .transform(raw => ({
    ulid: raw.ulid,
    question: raw.question,
    answer: raw.answer,
    answeredAt: raw.answered_at,
    createdAt: raw.created_at,
  }));
export type Memory = z.infer<typeof memorySchema>;
