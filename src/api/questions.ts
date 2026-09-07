import { z } from 'zod';
import { apiClient } from './client';
import {
  rawQuestionSchema,
  mapRawQuestion,
  rawGameSessionSchema,
  mapRawGameSession,
  Question,
  GameSession,
} from '../domain/types';

// P3: /questions/next requires an active session. `question` is null and
// `session_complete` is true once the session's pool is exhausted; `session`
// carries the up-to-date counters.
const nextResponseSchema = z.object({
  question: rawQuestionSchema.nullable(),
  session: rawGameSessionSchema.optional(),
  session_complete: z.boolean().optional(),
});

export type NextQuestionResult = {
  question: Question | null;
  session: GameSession | null;
  sessionComplete: boolean;
};

export async function fetchNextQuestion(): Promise<NextQuestionResult> {
  const res = await apiClient.get('/questions/next');
  const parsed = nextResponseSchema.parse(res.data);
  return {
    question: parsed.question ? mapRawQuestion(parsed.question) : null,
    session: parsed.session ? mapRawGameSession(parsed.session) : null,
    sessionComplete: parsed.session_complete ?? false,
  };
}

// 3B: GET /questions/liked — the cards this couple hearted, newest heart first.
// Cursor-paginated on the same contract as GET /memories (data + meta, per_page
// capped at 50 server-side), and served with the same card builder as
// /questions/next, so rawQuestionSchema covers it as-is.
//
// What this list does NOT contain is the part worth knowing: the backend drops
// hearted cards from the closed deck that this couple has not unlocked, and it
// does so BEFORE paging, so pages stay whole. Everything that arrives here is
// therefore openable, and `is_locked` means what it means in play — "a paid card
// you own" — not "hidden from you". There is no locked state to render.
const listLikedResponseSchema = z.object({
  data: z.array(rawQuestionSchema),
  meta: z.object({
    next_cursor: z.string().nullable(),
    prev_cursor: z.string().nullable(),
    per_page: z.number(),
  }),
});

// Same default as the memories list, and the same reason: the backend caps at
// 50, and a page is a screenful, not a download.
const DEFAULT_PER_PAGE = 20;

export type LikedQuestionsPage = {
  questions: Question[];
  nextCursor: string | null;
  prevCursor: string | null;
};

export async function listLikedQuestions(
  cursor?: string,
): Promise<LikedQuestionsPage> {
  const res = await apiClient.get('/questions/liked', {
    params: { cursor, per_page: DEFAULT_PER_PAGE },
  });
  const parsed = listLikedResponseSchema.parse(res.data);
  return {
    questions: parsed.data.map(mapRawQuestion),
    nextCursor: parsed.meta.next_cursor,
    prevCursor: parsed.meta.prev_cursor,
  };
}
