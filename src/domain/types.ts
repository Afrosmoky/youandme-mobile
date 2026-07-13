import { z } from 'zod';

// Domain types and zod schemas for API responses. The API speaks snake_case;
// we validate the raw shape and map to a camelCase domain type per resource
// (mapRaw* helpers). Date fields stay ISO 8601 strings; screens format them.

// ---------------------------------------------------------------------------
// User
// ---------------------------------------------------------------------------

// Final camelCase shape of a user. The API speaks snake_case; the mapping for
// the multi-word fields (email_verified_at, created_at) lives in mapRawUser.
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

// ---------------------------------------------------------------------------
// Couple (P3 — auto-created at registration, returned by /auth/* and /me)
// ---------------------------------------------------------------------------

export const rawCoupleSchema = z.object({
  ulid: z.string(),
  partner_name_local: z.string().nullable(),
  streak_current: z.number(),
  streak_longest: z.number(),
  daily_push_hour: z.number(),
  relationship_started_on: z.string().nullable(),
  created_at: z.string(),
});

export type Couple = {
  ulid: string;
  partnerNameLocal: string | null;
  streakCurrent: number;
  streakLongest: number;
  dailyPushHour: number;
  relationshipStartedOn: string | null;
  createdAt: string;
};

export function mapRawCouple(raw: z.infer<typeof rawCoupleSchema>): Couple {
  return {
    ulid: raw.ulid,
    partnerNameLocal: raw.partner_name_local,
    streakCurrent: raw.streak_current,
    streakLongest: raw.streak_longest,
    dailyPushHour: raw.daily_push_hour,
    relationshipStartedOn: raw.relationship_started_on,
    createdAt: raw.created_at,
  };
}

// ---------------------------------------------------------------------------
// Auth response (now carries the couple alongside the user + token)
// ---------------------------------------------------------------------------

export type AuthResponse = {
  user: User;
  couple: Couple;
  token: string;
};

// ---------------------------------------------------------------------------
// Category
// ---------------------------------------------------------------------------

export const rawCategorySchema = z.object({
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  tone: z.string().nullable(),
  premium_only: z.boolean(),
  ordering: z.number(),
});

export type Category = {
  slug: string;
  name: string;
  description: string | null;
  tone: string | null;
  premiumOnly: boolean;
  ordering: number;
};

export function mapRawCategory(raw: z.infer<typeof rawCategorySchema>): Category {
  return {
    slug: raw.slug,
    name: raw.name,
    description: raw.description,
    tone: raw.tone,
    premiumOnly: raw.premium_only,
    ordering: raw.ordering,
  };
}

// Lightweight category reference embedded in questions and sessions: slug +
// name only. The full Category (description, tone, premium flag, ordering)
// comes from GET /categories.
export const rawCategoryRefSchema = z.object({
  slug: z.string(),
  name: z.string(),
});
export type CategoryRef = z.infer<typeof rawCategoryRefSchema>;

// ---------------------------------------------------------------------------
// Question (P3 — now embeds a category ref and tags)
// ---------------------------------------------------------------------------

export const rawQuestionSchema = z.object({
  ulid: z.string(),
  body: z.string(),
  type: z.string(),
  category: rawCategoryRefSchema.nullable(),
  tags: z.array(z.string()),
});

export type Question = {
  ulid: string;
  body: string;
  type: string;
  category: CategoryRef | null;
  tags: string[];
};

export function mapRawQuestion(raw: z.infer<typeof rawQuestionSchema>): Question {
  return {
    ulid: raw.ulid,
    body: raw.body,
    type: raw.type,
    category: raw.category,
    tags: raw.tags,
  };
}

// ---------------------------------------------------------------------------
// Game session (P3)
// ---------------------------------------------------------------------------

export const rawGameSessionSchema = z.object({
  ulid: z.string(),
  mode: z.string(),
  category: rawCategoryRefSchema.nullable(),
  started_at: z.string(),
  ended_at: z.string().nullable(),
  current_index: z.number(),
  remaining_count: z.number(),
  cards_drawn_count: z.number(),
  cards_saved_count: z.number(),
});

export type GameSession = {
  ulid: string;
  mode: string;
  category: CategoryRef | null;
  startedAt: string;
  endedAt: string | null;
  currentIndex: number;
  remainingCount: number;
  cardsDrawnCount: number;
  cardsSavedCount: number;
};

export function mapRawGameSession(
  raw: z.infer<typeof rawGameSessionSchema>,
): GameSession {
  return {
    ulid: raw.ulid,
    mode: raw.mode,
    category: raw.category,
    startedAt: raw.started_at,
    endedAt: raw.ended_at,
    currentIndex: raw.current_index,
    remainingCount: raw.remaining_count,
    cardsDrawnCount: raw.cards_drawn_count,
    cardsSavedCount: raw.cards_saved_count,
  };
}

// ---------------------------------------------------------------------------
// Memory (P3 — answer split into answer_a/answer_b + player name snapshots)
// ---------------------------------------------------------------------------

export const rawMemorySchema = z.object({
  ulid: z.string(),
  question: rawQuestionSchema,
  answer_a: z.string(),
  answer_b: z.string().nullable(),
  player_a_name: z.string(),
  player_b_name: z.string().nullable(),
  origin: z.string(),
  answered_at: z.string(),
});

export type Memory = {
  ulid: string;
  question: Question;
  answerA: string;
  answerB: string | null;
  playerAName: string;
  playerBName: string | null;
  origin: string;
  answeredAt: string;
};

export function mapRawMemory(raw: z.infer<typeof rawMemorySchema>): Memory {
  return {
    ulid: raw.ulid,
    question: mapRawQuestion(raw.question),
    answerA: raw.answer_a,
    answerB: raw.answer_b,
    playerAName: raw.player_a_name,
    playerBName: raw.player_b_name,
    origin: raw.origin,
    answeredAt: raw.answered_at,
  };
}

// ---------------------------------------------------------------------------
// Daily card (P4) — the couple's question of the day plus streak state. The
// streak_current is already effective (0 when broken); the front never recounts.
// ---------------------------------------------------------------------------
export const rawDailyCardSchema = z.object({
  question: rawQuestionSchema,
  answered_today: z.boolean(),
  streak_current: z.number(),
  streak_longest: z.number(),
  daily_push_hour: z.number(),
});

export type DailyCard = {
  question: Question;
  answeredToday: boolean;
  streakCurrent: number;
  streakLongest: number;
  dailyPushHour: number;
};

export function mapRawDailyCard(
  raw: z.infer<typeof rawDailyCardSchema>,
): DailyCard {
  return {
    question: mapRawQuestion(raw.question),
    answeredToday: raw.answered_today,
    streakCurrent: raw.streak_current,
    streakLongest: raw.streak_longest,
    dailyPushHour: raw.daily_push_hour,
  };
}
