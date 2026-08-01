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
  // P5 Slice 1b: whether this couple liked the question. Optional with a false
  // default because questions embedded in memories (rawMemorySchema) never carry
  // it — without the default those payloads would fail to parse.
  liked: z.boolean().optional().default(false),
  // P7: the question comes from the closed deck and this couple unlocked it.
  // Optional for the same reason as `liked`, and it matters more here: this
  // schema is shared by memories and the daily card, and the backend only sends
  // is_locked on /questions/next. A required field would break both.
  is_locked: z.boolean().optional().default(false),
});

export type Question = {
  ulid: string;
  body: string;
  type: string;
  category: CategoryRef | null;
  tags: string[];
  liked: boolean;
  isLocked: boolean;
};

export function mapRawQuestion(raw: z.infer<typeof rawQuestionSchema>): Question {
  return {
    ulid: raw.ulid,
    body: raw.body,
    type: raw.type,
    category: raw.category,
    tags: raw.tags,
    liked: raw.liked,
    isLocked: raw.is_locked,
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
  // P5 Slice 1b: for /daily-card the backend puts `liked` at the top level
  // (Game appends it beside the question, not inside it), unlike /questions/next
  // where it sits on the question. mapRawDailyCard folds it back into
  // question.liked so both screens read it uniformly.
  liked: z.boolean(),
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
    // Fold the top-level `liked` into the question so the screen reads
    // question.liked exactly as it does on QuestionScreen.
    question: { ...mapRawQuestion(raw.question), liked: raw.liked },
    answeredToday: raw.answered_today,
    streakCurrent: raw.streak_current,
    streakLongest: raw.streak_longest,
    dailyPushHour: raw.daily_push_hour,
  };
}

// ---------------------------------------------------------------------------
// Weekly ritual (P4) — the couple's ritual of the week plus a day counter. Light
// version: no completion status, no weekly streak. day_of_week (1–7) is computed
// backend-side in the couple's timezone; the front never recounts it.
// ---------------------------------------------------------------------------
export const rawWeeklyRitualSchema = z.object({
  ritual: z.object({
    ulid: z.string(),
    title: z.string(),
    body: z.string(),
  }),
  started_on: z.string(),
  day_of_week: z.number(),
});

export type WeeklyRitual = {
  ritual: { ulid: string; title: string; body: string };
  startedOn: string;
  dayOfWeek: number;
};

export function mapRawWeeklyRitual(
  raw: z.infer<typeof rawWeeklyRitualSchema>,
): WeeklyRitual {
  return {
    ritual: {
      ulid: raw.ritual.ulid,
      title: raw.ritual.title,
      body: raw.ritual.body,
    },
    startedOn: raw.started_on,
    dayOfWeek: raw.day_of_week,
  };
}

// The P6 ad-reward response shape used to live here. It described what the
// client got back when it granted itself credits; P7 moved the grant to the SSV
// webhook, so there is no such response to model any more. What the ad costs and
// how many are left today now reads off GET /rewards (`Rewards.ads`).

// ---------------------------------------------------------------------------
// Deck (P7) — the closed deck and what this couple has unlocked
// ---------------------------------------------------------------------------

// A card in the deck listing. Deliberately WITHOUT `body`: a locked question
// must not leak its text before it is paid for, so the backend omits it for
// every card here. The text arrives only through /questions/next once the card
// is unlocked and drawn into a session.
export const rawDeckCardSchema = z.object({
  ulid: z.string(),
  category: rawCategoryRefSchema.nullable(),
  unlocked: z.boolean(),
});

export type DeckCard = {
  ulid: string;
  category: CategoryRef | null;
  unlocked: boolean;
};

export const rawDeckSchema = z.object({
  locked_total: z.number(),
  unlocked_count: z.number(),
  // Whole deck unlocked. Drives hiding the earning actions (P7 §8: with a full
  // deck there is nothing left to spend credits on).
  complete: z.boolean(),
  cards: z.array(rawDeckCardSchema),
});

export type Deck = {
  lockedTotal: number;
  unlockedCount: number;
  complete: boolean;
  cards: DeckCard[];
};

export function mapRawDeck(raw: z.infer<typeof rawDeckSchema>): Deck {
  return {
    lockedTotal: raw.locked_total,
    unlockedCount: raw.unlocked_count,
    complete: raw.complete,
    cards: raw.cards.map(card => ({
      ulid: card.ulid,
      category: card.category,
      unlocked: card.unlocked,
    })),
  };
}

// ---------------------------------------------------------------------------
// Rewards (P7) — the credit balance, visible to the user for the first time
// ---------------------------------------------------------------------------
export const rawRewardsSchema = z.object({
  credits: z.number(),
  share_reward_claimed: z.boolean(),
  rating_reward_claimed: z.boolean(),
  ads: z.object({
    remaining_today: z.number(),
    daily_cap: z.number(),
  }),
});

export type Rewards = {
  credits: number;
  // P7 exposes these for the first time, but the share and rating buttons stay
  // visible regardless: share keeps its viral value after the reward is taken,
  // and the claimed-state styling waits for the style guide (#36).
  shareRewardClaimed: boolean;
  ratingRewardClaimed: boolean;
  ads: {
    remainingToday: number;
    dailyCap: number;
  };
};

export function mapRawRewards(raw: z.infer<typeof rawRewardsSchema>): Rewards {
  return {
    credits: raw.credits,
    shareRewardClaimed: raw.share_reward_claimed,
    ratingRewardClaimed: raw.rating_reward_claimed,
    ads: {
      remainingToday: raw.ads.remaining_today,
      dailyCap: raw.ads.daily_cap,
    },
  };
}

// Unlocking returns fresh balance AND fresh deck in one response, so the client
// can write both caches without a follow-up read (P7 mobile, decision 3).
export const rawUnlockResultSchema = z.object({
  credits: z.number(),
  deck: rawDeckSchema,
});

export type UnlockResult = {
  credits: number;
  deck: Deck;
};

export function mapRawUnlockResult(
  raw: z.infer<typeof rawUnlockResultSchema>,
): UnlockResult {
  return {
    credits: raw.credits,
    deck: mapRawDeck(raw.deck),
  };
}

// ---------------------------------------------------------------------------
// Progress map (P8)
// ---------------------------------------------------------------------------

// A milestone on the couple's journey. `name` is always present, including for
// locked ones: the map shows what is still ahead, so the copy is never hidden.
export const rawMilestoneSchema = z.object({
  slug: z.string(),
  name: z.string(),
  threshold: z.number(),
  ordering: z.number(),
  unlocked: z.boolean(),
  unlocked_at: z.string().nullable(),
});

export type Milestone = {
  slug: string;
  name: string;
  threshold: number;
  ordering: number;
  unlocked: boolean;
  unlockedAt: string | null;
};

export const rawProgressSchema = z.object({
  total_played: z.number(),
  // Lowest threshold above the counter — null once every milestone is unlocked.
  // Note this looks FORWARD rather than meaning "first not unlocked": the
  // backend defines it as min(threshold > total), which is what "N cards to go"
  // needs and what stays correct if `ordering` and `threshold` ever disagree.
  next_threshold: z.number().nullable(),
  milestones: z.array(rawMilestoneSchema),
});

export type Progress = {
  totalPlayed: number;
  nextThreshold: number | null;
  milestones: Milestone[];
};

export function mapRawProgress(
  raw: z.infer<typeof rawProgressSchema>,
): Progress {
  return {
    totalPlayed: raw.total_played,
    nextThreshold: raw.next_threshold,
    milestones: raw.milestones.map(milestone => ({
      slug: milestone.slug,
      name: milestone.name,
      threshold: milestone.threshold,
      ordering: milestone.ordering,
      unlocked: milestone.unlocked,
      unlockedAt: milestone.unlocked_at,
    })),
  };
}
